const WalkInSale = require("../models/WalkInSale");
const Expense = require("../models/Expense");
const CashDrawerDay = require("../models/CashDrawerDay");

const localDateStr = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const PAY_METHODS = ["cash", "upi", "card", "other"];

const amountDueOf = (sale) =>
  Math.max(0, round2(Number(sale.total || 0) - Number(sale.amountPaid || 0)));

const normalizeLegacySale = (sale) => {
  // Older bills had no paymentStatus / amountPaid — treat as fully paid
  if (!sale.paymentStatus) {
    const paid = sale.amountPaid != null ? Number(sale.amountPaid) : Number(sale.total || 0);
    return {
      ...sale,
      paymentStatus:
        paid <= 0 ? "pending" : paid + 0.009 < Number(sale.total || 0) ? "partial" : "paid",
      amountPaid: round2(paid || (sale.paymentMethod === "pending" ? 0 : Number(sale.total || 0))),
      amountDue: 0
    };
  }
  const amountPaid = round2(sale.amountPaid || 0);
  return {
    ...sale,
    amountPaid,
    amountDue: Math.max(0, round2(Number(sale.total || 0) - amountPaid))
  };
};

const enrichSale = (sale) => {
  const s = normalizeLegacySale(sale);
  s.amountDue = amountDueOf(s);
  return s;
};

const getOrCreateDrawer = async (date) => {
  let doc = await CashDrawerDay.findOne({ date });
  if (!doc) {
    doc = await CashDrawerDay.create({ date, openingCash: 0 });
  }
  return doc;
};

/**
 * Day overview for cashier: bills, collections by method, petty spends, drawer.
 */
const getDaySummary = async (req, res, next) => {
  try {
    const date =
      req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date))
        ? String(req.query.date)
        : localDateStr();

    const [salesRaw, expenses, drawer] = await Promise.all([
      WalkInSale.find({ saleDate: date, status: { $ne: "cancelled" } })
        .sort({ createdAt: -1 })
        .populate("createdBy", "name")
        .populate("payments.collectedBy", "name")
        .lean(),
      Expense.find({ date, source: "cashier" })
        .sort({ createdAt: -1 })
        .populate("createdBy", "name")
        .lean(),
      getOrCreateDrawer(date)
    ]);

    const sales = salesRaw.map(enrichSale);

    let billed = 0;
    let collected = 0;
    let pending = 0;
    let pendingCount = 0;
    let paidCount = 0;
    const byMethod = { cash: 0, upi: 0, card: 0, other: 0 };

    for (const sale of sales) {
      billed += round2(sale.total);
      collected += round2(sale.amountPaid);
      const due = amountDueOf(sale);
      pending += due;
      if (due > 0.009) pendingCount += 1;
      else paidCount += 1;

      if (Array.isArray(sale.payments) && sale.payments.length > 0) {
        for (const p of sale.payments) {
          const m = PAY_METHODS.includes(p.paymentMethod) ? p.paymentMethod : "other";
          byMethod[m] += round2(p.amount);
        }
      } else if (sale.amountPaid > 0) {
        // Legacy fully-paid bill without payment lines
        const m = PAY_METHODS.includes(sale.paymentMethod) ? sale.paymentMethod : "cash";
        byMethod[m] += round2(sale.amountPaid);
      }
    }

    let expenseCash = 0;
    let expenseOther = 0;
    for (const e of expenses) {
      const amt = round2(e.amount);
      if (e.paymentMethod === "cash") expenseCash += amt;
      else expenseOther += amt;
    }

    const openingCash = round2(drawer.openingCash);
    const cashToManager = round2(drawer.cashToManager);
    const expectedDrawerCash = round2(
      openingCash + byMethod.cash - expenseCash - cashToManager
    );
    const counted =
      drawer.closingCashCounted == null ? null : round2(drawer.closingCashCounted);
    const variance =
      counted == null ? null : round2(counted - expectedDrawerCash);

    res.json({
      date,
      summary: {
        billCount: sales.length,
        pendingCount,
        paidCount,
        billed: round2(billed),
        collected: round2(collected),
        pending: round2(pending),
        byMethod: {
          cash: round2(byMethod.cash),
          upi: round2(byMethod.upi),
          card: round2(byMethod.card),
          other: round2(byMethod.other)
        },
        expenseTotal: round2(expenseCash + expenseOther),
        expenseCash: round2(expenseCash),
        expenseOther: round2(expenseOther),
        openingCash,
        cashToManager,
        expectedDrawerCash,
        closingCashCounted: counted,
        variance,
        drawerNotes: drawer.notes || ""
      },
      sales,
      expenses,
      drawer,
      cashierCategories: (Expense.CASHIER_CATEGORIES || []).map((id) => ({
        id,
        label: Expense.CATEGORY_LABELS[id] || id
      }))
    });
  } catch (error) {
    next(error);
  }
};

const listBills = async (req, res, next) => {
  try {
    const date =
      req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date))
        ? String(req.query.date)
        : localDateStr();
    const status = String(req.query.status || "all").toLowerCase();

    const filter = { saleDate: date, status: { $ne: "cancelled" } };
    if (status === "pending") {
      filter.$or = [
        { paymentStatus: { $in: ["pending", "partial"] } },
        { paymentStatus: { $exists: false }, amountPaid: { $lt: 0.01 } }
      ];
    } else if (status === "paid") {
      filter.paymentStatus = "paid";
    }

    const sales = await WalkInSale.find(filter)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name")
      .populate("payments.collectedBy", "name")
      .lean();

    let list = sales.map(enrichSale);
    if (status === "pending") {
      list = list.filter((s) => amountDueOf(s) > 0.009);
    } else if (status === "paid") {
      list = list.filter((s) => amountDueOf(s) <= 0.009);
    }

    res.json({ date, sales: list });
  } catch (error) {
    next(error);
  }
};

const collectPayment = async (req, res, next) => {
  try {
    const sale = await WalkInSale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: "Bill not found" });
    if (sale.status === "cancelled") {
      return res.status(400).json({ message: "Cancelled bills cannot be collected" });
    }

    // Migrate legacy
    if (!sale.paymentStatus) {
      sale.paymentStatus = "paid";
      sale.amountPaid = round2(sale.total);
    }

    const due = amountDueOf(sale);
    if (due <= 0.009) {
      return res.status(400).json({ message: "This bill is already fully paid" });
    }

    let amount = round2(req.body.amount);
    if (!(amount > 0)) {
      // Default: settle full due
      amount = due;
    }
    if (amount > due + 0.05) {
      return res.status(400).json({
        message: `Amount exceeds due (₹${due.toFixed(2)})`
      });
    }
    amount = Math.min(amount, due);

    const method = String(req.body.paymentMethod || "cash").toLowerCase();
    if (!PAY_METHODS.includes(method)) {
      return res.status(400).json({ message: "paymentMethod must be cash, upi, card or other" });
    }

    sale.payments.push({
      amount,
      paymentMethod: method,
      notes: String(req.body.notes || "").trim().slice(0, 300),
      collectedBy: req.user?._id,
      collectedAt: new Date()
    });

    sale.amountPaid = round2(Number(sale.amountPaid || 0) + amount);
    sale.paymentMethod = method;

    const stillDue = amountDueOf(sale);
    if (stillDue <= 0.009) {
      sale.paymentStatus = "paid";
      sale.amountPaid = round2(sale.total);
      sale.paidAt = new Date();
    } else {
      sale.paymentStatus = "partial";
      sale.paidAt = null;
    }

    await sale.save();

    const populated = await WalkInSale.findById(sale._id)
      .populate("createdBy", "name")
      .populate("payments.collectedBy", "name")
      .lean();

    res.json({
      message:
        sale.paymentStatus === "paid"
          ? "Payment collected — bill fully paid"
          : `Partial payment recorded · ₹${stillDue.toFixed(2)} still due`,
      sale: enrichSale(populated)
    });
  } catch (error) {
    next(error);
  }
};

const createCashierExpense = async (req, res, next) => {
  try {
    const date =
      req.body.date && /^\d{4}-\d{2}-\d{2}$/.test(String(req.body.date))
        ? String(req.body.date)
        : localDateStr();
    const amount = round2(req.body.amount);
    if (!(amount > 0)) {
      return res.status(400).json({ message: "Enter a valid amount" });
    }

    const allowed = new Set([
      ...(Expense.CASHIER_CATEGORIES || []),
      ...(Expense.EXPENSE_CATEGORIES || [])
    ]);
    let category = String(req.body.category || "other").trim();
    if (!allowed.has(category)) category = "other";

    const paymentMethod = ["cash", "upi", "card", "other"].includes(req.body.paymentMethod)
      ? req.body.paymentMethod
      : "cash";

    const expense = await Expense.create({
      date,
      category,
      amount,
      title: String(req.body.title || "").trim().slice(0, 200),
      notes: String(req.body.notes || "").trim().slice(0, 1000),
      paymentMethod,
      source: "cashier",
      createdBy: req.user?._id
    });

    const populated = await Expense.findById(expense._id).populate("createdBy", "name").lean();
    res.status(201).json({ message: "Expense saved", expense: populated });
  } catch (error) {
    next(error);
  }
};

const deleteCashierExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, source: "cashier" });
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    await expense.deleteOne();
    res.json({ message: "Expense deleted" });
  } catch (error) {
    next(error);
  }
};

const upsertDrawer = async (req, res, next) => {
  try {
    const date =
      req.body.date && /^\d{4}-\d{2}-\d{2}$/.test(String(req.body.date))
        ? String(req.body.date)
        : localDateStr();

    const drawer = await getOrCreateDrawer(date);
    const body = req.body || {};

    if (body.openingCash !== undefined) {
      drawer.openingCash = Math.max(0, round2(body.openingCash));
    }
    if (body.closingCashCounted !== undefined) {
      const v = body.closingCashCounted;
      drawer.closingCashCounted =
        v === null || v === "" ? null : Math.max(0, round2(v));
    }
    if (body.cashToManager !== undefined) {
      drawer.cashToManager = Math.max(0, round2(body.cashToManager));
    }
    if (body.notes !== undefined) {
      drawer.notes = String(body.notes || "").trim().slice(0, 1000);
    }
    if (body.close === true) {
      drawer.closedBy = req.user?._id;
      drawer.closedAt = new Date();
    }
    drawer.updatedBy = req.user?._id;
    await drawer.save();

    res.json({ message: "Drawer updated", drawer });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDaySummary,
  listBills,
  collectPayment,
  createCashierExpense,
  deleteCashierExpense,
  upsertDrawer
};
