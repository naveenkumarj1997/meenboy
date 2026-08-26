const WalkInSale = require("../models/WalkInSale");
const Product = require("../models/Product");
const { generateWalkInBill } = require("../utils/pdfWalkInBill");
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

const createWalkInSale = async (req, res, next) => {
  try {
    const { customerName, customerPhone, items, paymentMethod = "cash", notes = "" } = req.body;

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
        productName,
        category,
        cutName: String(raw.cutName || "").trim(),
        quantity,
        unit,
        unitPrice,
        totalPrice
      });
    }

    const subtotal = Math.round(normalizedItems.reduce((s, i) => s + i.totalPrice, 0) * 100) / 100;
    const billNumber = await nextBillNumber(saleDate);

    let sale = await WalkInSale.create({
      billNumber,
      saleDate,
      customerName: customerName.trim(),
      customerPhone: phone,
      items: normalizedItems,
      subtotal,
      total: subtotal,
      paymentMethod: ["cash", "upi", "other"].includes(paymentMethod) ? paymentMethod : "cash",
      notes: String(notes || "").trim(),
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
    res.status(201).json({ message: "Walk-in sale saved", sale });
  } catch (error) {
    next(error);
  }
};

const listWalkInSales = async (req, res, next) => {
  try {
    const { date, phone, page = 1, limit = 30 } = req.query;
    const filter = {};

    if (date && /^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      filter.saleDate = date;
    }
    if (phone) {
      const p = normalizePhone(phone);
      if (p) filter.customerPhone = p;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
    const skip = (pageNum - 1) * limitNum;

    const [sales, total] = await Promise.all([
      WalkInSale.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("createdBy", "name")
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
    const sale = await WalkInSale.findById(req.params.id).populate("createdBy", "name").lean();
    if (!sale) return res.status(404).json({ message: "Sale not found" });
    res.json({ sale });
  } catch (error) {
    next(error);
  }
};

const getWalkInStats = async (req, res, next) => {
  try {
    const today = localDateStr();

    const [todayAgg, totalAgg] = await Promise.all([
      WalkInSale.aggregate([
        { $match: { saleDate: today } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            amount: { $sum: "$total" }
          }
        }
      ]),
      WalkInSale.aggregate([
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

    // Always regenerate so layout fixes apply to older bills too
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

module.exports = {
  createWalkInSale,
  listWalkInSales,
  getWalkInSale,
  getWalkInStats,
  downloadWalkInBill
};
