const Product = require("../models/Product");
const Order = require("../models/Order");
const WalkInSale = require("../models/WalkInSale");
const DailyPurchase = require("../models/DailyPurchase");

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const round3 = (n) => Math.round((Number(n) || 0) * 1000) / 1000;
const norm = (s) => String(s || "").trim().toLowerCase();

const VENDORS = [
  { key: "chickenShop", label: "Chicken Shop" },
  { key: "muttonShop", label: "Mutton Shop" },
  { key: "fishCompany", label: "Fish Company" },
  { key: "localFishShop", label: "Local Fish Shop" }
];

/**
 * Sold qty per catalog product for delivered orders (by delivery date) and walk-in bills
 * (by sale date). minValue = soldQty x product minPrice.
 */
const buildBuySellReport = async ({ from, to }) => {
  const [products, orders, walkIns, purchases] = await Promise.all([
    Product.find({})
      .select("name category unit minPrice maxPrice isActive")
      .sort({ category: 1, name: 1 })
      .lean(),
    Order.find({ status: "delivered", deliveryDate: { $gte: from, $lte: to } })
      .select("deliveryDate items")
      .lean(),
    WalkInSale.find({ saleDate: { $gte: from, $lte: to }, status: { $ne: "cancelled" } })
      .select("saleDate items")
      .lean(),
    DailyPurchase.find({ date: { $gte: from, $lte: to } }).sort({ date: 1 }).lean()
  ]);

  const rows = products.map((p) => ({
    productId: String(p._id),
    name: p.name,
    category: p.category,
    unit: p.unit || "kg",
    minPrice: round2(p.minPrice),
    maxPrice: round2(p.maxPrice),
    isActive: p.isActive !== false,
    orderQty: 0,
    walkInQty: 0,
    soldQty: 0,
    billedAmount: 0
  }));
  const byId = new Map(rows.map((r) => [r.productId, r]));
  const byName = new Map(rows.map((r) => [norm(r.name), r]));
  const unmatched = new Map();

  const addLine = (item, source) => {
    const qty = Number(item.quantity) || 0;
    if (qty <= 0) return;
    const amount = Number(item.totalPrice) || qty * (Number(item.unitPrice) || 0);
    let row = byId.get(String(item.product || "")) || byName.get(norm(item.productName));
    if (!row) {
      const key = norm(item.productName) || "unknown";
      if (!unmatched.has(key)) {
        unmatched.set(key, {
          name: item.productName || "Unknown item",
          unit: item.unit || "kg",
          soldQty: 0,
          billedAmount: 0
        });
      }
      const u = unmatched.get(key);
      u.soldQty += qty;
      u.billedAmount += amount;
      return;
    }
    if (source === "order") row.orderQty += qty;
    else row.walkInQty += qty;
    row.soldQty += qty;
    row.billedAmount += amount;
  };

  orders.forEach((o) => (o.items || []).forEach((it) => addLine(it, "order")));
  walkIns.forEach((w) => (w.items || []).forEach((it) => addLine(it, "walkin")));

  const productRows = rows.map((r) => ({
    ...r,
    orderQty: round3(r.orderQty),
    walkInQty: round3(r.walkInQty),
    soldQty: round3(r.soldQty),
    billedAmount: round2(r.billedAmount),
    minValue: round2(r.soldQty * r.minPrice)
  }));

  const sumBy = (list, key) => round2(list.reduce((s, r) => s + (Number(r[key]) || 0), 0));
  const kgRows = productRows.filter((r) => r.unit === "kg");
  const pieceRows = productRows.filter((r) => r.unit !== "kg");

  const vendorTotals = VENDORS.map((v) => {
    const purchased = sumBy(purchases, v.key);
    const settled = sumBy(purchases, `${v.key}Settled`);
    return { key: v.key, label: v.label, purchased, settled, balance: round2(purchased - settled) };
  });

  const vendorDays = purchases
    .map((p) => {
      const purchased = round2(VENDORS.reduce((s, v) => s + (Number(p[v.key]) || 0), 0));
      const settled = round2(
        VENDORS.reduce((s, v) => s + (Number(p[`${v.key}Settled`]) || 0), 0)
      );
      return {
        date: p.date,
        vendors: VENDORS.map((v) => ({
          key: v.key,
          purchased: round2(p[v.key]),
          settled: round2(p[`${v.key}Settled`])
        })),
        purchased,
        settled,
        balance: round2(purchased - settled)
      };
    })
    .filter((d) => d.purchased > 0 || d.settled > 0);

  const totalPurchased = sumBy(vendorTotals, "purchased");
  const totalSettled = sumBy(vendorTotals, "settled");
  const totalMinValue = sumBy(productRows, "minValue");

  return {
    range: { from, to },
    products: productRows,
    unmatched: [...unmatched.values()].map((u) => ({
      ...u,
      soldQty: round3(u.soldQty),
      billedAmount: round2(u.billedAmount)
    })),
    summary: {
      totalProducts: productRows.length,
      activeProducts: productRows.filter((r) => r.isActive).length,
      productsSold: productRows.filter((r) => r.soldQty > 0).length,
      totalKgSold: round3(kgRows.reduce((s, r) => s + r.soldQty, 0)),
      totalPiecesSold: round3(pieceRows.reduce((s, r) => s + r.soldQty, 0)),
      totalMinValue,
      totalBilled: sumBy(productRows, "billedAmount"),
      deliveredOrders: orders.length,
      walkInBills: walkIns.length
    },
    vendors: {
      list: VENDORS,
      totals: vendorTotals,
      days: vendorDays,
      totalPurchased,
      totalSettled,
      totalBalance: round2(totalPurchased - totalSettled),
      /** Sales at min price minus vendor purchases for the same period. */
      marginAtMinPrice: round2(totalMinValue - totalPurchased)
    }
  };
};

module.exports = { buildBuySellReport, VENDORS };
