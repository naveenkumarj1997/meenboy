const { getBusinessStartDate, getPeriodRange, localToday } = require("./moneyManagement");

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const resolveRange = (query = {}) => {
  const businessStart = getBusinessStartDate();
  const today = localToday();
  const period = String(query.period || "today").toLowerCase();

  if (period === "custom") {
    let from = String(query.from || today).slice(0, 10);
    let to = String(query.to || today).slice(0, 10);
    if (from > to) [from, to] = [to, from];
    if (from < businessStart) from = businessStart;
    if (to < businessStart) to = businessStart;
    if (to > today) to = today;
    if (from > to) from = to;
    return { from, to, period: "custom", businessStart, today };
  }

  const allowed = ["today", "week", "month", "all"];
  const safe = allowed.includes(period) ? period : "today";
  const range = getPeriodRange(safe);
  return {
    from: range.from,
    to: range.to,
    period: safe,
    businessStart: range.businessStart,
    today: range.today
  };
};

/**
 * Fish Friendly Calculations: real vs family (sister/brother) money for a date range.
 */
const getCalculationsData = async (query = {}) => {
  const Order = require("../models/Order");
  const DeliveryAssignment = require("../models/DeliveryAssignment");
  const DailyPurchase = require("../models/DailyPurchase");
  const PartnerSalary = require("../models/PartnerSalary");
  const PartnerPetrolAllowance = require("../models/PartnerPetrolAllowance");
  const WalkInSale = require("../models/WalkInSale");
  const ManualCollection = require("../models/ManualCollection");
  const Expense = require("../models/Expense");
  const User = require("../models/User");

  const { from, to, period, businessStart, today } = resolveRange(query);

  const familyUsers = await User.find({
    role: "customer",
    excludeFromEarnings: true
  })
    .select("_id name phone email pendingBalance")
    .lean();
  const familyIds = new Set(familyUsers.map((u) => String(u._id)));

  const assignments = await DeliveryAssignment.find({ status: "delivered" })
    .populate({
      path: "order",
      select: "deliveryDate total customer status",
      populate: { path: "customer", select: "name phone email excludeFromEarnings pendingBalance isRealUser" }
    })
    .populate({ path: "deliveryPartner", select: "name phone" })
    .lean();

  const customersById = {};
  const ensureCustomer = (id, meta = {}) => {
    const key = String(id || "unknown");
    if (!customersById[key]) {
      customersById[key] = {
        customerId: key === "unknown" ? null : key,
        name: meta.name || "Unknown",
        phone: meta.phone || "",
        email: meta.email || "",
        isFamily: Boolean(meta.isFamily),
        bookings: 0,
        collectedAtDelivery: 0,
        pendingOnOrders: 0,
        orderCount: 0,
        orders: []
      };
    }
    return customersById[key];
  };

  let bookingsAll = 0;
  let bookingsReal = 0;
  let bookingsFamily = 0;
  let collectedAll = 0;
  let collectedReal = 0;
  let collectedFamily = 0;
  let pendingOnOrdersReal = 0;
  let pendingOnOrdersFamily = 0;
  let deliveredOrderCount = 0;

  for (const a of assignments) {
    const order = a.order;
    if (!order || order.status === "cancelled") continue;
    const date = order.deliveryDate;
    if (!date || date < from || date > to) continue;

    const customerDoc = order.customer;
    const customerId = customerDoc?._id || order.customer;
    const isFamily =
      Boolean(customerDoc?.excludeFromEarnings) || familyIds.has(String(customerId));
    const orderTotal = round2(order.total);
    const collected = round2(a.paymentCollected);
    const pendingOnOrder = round2(Math.max(0, orderTotal - collected));
    const name =
      customerDoc?.name || "Unknown customer";

    bookingsAll += orderTotal;
    collectedAll += collected;
    deliveredOrderCount += 1;

    if (isFamily) {
      bookingsFamily += orderTotal;
      collectedFamily += collected;
      pendingOnOrdersFamily += pendingOnOrder;
    } else {
      bookingsReal += orderTotal;
      collectedReal += collected;
      pendingOnOrdersReal += pendingOnOrder;
    }

    const row = ensureCustomer(customerId, {
      name,
      phone: customerDoc?.phone || "",
      email: customerDoc?.email || "",
      isFamily
    });
    row.isFamily = row.isFamily || isFamily;
    row.bookings += orderTotal;
    row.collectedAtDelivery += collected;
    row.pendingOnOrders += pendingOnOrder;
    row.orderCount += 1;
    row.orders.push({
      orderId: order._id,
      assignmentId: a._id,
      deliveryDate: date,
      total: orderTotal,
      paymentCollected: collected,
      paymentMethod: a.paymentMethod || "none",
      pendingOnOrder,
      partnerName: a.deliveryPartner?.name || ""
    });
  }

  // Walk-in: billed vs cash actually collected (pending bills excluded from cash-in)
  const walkIns = await WalkInSale.find({
    saleDate: { $gte: from, $lte: to },
    status: { $ne: "cancelled" }
  })
    .select("saleDate total amountPaid paymentStatus paymentMethod billNumber customerName")
    .lean();
  let walkInSales = 0;
  let walkInCollected = 0;
  let walkInPending = 0;
  for (const sale of walkIns) {
    const total = round2(sale.total);
    let paid = Number(sale.amountPaid);
    if (!Number.isFinite(paid)) {
      paid = sale.paymentStatus === "pending" ? 0 : total;
    }
    paid = round2(Math.min(total, Math.max(0, paid)));
    walkInSales += total;
    walkInCollected += paid;
    walkInPending += round2(total - paid);
  }

  // Manual admin collections in range — split family vs real
  const manualRows = await ManualCollection.find({
    createdAt: {
      $gte: new Date(`${from}T00:00:00`),
      $lte: new Date(`${to}T23:59:59.999`)
    }
  })
    .populate({ path: "customer", select: "name phone excludeFromEarnings" })
    .lean();

  let manualReal = 0;
  let manualFamily = 0;
  const manualList = [];
  for (const row of manualRows) {
    const amount = round2(row.amount);
    const isFamily =
      Boolean(row.customer?.excludeFromEarnings) ||
      familyIds.has(String(row.customer?._id || row.customer));
    if (isFamily) manualFamily += amount;
    else manualReal += amount;
    manualList.push({
      id: row._id,
      amount,
      createdAt: row.createdAt,
      notes: row.notes || "",
      customerName: row.customer?.name || "Customer",
      isFamily
    });
  }

  // Costs
  const purchases = await DailyPurchase.find({ date: { $gte: from, $lte: to } }).lean();
  let totalPurchases = 0;
  let totalVendorSettled = 0;
  for (const p of purchases) {
    totalPurchases += round2(
      Number(p.chickenShop || 0) +
        Number(p.muttonShop || 0) +
        Number(p.fishCompany || 0) +
        Number(p.localFishShop || 0)
    );
    totalVendorSettled += round2(
      Number(p.chickenShopSettled || 0) +
        Number(p.muttonShopSettled || 0) +
        Number(p.fishCompanySettled || 0) +
        Number(p.localFishShopSettled || 0)
    );
  }

  const salaries = await PartnerSalary.find({ date: { $gte: from, $lte: to } }).lean();
  let partnerSalaries = 0;
  for (const s of salaries) partnerSalaries += round2(s.amount);

  const petrolRows = await PartnerPetrolAllowance.find({
    date: { $gte: from, $lte: to }
  }).lean();
  let petrolAllowances = 0;
  for (const p of petrolRows) petrolAllowances += round2(p.amount);

  const expenses = await Expense.find({ date: { $gte: from, $lte: to } }).lean();
  let otherExpenses = 0;
  for (const e of expenses) otherExpenses += round2(e.amount);

  const realCashIn =
    collectedReal + walkInCollected + manualReal;
  const paperFamilyCash = collectedFamily + manualFamily;
  const totalCosts =
    totalPurchases + partnerSalaries + petrolAllowances + otherExpenses;
  // Prefer purchase cost for profit; also show cash paid to vendors separately
  const actualFishFriendlyEarn = round2(realCashIn - totalCosts);
  const grossOnRealBookings = round2(
    bookingsReal + walkInSales - totalPurchases - partnerSalaries - petrolAllowances - otherExpenses
  );

  const customerList = Object.values(customersById)
    .map((c) => ({
      ...c,
      bookings: round2(c.bookings),
      collectedAtDelivery: round2(c.collectedAtDelivery),
      pendingOnOrders: round2(c.pendingOnOrders)
    }))
    .sort((a, b) => {
      if (a.isFamily !== b.isFamily) return a.isFamily ? 1 : -1;
      return b.bookings - a.bookings;
    });

  // Current ledger pending (real vs family) — snapshop now, not period
  const pendingUsers = await User.find({
    role: "customer",
    pendingBalance: { $gt: 0 },
    isRealUser: true
  })
    .select("name phone pendingBalance excludeFromEarnings")
    .lean();

  let ledgerPendingReal = 0;
  let ledgerPendingFamily = 0;
  for (const u of pendingUsers) {
    const amt = round2(u.pendingBalance);
    if (u.excludeFromEarnings) ledgerPendingFamily += amt;
    else ledgerPendingReal += amt;
  }

  return {
    period,
    range: { from, to },
    businessStartDate: businessStart,
    today,
    summary: {
      deliveredOrderCount,
      bookingsAll: round2(bookingsAll),
      bookingsReal: round2(bookingsReal),
      bookingsFamily: round2(bookingsFamily),
      collectedAll: round2(collectedAll),
      collectedReal: round2(collectedReal),
      collectedFamily: round2(collectedFamily),
      pendingOnOrdersReal: round2(pendingOnOrdersReal),
      pendingOnOrdersFamily: round2(pendingOnOrdersFamily),
      walkInSales: round2(walkInSales),
      walkInCollected: round2(walkInCollected),
      walkInPending: round2(walkInPending),
      walkInBills: walkIns.length,
      manualCollectionsReal: round2(manualReal),
      manualCollectionsFamily: round2(manualFamily),
      realCashIn: round2(realCashIn),
      paperFamilyCash: round2(paperFamilyCash),
      totalPurchases: round2(totalPurchases),
      totalVendorSettled: round2(totalVendorSettled),
      partnerSalaries: round2(partnerSalaries),
      petrolAllowances: round2(petrolAllowances),
      otherExpenses: round2(otherExpenses),
      totalCosts: round2(totalCosts),
      /** Real money in hand after costs (family marked-collected ignored) */
      actualFishFriendlyEarn,
      /** Bookings (real+walk-in) minus costs — ignores whether cash was collected */
      grossOnRealBookings,
      ledgerPendingReal: round2(ledgerPendingReal),
      ledgerPendingFamily: round2(ledgerPendingFamily)
    },
    customers: customerList,
    familyAccounts: familyUsers.map((u) => ({
      id: u._id,
      name: u.name,
      phone: u.phone || "",
      pendingBalance: round2(u.pendingBalance)
    })),
    manualCollections: manualList,
    walkIns: walkIns.map((w) => {
      const total = round2(w.total);
      let paid = Number(w.amountPaid);
      if (!Number.isFinite(paid)) {
        paid = w.paymentStatus === "pending" ? 0 : total;
      }
      paid = round2(Math.min(total, Math.max(0, paid)));
      return {
        id: w._id,
        saleDate: w.saleDate,
        total,
        amountPaid: paid,
        amountDue: round2(total - paid),
        paymentStatus: w.paymentStatus || (paid >= total ? "paid" : "pending"),
        billNumber: w.billNumber || "",
        customerName: w.customerName || ""
      };
    }),
    formula: {
      realCashIn:
        "COD/UPI from non-family deliveries + walk-in collected + admin collect (non-family)",
      totalCosts: "Purchases + partner salaries + petrol allowance + expenses (incl. cashier petty)",
      actualFishFriendlyEarn: "realCashIn − totalCosts",
      note: "Mark sister/brother customers as Family in Users so their admin-collect does not count as real earn. Unpaid walk-in bills stay in walk-in pending until Walk-in Accounts collects them."
    }
  };
};

module.exports = {
  getCalculationsData,
  resolveRange
};
