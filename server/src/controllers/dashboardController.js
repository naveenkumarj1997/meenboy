const Product = require("../models/Product");
const Order = require("../models/Order");
const User = require("../models/User");
const DeliveryAssignment = require("../models/DeliveryAssignment");
const TodayCatch = require("../models/TodayCatch");
const PartnerSalary = require("../models/PartnerSalary");
const PartnerPetrolAllowance = require("../models/PartnerPetrolAllowance");

const localYmd = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const addDaysYmd = (ymd, delta) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return localYmd(dt);
};

const sumCollectedByMethod = (assignments) => {
  let cash = 0;
  let upi = 0;
  for (const a of assignments) {
    const amt = Number(a.paymentCollected || 0);
    if (!(amt > 0)) continue;
    const method = String(a.paymentMethod || "");
    if (method === "cash" || method === "partial_cash") cash += amt;
    else if (method === "upi" || method === "partial_upi") upi += amt;
  }
  return {
    cash: Math.round(cash * 100) / 100,
    upi: Math.round(upi * 100) / 100,
    total: Math.round((cash + upi) * 100) / 100
  };
};

const getAdminOverview = async (req, res, next) => {
  try {
    let date =
      typeof req.query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date.trim())
        ? req.query.date.trim()
        : localYmd();

    const weekStart = addDaysYmd(date, -6);

    const [
      totalProducts,
      activeProducts,
      activeOrders,
      revenueAllTimeAgg,
      newCustomers,
      pendingPartners,
      pendingPaymentUsers,
      todayOrders,
      todayCatch,
      weekOrders,
      salariesToday,
      petrolToday
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments({
        status: { $in: ["pending", "confirmed", "preparing", "out_for_delivery"] }
      }),
      Order.aggregate([
        { $match: { status: "delivered" } },
        { $group: { _id: null, total: { $sum: "$total" } } }
      ]),
      User.countDocuments({
        role: "customer",
        isRealUser: true,
        status: { $ne: "blocked" },
        isNoticed: false
      }),
      User.countDocuments({
        role: "delivery_partner",
        isRealUser: true,
        status: "pending"
      }),
      User.find({
        role: "customer",
        isRealUser: true,
        pendingBalance: { $gt: 0 }
      })
        .select("pendingBalance")
        .lean(),
      Order.find({
        deliveryDate: date,
        status: { $ne: "cancelled" }
      })
        .select("_id status bookingSource total")
        .lean(),
      TodayCatch.findOne({ key: "default" }).lean(),
      Order.find({
        deliveryDate: { $gte: weekStart, $lte: date },
        status: { $ne: "cancelled" }
      })
        .select("_id deliveryDate status total")
        .lean(),
      PartnerSalary.find({ date }).lean(),
      PartnerPetrolAllowance.find({ date }).lean()
    ]);

    const todayOrderIds = todayOrders.map((o) => o._id);
    const weekOrderIdSet = new Set(weekOrders.map((o) => String(o._id)));

    const [scopedTodayAssignments, scopedWeekAssignments] = await Promise.all([
      todayOrderIds.length
        ? DeliveryAssignment.find({ order: { $in: todayOrderIds } }).lean()
        : Promise.resolve([]),
      weekOrders.length
        ? DeliveryAssignment.find({
            order: { $in: weekOrders.map((o) => o._id) }
          }).lean()
        : Promise.resolve([])
    ]);

    const assignedTodayIds = new Set(
      scopedTodayAssignments.map((a) => String(a.order?._id || a.order))
    );
    const unassignedToday = todayOrders.filter((o) => !assignedTodayIds.has(String(o._id))).length;

    const deliveredToday = todayOrders.filter((o) => o.status === "delivered").length;
    const remainingToday = todayOrders.filter((o) => o.status !== "delivered").length;

    const assignmentNotDoneToday = scopedTodayAssignments.filter(
      (a) => !["delivered", "failed", "cancelled"].includes(a.status)
    ).length;

    const bookingManual = todayOrders.filter((o) => o.bookingSource === "manual").length;
    const bookingWebsite = todayOrders.filter((o) => o.bookingSource !== "manual").length;

    const revenueToday = todayOrders
      .filter((o) => o.status === "delivered")
      .reduce((s, o) => s + Number(o.total || 0), 0);

    const revenueWeek = weekOrders
      .filter((o) => o.status === "delivered")
      .reduce((s, o) => s + Number(o.total || 0), 0);

    const todayCollect = sumCollectedByMethod(scopedTodayAssignments);
    const weekCollect = sumCollectedByMethod(
      scopedWeekAssignments.filter((a) => weekOrderIdSet.has(String(a.order?._id || a.order)))
    );

    const pendingPaymentCustomers = pendingPaymentUsers.length;
    const pendingPaymentAmount = Math.round(
      pendingPaymentUsers.reduce((s, u) => s + Number(u.pendingBalance || 0), 0) * 100
    ) / 100;

    const salaryUnconfirmed = salariesToday.filter(
      (s) => Number(s.amount) > 0 && !s.partnerConfirmed
    );
    const petrolUnconfirmed = petrolToday.filter(
      (p) => Number(p.amount) > 0 && !p.partnerConfirmed
    );

    const catchEnabled = todayCatch?.enabled === true;
    const catchItems = Array.isArray(todayCatch?.items) ? todayCatch.items : [];
    const catchItemCount = catchEnabled ? catchItems.length : 0;
    const catchStockQty = catchEnabled
      ? Math.round(
          catchItems.reduce((s, i) => s + (Number(i.availableQty) > 0 ? Number(i.availableQty) : 0), 0) *
            100
        ) / 100
      : 0;

    const revenueAllTime = revenueAllTimeAgg.length > 0 ? revenueAllTimeAgg[0].total : 0;

    res.json({
      date,
      weekStart,
      summary: {
        totalProducts,
        activeProducts,
        activeOrders,
        revenueAllTime: Math.round(Number(revenueAllTime || 0) * 100) / 100,
        revenueToday: Math.round(revenueToday * 100) / 100,
        revenueWeek: Math.round(revenueWeek * 100) / 100
      },
      attention: {
        newCustomers,
        pendingPartners,
        unassignedToday,
        notDeliveredToday: remainingToday,
        assignmentPendingToday: assignmentNotDoneToday,
        pendingPaymentCustomers,
        pendingPaymentAmount
      },
      today: {
        ordersTotal: todayOrders.length,
        ordersDelivered: deliveredToday,
        ordersRemaining: remainingToday,
        bookingManual,
        bookingWebsite,
        catchEnabled,
        catchItemCount,
        catchStockQty
      },
      money: {
        todayCash: todayCollect.cash,
        todayUpi: todayCollect.upi,
        todayCollected: todayCollect.total,
        weekCash: weekCollect.cash,
        weekUpi: weekCollect.upi,
        weekCollected: weekCollect.total,
        salaryUnconfirmedCount: salaryUnconfirmed.length,
        salaryUnconfirmedAmount:
          Math.round(salaryUnconfirmed.reduce((s, x) => s + Number(x.amount || 0), 0) * 100) / 100,
        petrolUnconfirmedCount: petrolUnconfirmed.length,
        petrolUnconfirmedAmount:
          Math.round(petrolUnconfirmed.reduce((s, x) => s + Number(x.amount || 0), 0) * 100) / 100
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminOverview
};
