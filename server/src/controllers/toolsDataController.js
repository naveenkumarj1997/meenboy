const mongoose = require("mongoose");
const User = require("../models/User");
const Order = require("../models/Order");
const DeliveryAssignment = require("../models/DeliveryAssignment");
const ManualCollection = require("../models/ManualCollection");
const Payment = require("../models/Payment");
const Notification = require("../models/Notification");
const Transaction = require("../models/Transaction");
const WalkInSale = require("../models/WalkInSale");
const { istYmd } = require("../utils/geoDistance");
const { generateQuotationPdf } = require("../utils/pdfQuotation");

const isYmd = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const phoneKey = (p) => String(p || "").replace(/\D/g, "").slice(-10);
const istDateOf = (d) =>
  d ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(d)) : "";

// @route GET /api/tools/duplicates
const getDuplicateCustomers = async (req, res, next) => {
  try {
    const customers = await User.find({ role: "customer", phone: { $exists: true, $ne: "" } })
      .select("name email phone alternatePhone customerSource isRealUser pendingBalance address createdAt")
      .lean();

    const groups = new Map();
    customers.forEach((c) => {
      const key = phoneKey(c.phone);
      if (key.length !== 10) return;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    });
    const dupGroups = [...groups.entries()].filter(([, list]) => list.length > 1);
    const ids = dupGroups.flatMap(([, list]) => list.map((c) => c._id));

    const stats = await Order.aggregate([
      { $match: { customer: { $in: ids } } },
      {
        $group: {
          _id: "$customer",
          orders: { $sum: 1 },
          lastDate: { $max: "$deliveryDate" }
        }
      }
    ]);
    const statBy = new Map(stats.map((s) => [String(s._id), s]));

    res.json({
      groups: dupGroups.map(([key, list]) => ({
        phone: key,
        customers: list
          .map((c) => ({
            _id: String(c._id),
            name: c.name,
            email: c.email || "",
            phone: c.phone,
            customerSource: c.customerSource || "",
            isRealUser: c.isRealUser !== false,
            pendingBalance: round2(c.pendingBalance),
            area: c.address?.line2 || c.address?.city || "",
            createdAt: c.createdAt,
            orderCount: statBy.get(String(c._id))?.orders || 0,
            lastOrderDate: statBy.get(String(c._id))?.lastDate || ""
          }))
          .sort((a, b) => b.orderCount - a.orderCount)
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/tools/duplicates/merge  { keepId, mergeIds: [] }
const mergeDuplicateCustomers = async (req, res, next) => {
  try {
    const { keepId } = req.body || {};
    const mergeIds = [...new Set((req.body?.mergeIds || []).map(String))].filter((id) => id !== keepId);
    if (!mongoose.isValidObjectId(keepId) || !mergeIds.length || !mergeIds.every(mongoose.isValidObjectId)) {
      return res.status(400).json({ message: "Choose one customer to keep and at least one to merge." });
    }

    const keep = await User.findById(keepId);
    const others = await User.find({ _id: { $in: mergeIds } });
    if (!keep || keep.role !== "customer" || others.length !== mergeIds.length) {
      return res.status(404).json({ message: "Customer not found." });
    }
    if (others.some((u) => u.role !== "customer")) {
      return res.status(400).json({ message: "Only customer accounts can be merged." });
    }
    const key = phoneKey(keep.phone);
    if (others.some((u) => phoneKey(u.phone) !== key)) {
      return res.status(400).json({ message: "Only customers with the same phone number can be merged." });
    }

    const filter = { $in: others.map((u) => u._id) };
    const [orders, collections, payments, notifications, transactions] = await Promise.all([
      Order.updateMany({ customer: filter }, { $set: { customer: keep._id } }),
      ManualCollection.updateMany({ customer: filter }, { $set: { customer: keep._id } }),
      Payment.updateMany({ customer: filter }, { $set: { customer: keep._id } }),
      Notification.updateMany({ user: filter }, { $set: { user: keep._id } }),
      Transaction.updateMany({ referenceUser: filter }, { $set: { referenceUser: keep._id } })
    ]);

    const addedPending = others.reduce((s, u) => s + (Number(u.pendingBalance) || 0), 0);
    keep.pendingBalance = round2((Number(keep.pendingBalance) || 0) + addedPending);
    const donor = others.find((u) => u.address?.line1) || null;
    if (!keep.address?.line1 && donor) keep.address = donor.address;
    if (!keep.mapUrl) keep.mapUrl = others.find((u) => u.mapUrl)?.mapUrl || keep.mapUrl;
    if (!keep.alternatePhone) {
      keep.alternatePhone = others.find((u) => u.alternatePhone)?.alternatePhone || keep.alternatePhone;
    }
    if (others.some((u) => u.isRealUser !== false)) keep.isRealUser = true;
    await keep.save();
    await User.deleteMany({ _id: filter });

    res.json({
      message: `Merged ${others.length} customer${others.length > 1 ? "s" : ""} into ${keep.name}.`,
      moved: {
        orders: orders.modifiedCount,
        collections: collections.modifiedCount,
        payments: payments.modifiedCount,
        notifications: notifications.modifiedCount,
        transactions: transactions.modifiedCount
      },
      pendingBalance: keep.pendingBalance
    });
  } catch (error) {
    next(error);
  }
};

const csvCell = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (headers, rows) =>
  `\uFEFF${[headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n")}\r\n`;
const itemsText = (items) =>
  (items || [])
    .map((it) => `${it.productName}${it.cutName ? ` (${it.cutName})` : ""} ${it.quantity}${it.unit || "kg"}`)
    .join("; ");
const addressText = (a) => [a?.line1, a?.line2, a?.city, a?.postalCode].filter(Boolean).join(", ");
const PAY_LABEL = {
  cash: "Cash",
  upi: "UPI",
  partial_cash: "Partial cash",
  partial_upi: "Partial UPI",
  pay_later: "Pay later",
  manual: "Manual",
  none: ""
};

const exportOrders = async (from, to) => {
  const orders = await Order.find({ deliveryDate: { $gte: from, $lte: to } })
    .populate("customer", "name phone")
    .sort({ deliveryDate: 1, deliveryTime: 1 })
    .lean();
  const assignments = await DeliveryAssignment.find({ order: { $in: orders.map((o) => o._id) } })
    .populate("deliveryPartner", "name")
    .lean();
  const aBy = new Map(assignments.map((a) => [String(a.order), a]));
  return toCsv(
    [
      "Order ID", "Delivery date", "Time", "Customer", "Phone", "Address", "Items", "Subtotal",
      "Discount", "Add-on", "Delivery fee", "Total", "Status", "Source", "Booking type",
      "Daily price updated", "Partner", "Payment method", "Collected"
    ],
    orders.map((o) => {
      const a = aBy.get(String(o._id));
      return [
        String(o._id).slice(-6).toUpperCase(), o.deliveryDate, o.deliveryTime, o.customer?.name || "",
        o.address?.phone || o.customer?.phone || "", addressText(o.address), itemsText(o.items),
        round2(o.subtotal), round2(o.discountAmount), round2(o.addonAmount), round2(o.deliveryFee),
        round2(o.total), o.status, o.bookingSource || "website",
        o.bookingType === "shop_stock" ? "Shop stock" : "Pre order", o.dailyPriceUpdated ? "Yes" : "No",
        a?.deliveryPartner?.name || "", PAY_LABEL[a?.paymentMethod] ?? a?.paymentMethod ?? "",
        a ? round2(a.paymentCollected) : ""
      ];
    })
  );
};

const exportCustomers = async () => {
  const customers = await User.find({ role: "customer" }).sort({ name: 1 }).lean();
  const stats = await Order.aggregate([
    { $match: { status: "delivered" } },
    { $group: { _id: "$customer", orders: { $sum: 1 }, spent: { $sum: "$total" }, last: { $max: "$deliveryDate" } } }
  ]);
  const sBy = new Map(stats.map((s) => [String(s._id), s]));
  return toCsv(
    [
      "Name", "Phone", "Alternate phone", "Email", "Address", "Source", "Real customer", "Status",
      "Joined", "Delivered orders", "Total spent", "Last order", "Pending balance"
    ],
    customers.map((c) => {
      const s = sBy.get(String(c._id));
      return [
        c.name, c.phone || "", c.alternatePhone || "", c.email || "", addressText(c.address),
        c.customerSource || "", c.isRealUser === false ? "No" : "Yes", c.status || "",
        istDateOf(c.createdAt), s?.orders || 0, round2(s?.spent), s?.last || "", round2(c.pendingBalance)
      ];
    })
  );
};

const exportWalkIns = async (from, to) => {
  const sales = await WalkInSale.find({ saleDate: { $gte: from, $lte: to } }).sort({ saleDate: 1, createdAt: 1 }).lean();
  return toCsv(
    ["Bill no", "Date", "Customer", "Phone", "Items", "Subtotal", "Total", "Paid", "Balance", "Payment status", "Payment method", "Status"],
    sales.map((s) => [
      s.billNumber, s.saleDate, s.customerName, s.customerPhone, itemsText(s.items), round2(s.subtotal),
      round2(s.total), round2(s.amountPaid), round2((s.total || 0) - (s.amountPaid || 0)), s.paymentStatus,
      s.paymentMethod, s.status
    ])
  );
};

const exportCollections = async (from, to) => {
  const rows = [];

  const orders = await Order.find({ deliveryDate: { $gte: from, $lte: to }, status: "delivered" })
    .populate("customer", "name phone")
    .lean();
  const assignments = await DeliveryAssignment.find({
    order: { $in: orders.map((o) => o._id) },
    paymentCollected: { $gt: 0 }
  })
    .populate("deliveryPartner", "name")
    .lean();
  const oBy = new Map(orders.map((o) => [String(o._id), o]));
  assignments.forEach((a) => {
    const o = oBy.get(String(a.order));
    rows.push([
      o.deliveryDate, "Delivery", o.customer?.name || "", o.address?.phone || o.customer?.phone || "",
      PAY_LABEL[a.paymentMethod] ?? a.paymentMethod, round2(a.paymentCollected),
      `Order ${String(o._id).slice(-6).toUpperCase()} · ${a.deliveryPartner?.name || ""}`
    ]);
  });

  const start = new Date(`${from}T00:00:00+05:30`);
  const end = new Date(`${to}T23:59:59.999+05:30`);
  const manual = await ManualCollection.find({ createdAt: { $gte: start, $lte: end } })
    .populate("customer", "name phone")
    .lean();
  manual.forEach((m) =>
    rows.push([
      istDateOf(m.createdAt), "Pending collection", m.customer?.name || "", m.customer?.phone || "",
      PAY_LABEL[m.paymentMethod] ?? m.paymentMethod, round2(m.amount), m.notes || ""
    ])
  );

  const sales = await WalkInSale.find({ "payments.collectedAt": { $gte: start, $lte: end }, status: "active" }).lean();
  sales.forEach((s) =>
    (s.payments || [])
      .filter((p) => p.collectedAt >= start && p.collectedAt <= end)
      .forEach((p) =>
        rows.push([
          istDateOf(p.collectedAt), "Walk-in", s.customerName, s.customerPhone,
          PAY_LABEL[p.paymentMethod] ?? p.paymentMethod, round2(p.amount), `Bill ${s.billNumber}`
        ])
      )
  );

  rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return toCsv(["Date", "Type", "Customer", "Phone", "Method", "Amount", "Reference"], rows);
};

const EXPORTS = {
  orders: exportOrders,
  customers: exportCustomers,
  walkins: exportWalkIns,
  collections: exportCollections
};

// @route GET /api/tools/export?type=orders|customers|walkins|collections&from&to
const exportCsv = async (req, res, next) => {
  try {
    const type = String(req.query.type || "");
    const build = EXPORTS[type];
    if (!build) return res.status(400).json({ message: "Unknown export type." });
    const today = istYmd();
    const from = isYmd(req.query.from) ? req.query.from : today;
    const to = isYmd(req.query.to) ? req.query.to : from;
    if (from > to) return res.status(400).json({ message: "From date must be before To date." });

    const csv = await build(from, to);
    const name = type === "customers" ? `Customers-${today}.csv` : `${type[0].toUpperCase()}${type.slice(1)}-${from}_to_${to}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

// @route POST /api/tools/quotation/pdf
const quotationPdf = async (req, res, next) => {
  try {
    const b = req.body || {};
    const items = (Array.isArray(b.items) ? b.items : [])
      .map((it) => {
        const qty = Number(it.qty);
        const rate = Number(it.rate);
        return {
          name: String(it.name || "").trim(),
          qty,
          unit: String(it.unit || "kg").trim() || "kg",
          rate,
          amount: round2(qty * rate)
        };
      })
      .filter((it) => it.name && it.qty > 0 && it.rate >= 0);
    if (!String(b.customerName || "").trim()) {
      return res.status(400).json({ message: "Customer name is required." });
    }
    if (!items.length) return res.status(400).json({ message: "Add at least one item with qty and rate." });

    const today = istYmd();
    const validDays = Math.min(30, Math.max(1, Number(b.validDays) || 3));
    const valid = new Date(`${today}T00:00:00Z`);
    valid.setUTCDate(valid.getUTCDate() + validDays - 1);
    const subtotal = round2(items.reduce((s, it) => s + it.amount, 0));
    const discount = round2(Math.max(0, Number(b.discount) || 0));
    const deliveryCharge = round2(Math.max(0, Number(b.deliveryCharge) || 0));
    const now = new Date();
    const hhmm = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    })
      .format(now)
      .replace(":", "");
    const number = `Q-${today.replace(/-/g, "")}-${hhmm}`;

    const pdf = await generateQuotationPdf({
      number,
      date: today,
      validTill: valid.toISOString().slice(0, 10),
      customerName: String(b.customerName).trim(),
      phone: String(b.phone || "").trim(),
      address: String(b.address || "").trim(),
      eventName: String(b.eventName || "").trim(),
      eventDate: isYmd(b.eventDate) ? b.eventDate : "",
      items,
      subtotal,
      discount,
      deliveryCharge,
      total: round2(Math.max(0, subtotal - discount + deliveryCharge)),
      notes: String(b.notes || "").trim(),
      contactPhone: String(b.contactPhone || "").trim()
    });
    const safeName = String(b.customerName).trim().replace(/[^\w-]+/g, "_").slice(0, 40);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Quotation-${safeName}-${number}.pdf"`);
    res.send(pdf);
  } catch (error) {
    next(error);
  }
};

module.exports = { getDuplicateCustomers, mergeDuplicateCustomers, exportCsv, quotationPdf };
