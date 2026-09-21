const DueDate = require("../models/DueDate");
const { DUE_CATEGORIES } = require("../models/DueDate");

const pad2 = (n) => String(n).padStart(2, "0");

const todayLocalStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const parseYmd = (ymd) => {
  const [y, m, d] = String(ymd).split("-").map(Number);
  return new Date(y, m - 1, d);
};

const formatYmd = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const daysBetween = (fromYmd, toYmd) => {
  const a = parseYmd(fromYmd);
  const b = parseYmd(toYmd);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
};

/** Last valid day in month for a requested dayOfMonth (handles 31 in Feb etc.) */
const clampDayInMonth = (year, monthIndex0, dayOfMonth) => {
  const last = new Date(year, monthIndex0 + 1, 0).getDate();
  return Math.min(Math.max(1, dayOfMonth), last);
};

/**
 * Next due occurrence on/after today.
 * - none: the stored dueDate (may be past)
 * - monthly: same day-of-month every month from today onward
 */
const computeNextDue = (doc, today = todayLocalStr()) => {
  if (doc.recurrence !== "monthly") {
    return doc.dueDate;
  }

  const day = Number(doc.dayOfMonth) || Number(String(doc.dueDate).slice(8, 10)) || 1;
  const t = parseYmd(today);
  let y = t.getFullYear();
  let m = t.getMonth(); // 0-based

  for (let i = 0; i < 14; i++) {
    const useDay = clampDayInMonth(y, m, day);
    const candidate = `${y}-${pad2(m + 1)}-${pad2(useDay)}`;
    if (candidate >= today) return candidate;
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return doc.dueDate;
};

const shapeDue = (doc, today = todayLocalStr()) => {
  const plain = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  const nextDueDate = computeNextDue(plain, today);
  const daysUntil = daysBetween(today, nextDueDate);
  const ack = String(plain.acknowledgedForDate || "");
  const isAcknowledged = ack === nextDueDate;
  const needsAttention =
    Boolean(plain.isActive) && daysUntil >= 0 && daysUntil <= 3 && !isAcknowledged;
  const isOverdue =
    Boolean(plain.isActive) &&
    plain.recurrence === "none" &&
    daysUntil < 0 &&
    !isAcknowledged;

  return {
    ...plain,
    nextDueDate,
    daysUntil,
    needsAttention,
    isOverdue,
    isAcknowledged
  };
};

const listDueDates = async (req, res, next) => {
  try {
    const includeInactive = String(req.query.includeInactive || "") === "1";
    const filter = includeInactive ? {} : { isActive: true };
    const docs = await DueDate.find(filter).sort({ dueDate: 1, createdAt: -1 }).lean();
    const today = todayLocalStr();
    const items = docs.map((d) => shapeDue(d, today));

    items.sort((a, b) => {
      // Urgent first, then by next due date
      const urgA = a.needsAttention || a.isOverdue ? 0 : 1;
      const urgB = b.needsAttention || b.isOverdue ? 0 : 1;
      if (urgA !== urgB) return urgA - urgB;
      return String(a.nextDueDate).localeCompare(String(b.nextDueDate));
    });

    const attentionCount = items.filter((i) => i.needsAttention || i.isOverdue).length;

    res.json({
      today,
      items,
      attentionCount,
      categories: DUE_CATEGORIES
    });
  } catch (error) {
    next(error);
  }
};

const createDueDate = async (req, res, next) => {
  try {
    const {
      title,
      category = "other",
      dueDate,
      recurrence = "none",
      amount,
      notes = ""
    } = req.body;

    if (!String(title || "").trim()) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(dueDate))) {
      return res.status(400).json({ message: "Valid due date (YYYY-MM-DD) is required" });
    }
    if (!["none", "monthly"].includes(recurrence)) {
      return res.status(400).json({ message: "Recurrence must be none or monthly" });
    }
    if (category && !DUE_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    const dayOfMonth = Number(String(dueDate).slice(8, 10));
    const doc = await DueDate.create({
      title: String(title).trim(),
      category: category || "other",
      dueDate: String(dueDate),
      recurrence,
      dayOfMonth: recurrence === "monthly" ? dayOfMonth : null,
      amount: amount === "" || amount == null ? null : Number(amount),
      notes: String(notes || "").trim(),
      createdBy: req.user?._id
    });

    res.status(201).json({
      message: "Due date saved",
      item: shapeDue(doc.toObject())
    });
  } catch (error) {
    next(error);
  }
};

const updateDueDate = async (req, res, next) => {
  try {
    const doc = await DueDate.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Due date not found" });

    const { title, category, dueDate, recurrence, amount, notes, isActive } = req.body;

    if (title != null) doc.title = String(title).trim();
    if (category != null) {
      if (!DUE_CATEGORIES.includes(category)) {
        return res.status(400).json({ message: "Invalid category" });
      }
      doc.category = category;
    }
    if (dueDate != null) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dueDate))) {
        return res.status(400).json({ message: "Invalid due date" });
      }
      doc.dueDate = String(dueDate);
    }
    if (recurrence != null) {
      if (!["none", "monthly"].includes(recurrence)) {
        return res.status(400).json({ message: "Invalid recurrence" });
      }
      doc.recurrence = recurrence;
    }
    if (amount !== undefined) {
      doc.amount = amount === "" || amount == null ? null : Number(amount);
    }
    if (notes != null) doc.notes = String(notes).trim();
    if (typeof isActive === "boolean") doc.isActive = isActive;

    if (doc.recurrence === "monthly" && doc.dueDate) {
      doc.dayOfMonth = Number(doc.dueDate.slice(8, 10));
    }

    await doc.save();
    res.json({ message: "Due date updated", item: shapeDue(doc.toObject()) });
  } catch (error) {
    next(error);
  }
};

const deleteDueDate = async (req, res, next) => {
  try {
    const doc = await DueDate.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: "Due date not found" });
    res.json({ message: "Due date deleted" });
  } catch (error) {
    next(error);
  }
};

/** Admin clicked notify / got it — stop highlight for this occurrence */
const acknowledgeDueDate = async (req, res, next) => {
  try {
    const doc = await DueDate.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Due date not found" });

    const today = todayLocalStr();
    const nextDueDate = computeNextDue(doc.toObject(), today);
    doc.acknowledgedForDate = nextDueDate;
    await doc.save();

    res.json({
      message: "Reminder dismissed for this due date",
      item: shapeDue(doc.toObject(), today)
    });
  } catch (error) {
    next(error);
  }
};

const getDueDatesAttentionCount = async (req, res, next) => {
  try {
    const docs = await DueDate.find({ isActive: true }).lean();
    const today = todayLocalStr();
    const attentionCount = docs.filter((d) => {
      const shaped = shapeDue(d, today);
      return shaped.needsAttention || shaped.isOverdue;
    }).length;
    res.json({ today, attentionCount });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listDueDates,
  createDueDate,
  updateDueDate,
  deleteDueDate,
  acknowledgeDueDate,
  getDueDatesAttentionCount,
  computeNextDue,
  shapeDue,
  DUE_CATEGORIES
};
