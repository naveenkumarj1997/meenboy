const mongoose = require("mongoose");
const Product = require("../models/Product");
const DailyPriceUpdate = require("../models/DailyPriceUpdate");
const Order = require("../models/Order");
const WalkInSale = require("../models/WalkInSale");
const { istYmd } = require("../utils/geoDistance");

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const isYmd = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const norm = (s) => String(s || "").trim().toLowerCase();

const addDays = (ymd, days) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Running min/max/sum accumulator. */
const acc = () => ({ min: Infinity, max: -Infinity, sum: 0, count: 0 });
const push = (a, v) => {
  a.min = Math.min(a.min, v);
  a.max = Math.max(a.max, v);
  a.sum += v;
  a.count += 1;
};
const finish = (a) =>
  a.count
    ? { min: round2(a.min), max: round2(a.max), avg: round2(a.sum / a.count), count: a.count }
    : { min: null, max: null, avg: null, count: 0 };

// @route GET /api/price-history/products
const listPriceProducts = async (req, res, next) => {
  try {
    const products = await Product.find({})
      .select("name category unit minPrice maxPrice image availableCuts isActive")
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
        image: p.image || "",
        cuts: (p.availableCuts || []).map((c) => c.name).filter(Boolean)
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/price-history?productId=&from=&to=&cut=
const getPriceHistory = async (req, res, next) => {
  try {
    const { productId } = req.query;
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: "Choose a product." });
    }
    const product = await Product.findById(productId)
      .select("name category unit minPrice maxPrice image")
      .lean();
    if (!product) return res.status(404).json({ message: "Product not found." });

    const today = istYmd();
    const to = isYmd(req.query.to) ? req.query.to : today;
    const from = isYmd(req.query.from) ? req.query.from : addDays(to, -89);
    const cutFilter = norm(req.query.cut);

    const pid = String(product._id);
    const pname = norm(product.name);
    const matches = (id, name) => String(id || "") === pid || norm(name) === pname;
    const cutOk = (cut) =>
      !cutFilter || norm(cut) === cutFilter || (cutFilter === "default" && !String(cut || "").trim());
    const nameRegex = new RegExp(`^${product.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

    const [dailyDocs, orders, walkIns] = await Promise.all([
      DailyPriceUpdate.find({ deliveryDate: { $gte: from, $lte: to } })
        .select("deliveryDate savedRates")
        .lean(),
      Order.find({
        status: "delivered",
        deliveryDate: { $gte: from, $lte: to },
        $or: [{ "items.product": pid }, { "items.productName": nameRegex }]
      })
        .select("deliveryDate items")
        .lean(),
      WalkInSale.find({
        saleDate: { $gte: from, $lte: to },
        status: { $ne: "cancelled" },
        $or: [{ "items.product": product._id }, { "items.productName": nameRegex }]
      })
        .select("saleDate items")
        .lean()
    ]);

    const days = {};
    const day = (date) => {
      if (!days[date]) {
        days[date] = { date, rate: acc(), soldQty: 0, soldAmount: 0, orderQty: 0, walkInQty: 0 };
      }
      return days[date];
    };
    const cutsSeen = new Set();
    const byCut = {};

    for (const doc of dailyDocs) {
      for (const r of doc.savedRates || []) {
        if (!matches(r.productId, r.productName)) continue;
        const price = Number(r.unitPrice);
        if (!Number.isFinite(price) || price <= 0) continue;
        const cutName = String(r.cutName || "").trim() || "Default";
        cutsSeen.add(cutName);
        if (!cutOk(r.cutName)) continue;
        push(day(doc.deliveryDate).rate, price);
        if (!byCut[cutName]) byCut[cutName] = acc();
        push(byCut[cutName], price);
      }
    }

    const addSale = (date, it, source) => {
      if (!matches(it.product, it.productName)) return;
      const cutName = String(it.cutName || "").trim() || "Default";
      cutsSeen.add(cutName);
      if (!cutOk(it.cutName)) return;
      const qty = Number(it.quantity) || 0;
      const amount = Number(it.totalPrice) || qty * (Number(it.unitPrice) || 0);
      if (qty <= 0 || amount <= 0) return;
      const d = day(date);
      d.soldQty += qty;
      d.soldAmount += amount;
      if (source === "order") d.orderQty += qty;
      else d.walkInQty += qty;
    };
    orders.forEach((o) => (o.items || []).forEach((it) => addSale(o.deliveryDate, it, "order")));
    walkIns.forEach((w) => (w.items || []).forEach((it) => addSale(w.saleDate, it, "walkin")));

    const series = Object.values(days)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => {
        const r = finish(d.rate);
        return {
          date: d.date,
          dailyRate: r.avg,
          rateLow: r.min,
          rateHigh: r.max,
          soldAvg: d.soldQty > 0 ? round2(d.soldAmount / d.soldQty) : null,
          soldQty: round2(d.soldQty),
          soldAmount: round2(d.soldAmount),
          orderQty: round2(d.orderQty),
          walkInQty: round2(d.walkInQty)
        };
      });

    /** Price used for stats: the daily rate set by admin, else the average sold price that day. */
    const priceOf = (s) => (s.dailyRate != null ? s.dailyRate : s.soldAvg);

    const group = (keyFn) => {
      const map = {};
      series.forEach((s) => {
        const p = priceOf(s);
        const key = keyFn(s.date);
        if (!map[key]) map[key] = { key, price: acc(), qty: 0, amount: 0 };
        if (p != null) push(map[key].price, p);
        map[key].qty += s.soldQty;
        map[key].amount += s.soldAmount;
      });
      return Object.values(map)
        .sort((a, b) => String(a.key).localeCompare(String(b.key)))
        .map((g) => {
          const f = finish(g.price);
          return {
            key: g.key,
            avg: f.avg,
            min: f.min,
            max: f.max,
            days: f.count,
            qty: round2(g.qty),
            amount: round2(g.amount),
            soldAvg: g.qty > 0 ? round2(g.amount / g.qty) : null
          };
        });
    };

    const monthly = group((d) => d.slice(0, 7));
    const yearly = group((d) => d.slice(0, 4));
    const weekdayRaw = group((d) => String(new Date(`${d}T00:00:00Z`).getUTCDay()));
    const weekday = WEEKDAYS.map((name, i) => {
      const g = weekdayRaw.find((w) => w.key === String(i));
      return { key: name, avg: g?.avg ?? null, days: g?.days || 0, qty: g?.qty || 0 };
    });

    const priced = series.filter((s) => priceOf(s) != null);
    const overall = acc();
    priced.forEach((s) => push(overall, priceOf(s)));
    const o = finish(overall);
    const first = priced[0] || null;
    const last = priced[priced.length - 1] || null;
    const highest = priced.reduce((best, s) => (!best || priceOf(s) > priceOf(best) ? s : best), null);
    const lowest = priced.reduce((best, s) => (!best || priceOf(s) < priceOf(best) ? s : best), null);
    const totalQty = series.reduce((sum, s) => sum + s.soldQty, 0);
    const totalAmount = series.reduce((sum, s) => sum + s.soldAmount, 0);

    res.json({
      product: {
        _id: pid,
        name: product.name,
        category: product.category,
        unit: product.unit || "kg",
        minPrice: Number(product.minPrice) || 0,
        maxPrice: Number(product.maxPrice) || 0,
        image: product.image || ""
      },
      range: { from, to },
      cut: req.query.cut || "",
      cuts: [...cutsSeen].sort(),
      summary: {
        days: o.count,
        dailyRateDays: series.filter((s) => s.dailyRate != null).length,
        avg: o.avg,
        min: o.min,
        max: o.max,
        spread: o.count ? round2(o.max - o.min) : null,
        first: first ? { date: first.date, price: priceOf(first) } : null,
        last: last ? { date: last.date, price: priceOf(last) } : null,
        changePct:
          first && last && priceOf(first) > 0
            ? round2(((priceOf(last) - priceOf(first)) / priceOf(first)) * 100)
            : null,
        highest: highest ? { date: highest.date, price: priceOf(highest) } : null,
        lowest: lowest ? { date: lowest.date, price: priceOf(lowest) } : null,
        totalQty: round2(totalQty),
        totalAmount: round2(totalAmount),
        soldAvg: totalQty > 0 ? round2(totalAmount / totalQty) : null
      },
      series,
      monthly,
      yearly,
      weekday,
      byCut: Object.entries(byCut)
        .map(([cut, a]) => ({ cut, ...finish(a) }))
        .sort((a, b) => (b.avg || 0) - (a.avg || 0))
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { listPriceProducts, getPriceHistory };
