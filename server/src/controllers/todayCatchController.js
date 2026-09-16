const TodayCatch = require("../models/TodayCatch");

const DEFAULT_KEY = "default";

const DEFAULT_HEADLINE = "Stock Available";
const DEFAULT_SUBHEADLINE = "See what's in stock today — price & quantity. Order fast on WhatsApp.";

const shapePublic = (doc) => {
  if (!doc) {
    return {
      enabled: false,
      headline: DEFAULT_HEADLINE,
      subheadline: DEFAULT_SUBHEADLINE,
      items: []
    };
  }
  const items = (doc.items || [])
    .slice()
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((item) => ({
      id: String(item._id),
      name: item.name,
      price: item.price,
      unit: item.unit || "kg",
      note: item.note || "",
      availableQty: Number(item.availableQty) > 0 ? Number(item.availableQty) : 0,
      imageUrl: item.imageUrl || "",
      productId: item.productId ? String(item.productId) : null
    }));

  const enabled = doc.enabled === true;
  return {
    enabled,
    headline: doc.headline || DEFAULT_HEADLINE,
    subheadline: doc.subheadline || DEFAULT_SUBHEADLINE,
    items: enabled ? items : [],
    updatedAt: doc.updatedAt
  };
};

const shapeAdmin = (doc) => {
  const raw = doc && (doc.toObject ? doc.toObject() : doc);
  if (!raw) {
    return {
      enabled: false,
      headline: DEFAULT_HEADLINE,
      subheadline: DEFAULT_SUBHEADLINE,
      items: []
    };
  }
  const items = (raw.items || [])
    .slice()
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((item) => ({
      id: String(item._id),
      name: item.name,
      price: item.price,
      unit: item.unit || "kg",
      note: item.note || "",
      availableQty: Number(item.availableQty) > 0 ? Number(item.availableQty) : 0,
      imageUrl: item.imageUrl || "",
      productId: item.productId ? String(item.productId) : null,
      sortOrder: item.sortOrder || 0
    }));

  return {
    enabled: raw.enabled === true,
    headline: raw.headline || DEFAULT_HEADLINE,
    subheadline: raw.subheadline || DEFAULT_SUBHEADLINE,
    items,
    updatedAt: raw.updatedAt
  };
};

const getOrCreate = async () => {
  let doc = await TodayCatch.findOne({ key: DEFAULT_KEY });
  if (doc) return doc;

  try {
    doc = await TodayCatch.create({
      key: DEFAULT_KEY,
      enabled: false,
      items: [],
      headline: DEFAULT_HEADLINE,
      subheadline: DEFAULT_SUBHEADLINE
    });
    return doc;
  } catch (error) {
    if (error?.code === 11000) {
      doc = await TodayCatch.findOne({ key: DEFAULT_KEY });
      if (doc) return doc;
    }
    throw error;
  }
};

const cleanItems = (items) => {
  if (!Array.isArray(items)) return null;
  return items
    .map((raw, index) => {
      const name = String(raw?.name || "").trim();
      const price = Number(raw?.price);
      if (!name || !Number.isFinite(price) || price < 0) return null;
      const productId = raw?.productId ? String(raw.productId).trim() : "";
      return {
        name: name.slice(0, 120),
        price: Math.round(price * 100) / 100,
        unit: String(raw?.unit || "kg").trim().slice(0, 40) || "kg",
        note: String(raw?.note || "").trim().slice(0, 200),
        availableQty: (() => {
          const q = Number(raw?.availableQty);
          if (!Number.isFinite(q) || q < 0) return 0;
          return Math.round(q * 10) / 10;
        })(),
        imageUrl: String(raw?.imageUrl || "").trim(),
        productId: productId || null,
        sortOrder: Number.isFinite(Number(raw?.sortOrder)) ? Number(raw.sortOrder) : index
      };
    })
    .filter(Boolean)
    .slice(0, 24);
};

// @desc    Public today's catch for homepage
// @route   GET /api/today-catch
// @access  Public
const getPublicTodayCatch = async (req, res, next) => {
  try {
    const doc = await TodayCatch.findOne({ key: DEFAULT_KEY }).lean();
    res.json({ todayCatch: shapePublic(doc) });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin get today's catch settings
// @route   GET /api/today-catch/admin
// @access  Admin
const getAdminTodayCatch = async (req, res, next) => {
  try {
    const doc = await getOrCreate();
    res.json({ todayCatch: shapeAdmin(doc) });
  } catch (error) {
    next(error);
  }
};

// @desc    Update today's catch (toggle + items)
// @route   PUT /api/today-catch/admin
// @access  Admin
const updateTodayCatch = async (req, res, next) => {
  try {
    await getOrCreate();

    const setFields = {
      updatedBy: req.user?._id
    };

    if (Object.prototype.hasOwnProperty.call(req.body, "enabled")) {
      setFields.enabled = req.body.enabled === true || req.body.enabled === "true";
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "headline")) {
      setFields.headline =
        String(req.body.headline || "").trim().slice(0, 120) || DEFAULT_HEADLINE;
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "subheadline")) {
      setFields.subheadline = String(req.body.subheadline || "").trim().slice(0, 240);
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "items")) {
      const cleaned = cleanItems(req.body.items);
      if (cleaned) setFields.items = cleaned;
    }

    // Cannot enable with zero items
    if (setFields.enabled === true) {
      const current = await TodayCatch.findOne({ key: DEFAULT_KEY }).lean();
      const nextItems = setFields.items || current?.items || [];
      if (!nextItems.length) {
        return res.status(400).json({
          message: "Add at least one item before turning ON for the homepage"
        });
      }
    }

    const doc = await TodayCatch.findOneAndUpdate(
      { key: DEFAULT_KEY },
      { $set: setFields },
      { new: true }
    );

    res.json({
      message: "Today's catch updated",
      todayCatch: shapeAdmin(doc)
    });
  } catch (error) {
    next(error);
  }
};

const roundQty = (q) => Math.round(Number(q) * 10) / 10;

/**
 * Deduct walk-in sale quantities from Today's Catch stock.
 * lines: [{ catchItemId?, product?, productName, quantity }]
 * Mutates and saves the catch document. Throws Error with .statusCode = 400 on failure.
 */
const deductTodayCatchForWalkIn = async (lines) => {
  if (!Array.isArray(lines) || lines.length === 0) {
    const err = new Error("No items to deduct from stock");
    err.statusCode = 400;
    throw err;
  }

  const doc = await getOrCreate();
  const items = doc.items || [];
  if (!items.length) {
    const err = new Error(
      "Today's Catch has no stock items. Add products and quantities in Today's Catch first."
    );
    err.statusCode = 400;
    throw err;
  }

  // Aggregate required qty per catch item index
  const needByIndex = new Map();

  for (const line of lines) {
    const qty = Number(line.quantity);
    if (!(qty > 0)) continue;

    let idx = -1;
    const catchId = line.catchItemId ? String(line.catchItemId) : "";
    if (catchId) {
      idx = items.findIndex((it) => String(it._id) === catchId);
    }
    if (idx < 0 && line.product) {
      idx = items.findIndex(
        (it) => it.productId && String(it.productId) === String(line.product)
      );
    }
    if (idx < 0 && line.productName) {
      const name = String(line.productName).trim().toLowerCase();
      idx = items.findIndex((it) => String(it.name || "").trim().toLowerCase() === name);
    }
    if (idx < 0) {
      const err = new Error(
        `"${line.productName || "Item"}" is not in Today's Catch stock. Add it there first.`
      );
      err.statusCode = 400;
      throw err;
    }

    needByIndex.set(idx, roundQty((needByIndex.get(idx) || 0) + qty));
  }

  for (const [idx, need] of needByIndex.entries()) {
    const item = items[idx];
    const available = roundQty(item.availableQty || 0);
    if (need > available + 0.001) {
      const unit = item.unit || "kg";
      const err = new Error(
        `Not enough stock for "${item.name}". Available ${available} ${unit}, needed ${need} ${unit}.`
      );
      err.statusCode = 400;
      throw err;
    }
  }

  for (const [idx, need] of needByIndex.entries()) {
    const item = items[idx];
    item.availableQty = Math.max(0, roundQty((item.availableQty || 0) - need));
  }

  doc.markModified("items");
  await doc.save();
  return shapeAdmin(doc);
};

module.exports = {
  getPublicTodayCatch,
  getAdminTodayCatch,
  updateTodayCatch,
  getOrCreate,
  shapeAdmin,
  deductTodayCatchForWalkIn
};
