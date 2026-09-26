const WalkInSale = require("../models/WalkInSale");
const Product = require("../models/Product");
const { generateWalkInBill } = require("../utils/pdfWalkInBill");
const {
  deductTodayCatchForWalkIn,
  restoreTodayCatchForWalkIn
} = require("./todayCatchController");
const path = require("path");
const fs = require("fs");

const localDateStr = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const nextBillNumber = async (saleDate) => {
  const prefix = `WI-${saleDate.replace(/-/g, "")}-`;
  const latest = await WalkInSale.findOne({ billNumber: new RegExp(`^${prefix}`) })
    .sort({ billNumber: -1 })
    .select("billNumber")
    .lean();

  let seq = 1;
  if (latest?.billNumber) {
    const part = latest.billNumber.split("-").pop();
    const n = parseInt(part, 10);
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(3, "0")}`;
};

const normalizePhone = (phone) => String(phone || "").replace(/\D/g, "").slice(-10);

const escapeRegex = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createWalkInSale = async (req, res, next) => {
  try {
    const { customerName, customerPhone, items, paymentMethod = "pending", notes = "" } = req.body;

    if (!customerName?.trim()) {
      return res.status(400).json({ message: "Customer name is required" });
    }
    const phone = normalizePhone(customerPhone);
    if (phone.length < 10) {
      return res.status(400).json({ message: "Valid 10-digit phone number is required" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Add at least one item" });
    }

    const saleDate = localDateStr();
    const normalizedItems = [];

    for (const raw of items) {
      const quantity = Number(raw.quantity);
      const unitPrice = Number(raw.unitPrice);
      if (!raw.productName?.trim()) {
        return res.status(400).json({ message: "Each item needs a product name" });
      }
      if (!(quantity > 0) || !(unitPrice >= 0)) {
        return res.status(400).json({ message: "Invalid quantity or price on an item" });
      }

      let productName = String(raw.productName).trim();
      let category = String(raw.category || "").trim();
      let unit = raw.unit === "piece" ? "piece" : "kg";
      let productId = raw.product || null;
      const catchItemId = String(raw.catchItemId || "").trim();

      if (productId) {
        const product = await Product.findById(productId).select("name category unit").lean();
        if (product) {
          productName = product.name;
          category = product.category || category;
          unit = product.unit === "piece" ? "piece" : unit;
        }
      }

      const totalPrice = Math.round(quantity * unitPrice * 100) / 100;
      normalizedItems.push({
        product: productId || undefined,
        catchItemId,
        productName,
        category,
        cutName: String(raw.cutName || "").trim(),
        quantity,
        unit,
        unitPrice,
        totalPrice
      });
    }

    let updatedCatch;
    try {
      updatedCatch = await deductTodayCatchForWalkIn(
        normalizedItems.map((i) => ({
          catchItemId: i.catchItemId,
          product: i.product,
          productName: i.productName,
          quantity: i.quantity
        }))
      );
    } catch (stockErr) {
      const status = stockErr.statusCode || 400;
      return res.status(status).json({ message: stockErr.message || "Stock update failed" });
    }

    const subtotal = Math.round(normalizedItems.reduce((s, i) => s + i.totalPrice, 0) * 100) / 100;
    const billNumber = await nextBillNumber(saleDate);

    const methodRaw = String(paymentMethod || "pending").toLowerCase();
    const payNow = ["cash", "upi", "card", "other"].includes(methodRaw);
    const method = payNow ? methodRaw : "pending";

    let sale = await WalkInSale.create({
      billNumber,
      saleDate,
      customerName: customerName.trim(),
      customerPhone: phone,
      items: normalizedItems,
      subtotal,
      total: subtotal,
      paymentMethod: method,
      paymentStatus: payNow ? "paid" : "pending",
      amountPaid: payNow ? subtotal : 0,
      payments: payNow
        ? [
            {
              amount: subtotal,
              paymentMethod: method,
              notes: "Paid at billing counter",
              collectedBy: req.user?._id,
              collectedAt: new Date()
            }
          ]
        : [],
      paidAt: payNow ? new Date() : null,
      notes: String(notes || "").trim(),
      status: "active",
      createdBy: req.user?._id
    });

    try {
      const invoicePath = await generateWalkInBill(sale.toObject());
      sale.invoicePath = invoicePath;
      await sale.save();
    } catch (pdfErr) {
      console.error("Walk-in bill PDF failed:", pdfErr.message);
    }

    sale = await WalkInSale.findById(sale._id).populate("createdBy", "name").lean();
    res.status(201).json({
      message: payNow
        ? "Walk-in sale saved — Today's Catch stock updated · payment recorded"
        : "Walk-in bill saved — collect payment in Walk-in Accounts",
      sale,
      todayCatch: updatedCatch
    });
  } catch (error) {
    next(error);
  }
};

const listWalkInSales = async (req, res, next) => {
  try {
    const {
      date,
      from,
      to,
      phone,
      q,
      search,
      status = "active",
      sort = "newest",
      page = 1,
      limit = 10
    } = req.query;

    const filter = {};
    const statusKey = String(status || "active").toLowerCase();
    if (statusKey === "cancelled") filter.status = "cancelled";
    else if (statusKey === "all") {
      /* no status filter */
    } else {
      // active (default) — include legacy rows without status
      filter.$or = [{ status: "active" }, { status: { $exists: false } }, { status: null }];
    }

    if (date && /^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      filter.saleDate = date;
    } else {
      if (from && /^\d{4}-\d{2}-\d{2}$/.test(String(from))) {
        filter.saleDate = { ...(filter.saleDate || {}), $gte: String(from) };
      }
      if (to && /^\d{4}-\d{2}-\d{2}$/.test(String(to))) {
        filter.saleDate = { ...(filter.saleDate || {}), $lte: String(to) };
      }
    }

    if (phone) {
      const p = normalizePhone(phone);
      if (p) filter.customerPhone = new RegExp(`${escapeRegex(p)}$`);
    }

    const queryText = String(q || search || "").trim();
    if (queryText) {
      const digits = normalizePhone(queryText);
      const rx = new RegExp(escapeRegex(queryText), "i");
      const textOr = [{ billNumber: rx }, { customerName: rx }, { notes: rx }];
      if (digits.length >= 4) {
        textOr.push({ customerPhone: new RegExp(escapeRegex(digits)) });
      }
      if (filter.$or) {
        // Combine status $or with search via $and
        filter.$and = [{ $or: filter.$or }, { $or: textOr }];
        delete filter.$or;
      } else {
        filter.$or = textOr;
      }
    }

    const sortKey = String(sort || "newest").toLowerCase();
    let sortSpec = { createdAt: -1 };
    if (sortKey === "oldest") sortSpec = { createdAt: 1 };
    else if (sortKey === "amount_high") sortSpec = { total: -1, createdAt: -1 };
    else if (sortKey === "amount_low") sortSpec = { total: 1, createdAt: -1 };
    else if (sortKey === "bill") sortSpec = { billNumber: -1 };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [sales, total] = await Promise.all([
      WalkInSale.find(filter)
        .sort(sortSpec)
        .skip(skip)
        .limit(limitNum)
        .populate("createdBy", "name")
        .populate("cancelledBy", "name")
        .lean(),
      WalkInSale.countDocuments(filter)
    ]);

    res.json({
      sales,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    next(error);
  }
};

const getWalkInSale = async (req, res, next) => {
  try {
    const sale = await WalkInSale.findById(req.params.id)
      .populate("createdBy", "name")
      .populate("cancelledBy", "name")
      .lean();
    if (!sale) return res.status(404).json({ message: "Sale not found" });
    res.json({ sale });
  } catch (error) {
    next(error);
  }
};

const getWalkInStats = async (req, res, next) => {
  try {
    const today = localDateStr();
    const activeMatch = {
      $or: [{ status: "active" }, { status: { $exists: false } }, { status: null }]
    };

    const [todayAgg, totalAgg] = await Promise.all([
      WalkInSale.aggregate([
        { $match: { saleDate: today, ...activeMatch } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            amount: { $sum: "$total" }
          }
        }
      ]),
      WalkInSale.aggregate([
        { $match: activeMatch },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            amount: { $sum: "$total" }
          }
        }
      ])
    ]);

    res.json({
      today: {
        date: today,
        count: todayAgg[0]?.count || 0,
        amount: todayAgg[0]?.amount || 0
      },
      total: {
        count: totalAgg[0]?.count || 0,
        amount: totalAgg[0]?.amount || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

const downloadWalkInBill = async (req, res, next) => {
  try {
    const sale = await WalkInSale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: "Sale not found" });
    if (sale.status === "cancelled") {
      return res.status(400).json({ message: "Cancelled bills cannot be downloaded" });
    }

    const relativePath = await generateWalkInBill(sale.toObject());
    sale.invoicePath = relativePath;
    await sale.save();

    const absolute = path.join(__dirname, "../..", relativePath.replace(/^\//, ""));
    if (!fs.existsSync(absolute)) {
      return res.status(404).json({ message: "Bill file not found" });
    }

    res.download(absolute, `WalkIn-${sale.billNumber}.pdf`);
  } catch (error) {
    next(error);
  }
};

const updateWalkInSale = async (req, res, next) => {
  try {
    const sale = await WalkInSale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: "Sale not found" });
    if (sale.status === "cancelled") {
      return res.status(400).json({ message: "Cancelled bills cannot be edited" });
    }

    const body = req.body || {};
    if (body.customerName !== undefined) {
      const name = String(body.customerName || "").trim();
      if (!name) return res.status(400).json({ message: "Customer name is required" });
      sale.customerName = name.slice(0, 120);
    }
    if (body.customerPhone !== undefined) {
      const phone = normalizePhone(body.customerPhone);
      if (phone.length < 10) {
        return res.status(400).json({ message: "Valid 10-digit phone number is required" });
      }
      sale.customerPhone = phone;
    }
    if (body.notes !== undefined) {
      sale.notes = String(body.notes || "").trim().slice(0, 500);
    }

    await sale.save();

    try {
      const invoicePath = await generateWalkInBill(sale.toObject());
      sale.invoicePath = invoicePath;
      await sale.save();
    } catch (pdfErr) {
      console.error("Walk-in bill PDF refresh failed:", pdfErr.message);
    }

    const populated = await WalkInSale.findById(sale._id)
      .populate("createdBy", "name")
      .lean();

    res.json({ message: "Bill updated", sale: populated });
  } catch (error) {
    next(error);
  }
};

const cancelWalkInSale = async (req, res, next) => {
  try {
    const sale = await WalkInSale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: "Sale not found" });
    if (sale.status === "cancelled") {
      return res.status(400).json({ message: "Bill is already cancelled" });
    }

    const reason = String(req.body?.reason || req.body?.cancelReason || "").trim().slice(0, 500);

    let todayCatch;
    try {
      todayCatch = await restoreTodayCatchForWalkIn(
        (sale.items || []).map((i) => ({
          catchItemId: i.catchItemId,
          product: i.product,
          productName: i.productName,
          quantity: i.quantity
        }))
      );
    } catch (stockErr) {
      console.error("Stock restore on cancel failed:", stockErr.message);
      todayCatch = null;
    }

    sale.status = "cancelled";
    sale.cancelledAt = new Date();
    sale.cancelledBy = req.user?._id;
    sale.cancelReason = reason || "Wrong bill / cancelled by admin";
    await sale.save();

    const populated = await WalkInSale.findById(sale._id)
      .populate("createdBy", "name")
      .populate("cancelledBy", "name")
      .lean();

    res.json({
      message: "Bill cancelled · stock restored to Today's Catch",
      sale: populated,
      todayCatch
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createWalkInSale,
  listWalkInSales,
  getWalkInSale,
  getWalkInStats,
  downloadWalkInBill,
  updateWalkInSale,
  cancelWalkInSale
};
