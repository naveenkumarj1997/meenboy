/** Real business tracking starts here. Data before this date is treated as test. */
const getBusinessStartDate = () =>
  process.env.BUSINESS_START_DATE || "2026-08-27";

const toDateKey = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const localToday = () => toDateKey(new Date());

const inRange = (dateStr, from, to) =>
  Boolean(dateStr) && dateStr >= from && dateStr <= to;

const getPeriodRange = (period) => {
  const businessStart = getBusinessStartDate();
  const today = localToday();
  let from = businessStart;
  const to = today;

  if (period === "today") {
    from = today;
  } else if (period === "week") {
    const d = new Date();
    const weekday = d.getDay();
    const diffToMonday = weekday === 0 ? 6 : weekday - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - diffToMonday);
    from = toDateKey(monday);
  } else if (period === "month") {
    const d = new Date();
    from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  }

  if (from < businessStart) from = businessStart;
  if (from > to) from = to;

  return { from, to, businessStart, today };
};

const emptyDay = (date) => ({
  date,
  deliverySales: 0,
  walkInSales: 0,
  totalSales: 0,
  collectedAtDelivery: 0,
  manualCollections: 0,
  walkInCollected: 0,
  totalCollected: 0,
  totalPurchases: 0,
  partnerSalaries: 0,
  deliveredOrders: 0,
  walkInBills: 0,
  amountPending: 0,
  grossProfit: 0,
  netCashProfit: 0
});

const ensureDay = (map, date) => {
  if (!date || date < getBusinessStartDate()) return null;
  if (!map[date]) map[date] = emptyDay(date);
  return map[date];
};

const finalizeDay = (stat) => {
  stat.totalSales = stat.deliverySales + stat.walkInSales;
  stat.totalCollected =
    stat.collectedAtDelivery + stat.manualCollections + stat.walkInCollected;
  stat.amountPending = Math.max(0, stat.deliverySales - stat.collectedAtDelivery);
  stat.grossProfit = stat.totalSales - stat.totalPurchases - stat.partnerSalaries;
  stat.netCashProfit = stat.totalCollected - stat.totalPurchases - stat.partnerSalaries;
  return stat;
};

const sumPeriod = (days) => {
  const base = {
    deliverySales: 0,
    walkInSales: 0,
    totalSales: 0,
    collectedAtDelivery: 0,
    manualCollections: 0,
    walkInCollected: 0,
    totalCollected: 0,
    totalPurchases: 0,
    partnerSalaries: 0,
    deliveredOrders: 0,
    walkInBills: 0,
    amountPending: 0,
    grossProfit: 0,
    netCashProfit: 0
  };

  for (const d of days) {
    base.deliverySales += d.deliverySales;
    base.walkInSales += d.walkInSales;
    base.totalSales += d.totalSales;
    base.collectedAtDelivery += d.collectedAtDelivery;
    base.manualCollections += d.manualCollections;
    base.walkInCollected += d.walkInCollected;
    base.totalCollected += d.totalCollected;
    base.totalPurchases += d.totalPurchases;
    base.partnerSalaries += d.partnerSalaries;
    base.deliveredOrders += d.deliveredOrders;
    base.walkInBills += d.walkInBills;
    base.amountPending += d.amountPending;
    base.grossProfit += d.grossProfit;
    base.netCashProfit += d.netCashProfit;
  }

  return base;
};

const buildDailyStats = async () => {
  const Order = require("../models/Order");
  const DailyPurchase = require("../models/DailyPurchase");
  const PartnerSalary = require("../models/PartnerSalary");
  const DeliveryAssignment = require("../models/DeliveryAssignment");
  const WalkInSale = require("../models/WalkInSale");
  const ManualCollection = require("../models/ManualCollection");

  const businessStart = getBusinessStartDate();
  const statsMap = {};

  const orders = await Order.find({
    status: "delivered",
    deliveryDate: { $gte: businessStart }
  }).select("deliveryDate total");

  for (const order of orders) {
    const stat = ensureDay(statsMap, order.deliveryDate);
    if (!stat) continue;
    stat.deliverySales += Number(order.total || 0);
    stat.deliveredOrders += 1;
  }

  const purchases = await DailyPurchase.find({ date: { $gte: businessStart } });
  for (const purchase of purchases) {
    const stat = ensureDay(statsMap, purchase.date);
    if (!stat) continue;
    stat.totalPurchases += Number(purchase.total || 0);
  }

  const salaries = await PartnerSalary.find({ date: { $gte: businessStart } });
  for (const salary of salaries) {
    const stat = ensureDay(statsMap, salary.date);
    if (!stat) continue;
    stat.partnerSalaries += Number(salary.amount || 0);
  }

  const assignments = await DeliveryAssignment.find({ status: "delivered" })
    .populate({ path: "order", select: "deliveryDate" })
    .lean();

  for (const assignment of assignments) {
    const date = assignment.order?.deliveryDate;
    if (!date || date < businessStart) continue;
    const stat = ensureDay(statsMap, date);
    if (!stat) continue;
    stat.collectedAtDelivery += Number(assignment.paymentCollected || 0);
  }

  const walkIns = await WalkInSale.find({ saleDate: { $gte: businessStart } }).select(
    "saleDate total"
  );
  for (const sale of walkIns) {
    const stat = ensureDay(statsMap, sale.saleDate);
    if (!stat) continue;
    const amount = Number(sale.total || 0);
    stat.walkInSales += amount;
    stat.walkInCollected += amount;
    stat.walkInBills += 1;
  }

  const manualCollections = await ManualCollection.find({
    createdAt: { $gte: new Date(`${businessStart}T00:00:00`) }
  }).select("amount createdAt");

  for (const row of manualCollections) {
    const date = toDateKey(row.createdAt);
    const stat = ensureDay(statsMap, date);
    if (!stat) continue;
    stat.manualCollections += Number(row.amount || 0);
  }

  return Object.values(statsMap)
    .map(finalizeDay)
    .sort((a, b) => b.date.localeCompare(a.date));
};

const getMoneyManagementData = async (period = "today") => {
  const User = require("../models/User");
  const { from, to, businessStart, today } = getPeriodRange(period);
  const daily = await buildDailyStats();
  const periodDays = daily.filter((d) => inRange(d.date, from, to));

  const customers = await User.find({
    role: "customer",
    pendingBalance: { $gt: 0 },
    isRealUser: true
  }).select("pendingBalance name");

  const customerPendingTotal = customers.reduce(
    (sum, u) => sum + Number(u.pendingBalance || 0),
    0
  );

  const periods = ["today", "week", "month", "all"].reduce((acc, key) => {
    const range = getPeriodRange(key);
    const days = daily.filter((d) => inRange(d.date, range.from, range.to));
    acc[key] = { ...sumPeriod(days), from: range.from, to: range.to };
    return acc;
  }, {});

  return {
    businessStartDate: businessStart,
    today,
    period,
    range: { from, to },
    summary: periods[period] || sumPeriod(periodDays),
    periods,
    customerPendingTotal,
    customersWithPending: customers.length,
    daily: period === "all" ? daily : periodDays
  };
};

module.exports = {
  getBusinessStartDate,
  getMoneyManagementData,
  getPeriodRange,
  localToday
};
