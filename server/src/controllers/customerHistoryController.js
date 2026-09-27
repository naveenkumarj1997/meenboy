const mongoose = require("mongoose");
const User = require("../models/User");
const Order = require("../models/Order");
const DeliveryAssignment = require("../models/DeliveryAssignment");
const ManualCollection = require("../models/ManualCollection");
const WalkInSale = require("../models/WalkInSale");

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const last10 = (phone) => String(phone || "").replace(/\D/g, "").slice(-10);

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Bills created before payment tracking have no paymentStatus and count as fully paid. */
const walkInPaidOf = (w) =>
  round2(w.paymentStatus ? Math.min(Number(w.total) || 0, Number(w.amountPaid) || 0) : w.total);

// @desc    Customers list with order counts (Users History picker)
// @route   GET /api/users/history/customers
const listHistoryCustomers = async (req, res, next) => {
  try {
    const customers = await User.find({ role: "customer" })
      .select("name phone email status isRealUser pendingBalance createdAt")
      .sort({ name: 1 })
      .lean();

    const stats = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: "$customer",
          orders: { $sum: 1 },
          spent: { $sum: "$total" },
          lastOrderDate: { $max: "$deliveryDate" }
        }
      }
    ]);
    const byId = {};
    stats.forEach((s) => {
      byId[String(s._id)] = s;
    });

    res.json({
      customers: customers.map((c) => {
        const s = byId[String(c._id)] || {};
        return {
          _id: String(c._id),
          name: c.name,
          phone: c.phone || "",
          email: c.email || "",
          status: c.status,
          isRealUser: c.isRealUser !== false,
          pendingBalance: round2(c.pendingBalance),
          joinedAt: c.createdAt,
          orderCount: s.orders || 0,
          totalSpent: round2(s.spent),
          lastOrderDate: s.lastOrderDate || null
        };
      })
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Full order + payment history for one customer
// @route   GET /api/users/:id/history
const getCustomerHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid customer id" });
    }
    const customer = await User.findById(id)
      .select("-password -documentData")
      .lean();
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const orders = await Order.find({ customer: id })
      .sort({ deliveryDate: -1, createdAt: -1 })
      .lean();
    const orderIds = orders.map((o) => o._id);

    const phone10 = last10(customer.phone);
    const [assignments, collections, walkIns] = await Promise.all([
      DeliveryAssignment.find({ order: { $in: orderIds } })
        .populate("deliveryPartner", "name phone")
        .lean(),
      ManualCollection.find({ customer: id }).populate("admin", "name").sort({ createdAt: -1 }).lean(),
      phone10.length === 10
        ? WalkInSale.find({ customerPhone: { $regex: `${escapeRegex(phone10)}$` } })
            .sort({ saleDate: -1, createdAt: -1 })
            .lean()
        : Promise.resolve([])
    ]);

    const assignmentByOrder = {};
    assignments.forEach((a) => {
      assignmentByOrder[String(a.order)] = a;
    });

    const itemAgg = {};
    const methodCount = {};
    const slotCount = {};
    let billed = 0;
    let paidAtDelivery = 0;
    let dueFromOrders = 0;
    let delivered = 0;
    let cancelled = 0;
    let upcoming = 0;

    const shapedOrders = orders.map((o) => {
      const a = assignmentByOrder[String(o._id)];
      const total = round2(o.total);
      const isDelivered = a?.status === "delivered" || o.status === "delivered";
      const collected = isDelivered ? round2(a?.paymentCollected) : 0;
      const due = isDelivered ? round2(Math.max(0, total - collected)) : 0;

      if (o.status === "cancelled") {
        cancelled += 1;
      } else {
        if (isDelivered) {
          delivered += 1;
          billed += total;
          paidAtDelivery += collected;
          dueFromOrders += due;
          if (a?.paymentMethod) methodCount[a.paymentMethod] = (methodCount[a.paymentMethod] || 0) + 1;
        } else {
          upcoming += 1;
        }
        if (o.deliveryTime) slotCount[o.deliveryTime] = (slotCount[o.deliveryTime] || 0) + 1;
        (o.items || []).forEach((it) => {
          const key = `${it.productName}${it.cutName ? ` (${it.cutName})` : ""}`;
          if (!itemAgg[key]) itemAgg[key] = { name: key, unit: it.unit || "kg", quantity: 0, amount: 0, times: 0 };
          itemAgg[key].quantity += Number(it.quantity) || 0;
          itemAgg[key].amount += Number(it.totalPrice) || 0;
          itemAgg[key].times += 1;
        });
      }

      return {
        _id: String(o._id),
        orderNo: String(o._id).slice(-6).toUpperCase(),
        status: o.status,
        bookingSource: o.bookingSource || "website",
        deliveryDate: o.deliveryDate,
        deliveryTime: o.deliveryTime,
        createdAt: o.createdAt,
        items: (o.items || []).map((it) => ({
          productName: it.productName,
          cutName: it.cutName || "",
          quantity: Number(it.quantity) || 0,
          unit: it.unit || "kg",
          unitPrice: round2(it.unitPrice),
          totalPrice: round2(it.totalPrice),
          notes: it.notes || ""
        })),
        subtotal: round2(o.subtotal),
        deliveryFee: round2(o.deliveryFee),
        discountAmount: round2(o.discountAmount),
        discountNote: o.discountNote || "",
        addonAmount: round2(o.addonAmount),
        addonNote: o.addonNote || "",
        total,
        customerNotes: o.customerNotes || "",
        address: o.address || null,
        delivery: a
          ? {
              status: a.status,
              partnerName: a.deliveryPartner?.name || "",
              partnerPhone: a.deliveryPartner?.phone || "",
              paymentMethod: a.paymentMethod || "none",
              paymentCollected: collected,
              deliveredAt: a.deliveredLocation?.capturedAt || a.actualArrival || (a.status === "delivered" ? a.updatedAt : null),
              notes: a.notes || ""
            }
          : null,
        due
      };
    });

    const collectedLater = round2(collections.reduce((s, c) => s + (Number(c.amount) || 0), 0));

    const activeWalkIns = walkIns.filter((w) => w.status !== "cancelled");
    const walkInBilled = round2(activeWalkIns.reduce((s, w) => s + (Number(w.total) || 0), 0));
    const walkInPaid = round2(activeWalkIns.reduce((s, w) => s + walkInPaidOf(w), 0));

    const topBy = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const activeOrders = shapedOrders.filter((o) => o.status !== "cancelled");
    const dates = activeOrders.map((o) => o.deliveryDate).filter(Boolean).sort();

    res.json({
      customer: {
        _id: String(customer._id),
        name: customer.name,
        phone: customer.phone || "",
        alternatePhone: customer.alternatePhone || "",
        email: customer.email || "",
        status: customer.status,
        isRealUser: customer.isRealUser !== false,
        excludeFromEarnings: Boolean(customer.excludeFromEarnings),
        address: customer.address || null,
        mapUrl: customer.mapUrl || "",
        joinedAt: customer.createdAt,
        pendingBalance: round2(customer.pendingBalance)
      },
      stats: {
        totalOrders: orders.length,
        deliveredOrders: delivered,
        cancelledOrders: cancelled,
        upcomingOrders: upcoming,
        totalBilled: round2(billed),
        paidAtDelivery: round2(paidAtDelivery),
        collectedLater,
        totalPaid: round2(paidAtDelivery + collectedLater),
        dueFromOrders: round2(dueFromOrders),
        pendingBalance: round2(customer.pendingBalance),
        avgOrderValue: delivered ? round2(billed / delivered) : 0,
        firstOrderDate: dates[0] || null,
        lastOrderDate: dates[dates.length - 1] || null,
        favouritePaymentMethod: topBy(methodCount),
        favouriteSlot: topBy(slotCount),
        walkInBills: activeWalkIns.length,
        walkInBilled,
        walkInPaid
      },
      topItems: Object.values(itemAgg)
        .map((i) => ({ ...i, quantity: round2(i.quantity), amount: round2(i.amount) }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10),
      orders: shapedOrders,
      collections: collections.map((c) => ({
        _id: String(c._id),
        amount: round2(c.amount),
        paymentMethod: c.paymentMethod || "manual",
        notes: c.notes || "",
        adminName: c.admin?.name || "Admin",
        collectedAt: c.createdAt
      })),
      walkIns: walkIns.map((w) => ({
        _id: String(w._id),
        billNumber: w.billNumber || String(w._id).slice(-6).toUpperCase(),
        saleDate: w.saleDate,
        status: w.status || "active",
        total: round2(w.total),
        amountPaid: walkInPaidOf(w),
        paymentStatus: w.paymentStatus || "paid",
        paymentMethod: w.paymentMethod || "",
        items: (w.items || []).map((it) => ({
          productName: it.productName,
          quantity: Number(it.quantity) || 0,
          unit: it.unit || "kg",
          totalPrice: round2(it.totalPrice)
        }))
      }))
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { listHistoryCustomers, getCustomerHistory };
