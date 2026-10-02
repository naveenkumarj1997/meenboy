const ToolsSettings = require("../models/ToolsSettings");
const Order = require("../models/Order");
const DeliveryAssignment = require("../models/DeliveryAssignment");
const WalkInSale = require("../models/WalkInSale");
const Product = require("../models/Product");
const User = require("../models/User");
const { istYmd } = require("../utils/geoDistance");
const { resolveNavUrl, extractCoords } = require("../utils/mapLink");

const isYmd = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const norm = (s) => String(s || "").trim().toLowerCase();
const addDays = (ymd, days) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const dateParam = (q) => (isYmd(q.date) ? q.date : istYmd());

const getSettingsDoc = async () => {
  let doc = await ToolsSettings.findOne({ key: "default" });
  if (!doc) {
    try {
      doc = await ToolsSettings.create({ key: "default" });
    } catch (err) {
      if (err.code !== 11000) throw err;
      doc = await ToolsSettings.findOne({ key: "default" });
    }
  }
  return doc;
};

const shapeSettings = (doc) => ({
  upiId: doc.upiId || "",
  payeeName: doc.payeeName || "FISHFRIENDLY",
  reminderTemplate: doc.reminderTemplate || ToolsSettings.DEFAULT_REMINDER,
  yields: (doc.yields || []).map((y) => ({ productId: y.productId, percent: y.percent }))
});

// @route GET /api/tools/settings
const getToolsSettings = async (req, res, next) => {
  try {
    res.json({ settings: shapeSettings(await getSettingsDoc()) });
  } catch (error) {
    next(error);
  }
};

// @route PUT /api/tools/settings
const updateToolsSettings = async (req, res, next) => {
  try {
    const doc = await getSettingsDoc();
    const { upiId, payeeName, reminderTemplate, yields } = req.body || {};
    if (upiId !== undefined) {
      const clean = String(upiId || "").trim();
      if (clean && !/^[\w.\-]{2,}@[\w.\-]{2,}$/.test(clean)) {
        return res.status(400).json({ message: "Enter a valid UPI ID, like shopname@okaxis." });
      }
      doc.upiId = clean;
    }
    if (payeeName !== undefined) doc.payeeName = String(payeeName || "").trim() || "FISHFRIENDLY";
    if (reminderTemplate !== undefined) {
      doc.reminderTemplate = String(reminderTemplate || "").trim() || ToolsSettings.DEFAULT_REMINDER;
    }
    if (Array.isArray(yields)) {
      doc.yields = yields
        .map((y) => ({ productId: String(y.productId || ""), percent: Number(y.percent) }))
        .filter((y) => y.productId && y.percent >= 1 && y.percent <= 100);
    }
    doc.updatedBy = req.user._id;
    await doc.save();
    res.json({ settings: shapeSettings(doc), message: "Tools settings saved." });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/tools/products
const getToolProducts = async (req, res, next) => {
  try {
    const products = await Product.find({})
      .select("name category unit minPrice maxPrice isActive")
      .sort({ category: 1, name: 1 })
      .lean();
    res.json({
      products: products.map((p) => ({
        _id: String(p._id),
        name: p.name,
        category: p.category,
        unit: p.unit || "kg",
        minPrice: Number(p.minPrice) || 0,
        maxPrice: Number(p.maxPrice) || 0,
        isActive: p.isActive !== false
      }))
    });
  } catch (error) {
    next(error);
  }
};

const loadDayOrders = async (date) => {
  const orders = await Order.find({ deliveryDate: date, status: { $ne: "cancelled" } })
    .populate("customer", "name phone mapUrl")
    .sort({ deliveryTime: 1, createdAt: 1 })
    .lean();
  const assignments = await DeliveryAssignment.find({ order: { $in: orders.map((o) => o._id) } })
    .populate("deliveryPartner", "name phone")
    .lean();
  const byOrder = new Map(assignments.map((a) => [String(a.order), a]));
  return orders.map((o) => {
    const a = byOrder.get(String(o._id));
    const address = [o.address?.line1, o.address?.line2, o.address?.city, o.address?.postalCode]
      .filter(Boolean)
      .join(", ");
    return {
      orderId: String(o._id),
      shortId: String(o._id).slice(-6).toUpperCase(),
      customerName: o.customer?.name || "Customer",
      phone: o.address?.phone || o.customer?.phone || "",
      address,
      area: o.address?.line2 || "",
      mapUrl: o.mapUrl || o.customer?.mapUrl || "",
      deliveryTime: o.deliveryTime || "",
      status: o.status,
      bookingSource: o.bookingSource || "website",
      bookingType: o.bookingType || "pre_order",
      dailyPriceUpdated: Boolean(o.dailyPriceUpdated),
      total: round2(o.total),
      items: (o.items || []).map((it) => ({
        productName: it.productName,
        cutName: it.cutName || "",
        quantity: it.quantity,
        unit: it.unit || "kg",
        notes: it.notes || ""
      })),
      customerNotes: o.customerNotes || "",
      partnerId: a?.deliveryPartner?._id ? String(a.deliveryPartner._id) : "",
      partnerName: a?.deliveryPartner?.name || "",
      sequence: a?.sequence ?? null,
      assignmentStatus: a?.status || ""
    };
  });
};

// @route GET /api/tools/day-orders?date=
const getDayOrders = async (req, res, next) => {
  try {
    const date = dateParam(req.query);
    res.json({ date, orders: await loadDayOrders(date) });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/tools/pending-customers
const getPendingCustomers = async (req, res, next) => {
  try {
    const users = await User.find({ role: "customer", pendingBalance: { $gt: 0 }, isRealUser: true })
      .select("name phone pendingBalance")
      .sort({ pendingBalance: -1 })
      .lean();
    const last = await Order.aggregate([
      { $match: { customer: { $in: users.map((u) => u._id) }, status: "delivered" } },
      { $group: { _id: "$customer", lastDate: { $max: "$deliveryDate" } } }
    ]);
    const lastBy = new Map(last.map((l) => [String(l._id), l.lastDate]));
    res.json({
      customers: users.map((u) => ({
        _id: String(u._id),
        name: u.name,
        phone: u.phone || "",
        pendingBalance: round2(u.pendingBalance),
        lastOrderDate: lastBy.get(String(u._id)) || ""
      }))
    });
  } catch (error) {
    next(error);
  }
};

const WEEKS_OF_HISTORY = 8;

// @route GET /api/tools/purchase-plan?date=
const getPurchasePlan = async (req, res, next) => {
  try {
    const date = isYmd(req.query.date) ? req.query.date : addDays(istYmd(), 1);
    const pastDates = Array.from({ length: WEEKS_OF_HISTORY }, (_, i) => addDays(date, -7 * (i + 1)));

    const [products, settings, booked, walkIns] = await Promise.all([
      Product.find({}).select("name category unit isActive").sort({ category: 1, name: 1 }).lean(),
      getSettingsDoc(),
      Order.find({ deliveryDate: date, status: { $ne: "cancelled" } }).select("items").lean(),
      WalkInSale.find({ saleDate: { $in: pastDates }, status: { $ne: "cancelled" } })
        .select("saleDate items")
        .lean()
    ]);

    const yieldBy = new Map((settings.yields || []).map((y) => [String(y.productId), y.percent]));
    const rows = new Map(
      products.map((p) => [
        String(p._id),
        {
          productId: String(p._id),
          name: p.name,
          category: p.category,
          unit: p.unit || "kg",
          isActive: p.isActive !== false,
          bookedQty: 0,
          bookedOrders: 0,
          walkInTotal: 0,
          yieldPercent: yieldBy.get(String(p._id)) || null
        }
      ])
    );
    const byName = new Map([...rows.values()].map((r) => [norm(r.name), r]));
    const rowFor = (it) => rows.get(String(it.product || "")) || byName.get(norm(it.productName));

    booked.forEach((o) => {
      const seen = new Set();
      (o.items || []).forEach((it) => {
        const r = rowFor(it);
        if (!r) return;
        r.bookedQty += Number(it.quantity) || 0;
        if (!seen.has(r.productId)) {
          r.bookedOrders += 1;
          seen.add(r.productId);
        }
      });
    });
    walkIns.forEach((w) =>
      (w.items || []).forEach((it) => {
        const r = rowFor(it);
        if (r) r.walkInTotal += Number(it.quantity) || 0;
      })
    );

    const roundUpQuarter = (q) => Math.ceil(q * 4 - 1e-9) / 4;
    const plan = [...rows.values()]
      .map((r) => {
        const walkInAvg = r.walkInTotal / WEEKS_OF_HISTORY;
        const cleanedNeed = r.bookedQty + walkInAvg;
        const wholeNeed = r.yieldPercent ? cleanedNeed / (r.yieldPercent / 100) : cleanedNeed;
        return {
          productId: r.productId,
          name: r.name,
          category: r.category,
          unit: r.unit,
          isActive: r.isActive,
          bookedQty: round2(r.bookedQty),
          bookedOrders: r.bookedOrders,
          walkInAvg: round2(walkInAvg),
          cleanedNeed: round2(cleanedNeed),
          yieldPercent: r.yieldPercent,
          suggestedBuy: r.unit === "kg" ? roundUpQuarter(wholeNeed) : Math.ceil(wholeNeed - 1e-9)
        };
      })
      .filter((r) => r.cleanedNeed > 0);

    res.json({ date, weeksOfHistory: WEEKS_OF_HISTORY, orderCount: booked.length, plan });
  } catch (error) {
    next(error);
  }
};

const STOPS_PER_LINK = 4;

const directionsLink = (origin, stops) => {
  const qs = new URLSearchParams({ api: "1", travelmode: "driving" });
  if (origin) qs.set("origin", origin);
  qs.set("destination", stops[stops.length - 1]);
  if (stops.length > 1) qs.set("waypoints", stops.slice(0, -1).join("|"));
  return `https://www.google.com/maps/dir/?${qs.toString()}`;
};

// @route GET /api/tools/routes?date=
const getRoutes = async (req, res, next) => {
  try {
    const date = dateParam(req.query);
    const allOrders = await loadDayOrders(date);
    const orders = allOrders.filter((o) => o.partnerId);

    const uniqueUrls = [...new Set(orders.map((o) => o.mapUrl).filter(Boolean))];
    const navBy = new Map(
      await Promise.all(uniqueUrls.map(async (u) => [u, await resolveNavUrl(u)]))
    );

    const partners = new Map();
    orders.forEach((o) => {
      if (!partners.has(o.partnerId)) {
        partners.set(o.partnerId, { partnerId: o.partnerId, partnerName: o.partnerName, stops: [] });
      }
      const nav = o.mapUrl ? navBy.get(o.mapUrl) || o.mapUrl : "";
      const coords = nav ? extractCoords(nav) : null;
      partners.get(o.partnerId).stops.push({
        orderId: o.orderId,
        shortId: o.shortId,
        customerName: o.customerName,
        phone: o.phone,
        address: o.address,
        deliveryTime: o.deliveryTime,
        sequence: o.sequence,
        assignmentStatus: o.assignmentStatus,
        location: coords ? `${coords.lat},${coords.lng}` : o.address,
        hasPin: Boolean(coords),
        mapLink: nav || ""
      });
    });

    const routes = [...partners.values()].map((p) => {
      const stops = p.stops.sort((a, b) => (a.sequence ?? 999) - (b.sequence ?? 999));
      const pending = stops.filter((s) => !["delivered", "failed", "cancelled"].includes(s.assignmentStatus));
      const buildLinks = (list) => {
        const links = [];
        for (let i = 0; i < list.length; i += STOPS_PER_LINK) {
          const chunk = list.slice(i, i + STOPS_PER_LINK);
          const origin = i === 0 ? "" : list[i - 1].location;
          links.push({
            label: `Stops ${i + 1}–${i + chunk.length}`,
            url: directionsLink(origin, chunk.map((s) => s.location))
          });
        }
        return links;
      };
      return {
        partnerId: p.partnerId,
        partnerName: p.partnerName,
        stops,
        pendingCount: pending.length,
        links: buildLinks(stops),
        pendingLinks: buildLinks(pending)
      };
    });

    res.json({
      date,
      stopsPerLink: STOPS_PER_LINK,
      unassigned: allOrders.length - orders.length,
      routes
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettingsDoc,
  getToolsSettings,
  updateToolsSettings,
  getToolProducts,
  getDayOrders,
  getPendingCustomers,
  getPurchasePlan,
  getRoutes
};
