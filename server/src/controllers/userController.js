const User = require("../models/User");
const Order = require("../models/Order");
const { isFullAdmin } = require("../utils/adminSections");

const DOC_TYPE_LABELS = {
  aadhaar: "Aadhaar",
  dl: "Driving License",
  rc: "RC Book",
  voter_id: "Voter ID"
};

// @desc    Get all users (customers, delivery_partners, admins)
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = async (req, res, next) => {
  try {
    const { role, realOnly } = req.query;
    const query = role ? { role } : {};

    if (String(realOnly).toLowerCase() === "true") {
      query.isRealUser = true;
      query.status = { $ne: "blocked" };
    }
    
    // Don't fetch passwords or heavy document binary
    const users = await User.find(query)
      .select("-password -documentData")
      .sort({ createdAt: -1 })
      .lean();

    const shaped = users.map((u) => ({
      ...u,
      hasDocument: Boolean(u.documentUploadedAt || u.documentFileName || u.documentUrl),
      documentTypeLabel: DOC_TYPE_LABELS[u.documentType] || u.documentType || ""
    }));

    res.json({ users: shaped });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user details
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, status, phone, alternatePhone, mapUrl, address, password, isNoticed } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Only full admins can create/promote admins or edit other admins
    const promotingToAdmin = role === "admin" && user.role !== "admin";
    const editingAdmin = user.role === "admin";
    const changingAdminSections = req.body.adminSections !== undefined;
    if ((promotingToAdmin || editingAdmin || changingAdminSections) && !isFullAdmin(req.user)) {
      return res.status(403).json({
        message: "Only full admins can manage admin accounts. Use Manage Admins."
      });
    }
    if (promotingToAdmin) {
      return res.status(400).json({
        message: "Create admins from Manage Admins so you can set section access"
      });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (status) user.status = status;
    if (phone !== undefined) user.phone = phone;
    if (alternatePhone !== undefined) {
      user.alternatePhone = String(alternatePhone || "").trim();
    }
    if (mapUrl !== undefined) {
      user.mapUrl = String(mapUrl || "").trim();
    }
    if (address !== undefined) user.address = address;
    if (password) user.password = password;
    if (isNoticed !== undefined) user.isNoticed = isNoticed;
    if (req.body.isRealUser !== undefined) user.isRealUser = Boolean(req.body.isRealUser);
    if (req.body.adminPreferences?.usersAccountFilter) {
      if (!user.adminPreferences) user.adminPreferences = {};
      user.adminPreferences.usersAccountFilter = req.body.adminPreferences.usersAccountFilter;
    }

    const updatedUser = await user.save();

    // Keep delivery partner / reports in sync: orders store their own mapUrl + alternate phone
    if (updatedUser.role === "customer") {
      const orderSync = {};
      if (mapUrl !== undefined) {
        orderSync.mapUrl = updatedUser.mapUrl || "";
      }
      if (alternatePhone !== undefined) {
        orderSync["address.alternatePhone"] = updatedUser.alternatePhone || "";
      }
      if (Object.keys(orderSync).length > 0) {
        await Order.updateMany(
          { customer: updatedUser._id, status: { $ne: "cancelled" } },
          { $set: orderSync }
        );
      }
    }

    // Remove password from response
    updatedUser.password = undefined;

    res.json({ user: updatedUser, message: "User updated successfully" });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.deleteOne();

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// @desc    Get users with pending payments
// @route   GET /api/users/pending-payments
// @access  Private/Admin
const getPendingPayments = async (req, res, next) => {
  try {
    const users = await User.find({ pendingBalance: { $gt: 0 }, isRealUser: true })
      .select("-password")
      .sort({ pendingBalance: -1 });

    res.json({ users });
  } catch (error) {
    next(error);
  }
};

// @desc    Collect a pending payment manually
// @route   POST /api/users/:id/collect-payment
// @access  Private/Admin
const collectPendingPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    let amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid collection amount" });
    }

    // Money in 2 decimals
    amount = Math.round(amount * 100) / 100;

    const existing = await User.findById(id).select("name pendingBalance");
    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }

    const pending = Math.round((Number(existing.pendingBalance) || 0) * 100) / 100;
    if (pending <= 0) {
      return res.status(400).json({ message: "No pending balance to collect" });
    }
    if (amount > pending) {
      return res.status(400).json({
        message: `Cannot collect ₹${amount.toFixed(2)}. Pending balance is only ₹${pending.toFixed(2)}`
      });
    }

    // Atomic deduct — blocks double-click / race that would wipe remaining balance
    // and create duplicate ManualCollection rows
    const user = await User.findOneAndUpdate(
      { _id: id, pendingBalance: { $gte: amount } },
      { $inc: { pendingBalance: -amount } },
      { new: true }
    );

    if (!user) {
      return res.status(409).json({
        message: "Balance changed or payment already collected. Refresh and try again."
      });
    }

    // Clean float leftovers (e.g. 249.999999 → 250.00 / 0)
    const remaining = Math.max(0, Math.round((Number(user.pendingBalance) || 0) * 100) / 100);
    if (remaining !== user.pendingBalance) {
      user.pendingBalance = remaining;
      await user.save();
    }

    const ManualCollection = require("../models/ManualCollection");
    await ManualCollection.create({
      customer: user._id,
      admin: req.user._id,
      amount
    });

    user.password = undefined;

    res.json({
      user,
      message: "Payment collected successfully",
      collectedAmount: amount,
      remainingPending: user.pendingBalance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all manually collected payments
// @route   GET /api/users/collected-payments
// @access  Private/Admin
const getCollectedPayments = async (req, res, next) => {
  try {
    const ManualCollection = require("../models/ManualCollection");
    const collections = await ManualCollection.find()
      .populate("customer", "name phone email")
      .populate("admin", "name email")
      .sort({ createdAt: -1 });
      
    res.json({ collections });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a mistaken manual collection and restore pending balance
// @route   DELETE /api/users/collected-payments/:collectionId
// @access  Private/Admin
const deleteCollectedPayment = async (req, res, next) => {
  try {
    const ManualCollection = require("../models/ManualCollection");
    const collection = await ManualCollection.findById(req.params.collectionId);
    if (!collection) {
      return res.status(404).json({ message: "Collection record not found" });
    }

    const amount = Math.round((Number(collection.amount) || 0) * 100) / 100;
    const customerId = collection.customer;

    await collection.deleteOne();

    if (amount > 0 && customerId) {
      await User.findByIdAndUpdate(customerId, {
        $inc: { pendingBalance: amount }
      });
      const user = await User.findById(customerId).select("pendingBalance");
      if (user) {
        user.pendingBalance = Math.max(
          0,
          Math.round((Number(user.pendingBalance) || 0) * 100) / 100
        );
        await user.save();
      }
    }

    res.json({
      message: "Collection deleted and amount restored to pending balance",
      restoredAmount: amount
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get date-wise breakdown of user's pending payments
// @route   GET /api/users/me/pending-breakdown
// @access  Private
const getMyPendingBreakdown = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const totalPending = user.pendingBalance || 0;
    
    if (totalPending <= 0) {
      return res.json({ totalPending: 0, breakdown: [] });
    }

    // Fetch all delivered assignments for the user's orders
    // Note: Since DeliveryAssignment is linked to Order, and Order has customer.
    // We need to find orders by this customer first.
    const Order = require("../models/Order");
    const userOrders = await Order.find({ customer: req.user._id }).select("_id deliveryDate total");
    const orderIds = userOrders.map(o => o._id);

    const DeliveryAssignment = require("../models/DeliveryAssignment");
    const assignments = await DeliveryAssignment.find({
      order: { $in: orderIds },
      status: "delivered"
    }).populate("order", "deliveryDate total");

    // Calculate all debts generated
    const allDebts = [];
    let totalGeneratedDebt = 0;

    assignments.forEach(assignment => {
      const orderTotal = assignment.order.total;
      const collected = assignment.paymentCollected || 0;
      const debt = orderTotal - collected;

      if (debt > 0) {
        allDebts.push({
          date: assignment.order.deliveryDate,
          amount: debt,
          createdAt: assignment.updatedAt // Use updatedAt as the time the debt was finalized
        });
        totalGeneratedDebt += debt;
      }
    });

    // Sort oldest first
    allDebts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Calculate how much has been repaid
    const repaidAmount = Math.max(0, totalGeneratedDebt - totalPending);
    
    let currentRepaid = repaidAmount;
    const breakdown = [];

    // Deduct repayments from oldest debts first
    for (const debt of allDebts) {
      if (currentRepaid >= debt.amount) {
        currentRepaid -= debt.amount;
      } else {
        const remainingDue = debt.amount - currentRepaid;
        currentRepaid = 0;
        
        // Group by date
        const existing = breakdown.find(b => b.date === debt.date);
        if (existing) {
          existing.amount += remainingDue;
        } else {
          breakdown.push({
            date: debt.date,
            amount: remainingDue
          });
        }
      }
    }

    res.json({ totalPending, breakdown });
  } catch (error) {
    next(error);
  }
};

const getMyOrderPaymentStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const Order = require("../models/Order");
    const DeliveryAssignment = require("../models/DeliveryAssignment");

    const userOrders = await Order.find({ customer: req.user._id }).select("_id deliveryDate total createdAt").sort({ createdAt: -1 });
    const orderIds = userOrders.map(o => o._id);

    const assignments = await DeliveryAssignment.find({
      order: { $in: orderIds },
      status: "delivered"
    }).populate("order", "_id deliveryDate total createdAt");

    const totalPending = user.pendingBalance || 0;
    const allDebts = [];
    let totalGeneratedDebt = 0;

    assignments.forEach(assignment => {
      const orderTotal = assignment.order.total;
      const collected = assignment.paymentCollected || 0;
      const debt = orderTotal - collected;

      if (debt > 0) {
        allDebts.push({
          orderId: assignment.order._id,
          orderTotal: orderTotal,
          collectedAtDelivery: collected,
          debtAmount: debt,
          createdAt: assignment.updatedAt,
          date: assignment.order.deliveryDate
        });
        totalGeneratedDebt += debt;
      }
    });

    allDebts.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const repaidAmount = Math.max(0, totalGeneratedDebt - totalPending);
    let currentRepaid = repaidAmount;

    const orderStatuses = [];

    userOrders.forEach(order => {
      const assignment = assignments.find(a => a.order._id.toString() === order._id.toString());
      if (!assignment) {
        orderStatuses.push({
          orderId: order._id,
          date: order.deliveryDate,
          total: order.total,
          amountPaid: 0,
          amountDue: order.total,
          status: "Pending Delivery"
        });
      } else {
        const debtObj = allDebts.find(d => d.orderId.toString() === order._id.toString());
        if (!debtObj) {
          orderStatuses.push({
            orderId: order._id,
            date: order.deliveryDate,
            total: order.total,
            amountPaid: order.total,
            amountDue: 0,
            status: "Paid"
          });
        }
      }
    });

    for (const debt of allDebts) {
      let allocatedRepayment = 0;
      if (currentRepaid >= debt.debtAmount) {
        allocatedRepayment = debt.debtAmount;
        currentRepaid -= debt.debtAmount;
      } else if (currentRepaid > 0) {
        allocatedRepayment = currentRepaid;
        currentRepaid = 0;
      }

      const totalPaidForOrder = debt.collectedAtDelivery + allocatedRepayment;
      const amountDue = debt.orderTotal - totalPaidForOrder;
      
      let status = "Unpaid";
      if (amountDue === 0) status = "Paid";
      else if (totalPaidForOrder > 0) status = "Partially Paid";

      orderStatuses.push({
        orderId: debt.orderId,
        date: debt.date,
        total: debt.orderTotal,
        amountPaid: totalPaidForOrder,
        amountDue: amountDue,
        status: status
      });
    }

    orderStatuses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({ orderStatuses });
  } catch (error) {
    next(error);
  }
};


// @desc    Get order-wise breakdown of a specific user's pending payments
// @route   GET /api/users/:id/pending-breakdown
// @access  Private/Admin
const getUserPendingBreakdown = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const totalPending = user.pendingBalance || 0;

    const Order = require("../models/Order");
    const ManualCollection = require("../models/ManualCollection");
    const userOrders = await Order.find({ customer: user._id }).select("_id deliveryDate total");
    const orderIds = userOrders.map((o) => o._id);

    const DeliveryAssignment = require("../models/DeliveryAssignment");
    const assignments = await DeliveryAssignment.find({
      order: { $in: orderIds },
      status: "delivered"
    }).populate("order", "deliveryDate total");

    const allDebts = [];
    let totalGeneratedDebt = 0;

    assignments.forEach((assignment) => {
      if (!assignment.order) return;
      const orderTotal = Number(assignment.order.total) || 0;
      const collectedAtDelivery = Number(assignment.paymentCollected) || 0;
      const originalDebt = Math.max(0, orderTotal - collectedAtDelivery);

      if (originalDebt > 0) {
        allDebts.push({
          orderId: assignment.order._id,
          date: assignment.order.deliveryDate,
          orderTotal,
          collectedAtDelivery,
          originalDebt,
          paymentMethod: assignment.paymentMethod,
          createdAt: assignment.updatedAt
        });
        totalGeneratedDebt += originalDebt;
      }
    });

    allDebts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Amount admin collected later (manual collections), allocated oldest debt first
    const repaidAmount = Math.max(0, totalGeneratedDebt - totalPending);
    let currentRepaid = repaidAmount;
    const breakdown = [];

    for (const debt of allDebts) {
      let adminCollected = 0;
      if (currentRepaid >= debt.originalDebt) {
        adminCollected = debt.originalDebt;
        currentRepaid -= debt.originalDebt;
      } else if (currentRepaid > 0) {
        adminCollected = currentRepaid;
        currentRepaid = 0;
      }

      const remainingDue = Math.max(0, debt.originalDebt - adminCollected);

      // Show all debts that still have remaining OR had admin collection applied,
      // so admin can understand the calculation even after partial repayment.
      if (remainingDue > 0 || adminCollected > 0) {
        breakdown.push({
          orderId: debt.orderId,
          date: debt.date,
          orderTotal: debt.orderTotal,
          collectedAtDelivery: debt.collectedAtDelivery,
          originalDebt: debt.originalDebt,
          adminCollected,
          amount: remainingDue,
          paymentMethod: debt.paymentMethod
        });
      }
    }

    const adminCollections = await ManualCollection.find({ customer: user._id })
      .populate("admin", "name")
      .sort({ createdAt: -1 })
      .lean();

    const totalAdminCollected = adminCollections.reduce(
      (sum, c) => sum + (Number(c.amount) || 0),
      0
    );

    res.json({
      totalPending,
      totalGeneratedDebt,
      totalAdminCollected,
      breakdown,
      adminCollections: adminCollections.map((c) => ({
        amount: c.amount,
        collectedAt: c.createdAt,
        adminName: c.admin?.name || "Admin",
        notes: c.notes || ""
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get partner salaries and delivery stats by date
// @route   GET /api/users/partner-salaries/:date
// @access  Private/Admin
const getPartnerSalariesByDate = async (req, res, next) => {
  try {
    const { date } = req.params; // Expected format: YYYY-MM-DD
    
    // 1. Find all Orders for this date
    const Order = require("../models/Order");
    const ordersForDate = await Order.find({ deliveryDate: date }).select("_id");
    const orderIds = ordersForDate.map(o => o._id);
    
    // 2. Find DeliveryAssignments for these orders
    const DeliveryAssignment = require("../models/DeliveryAssignment");
    const assignments = await DeliveryAssignment.find({
      order: { $in: orderIds }
    }).populate("deliveryPartner", "name phone email");
    
    // 3. Aggregate data per delivery partner
    const partnerMap = {}; // key: partnerId
    
    for (const assignment of assignments) {
      if (!assignment.deliveryPartner) continue;
      
      const pId = assignment.deliveryPartner._id.toString();
      
      if (!partnerMap[pId]) {
        partnerMap[pId] = {
          partnerId: pId,
          name: assignment.deliveryPartner.name,
          phone: assignment.deliveryPartner.phone,
          deliveredCount: 0,
          failedCount: 0,
          codCollected: 0,
          upiCollected: 0,
          salaryAmount: 0, // Default, will override below if found
          partnerConfirmed: false
        };
      }
      
      const pData = partnerMap[pId];
      
      if (assignment.status === "delivered") pData.deliveredCount += 1;
      if (assignment.status === "failed") pData.failedCount += 1;
      
      // Calculate collections for delivered/partially collected
      if (assignment.paymentCollected > 0) {
        // "cash", "partial_cash" -> goes to codCollected
        // "upi", "partial_upi" -> goes to upiCollected
        if (assignment.paymentMethod === "cash" || assignment.paymentMethod === "partial_cash") {
          pData.codCollected += assignment.paymentCollected;
        } else if (assignment.paymentMethod === "upi" || assignment.paymentMethod === "partial_upi") {
          pData.upiCollected += assignment.paymentCollected;
        }
      }
    }
    
    const partnerIds = Object.keys(partnerMap);
    
    // 4. Fetch saved salaries for these partners on this date
    const PartnerSalary = require("../models/PartnerSalary");
    const salaries = await PartnerSalary.find({
      date,
      deliveryPartner: { $in: partnerIds }
    });
    
    for (const salary of salaries) {
      const pId = salary.deliveryPartner.toString();
      if (partnerMap[pId]) {
        partnerMap[pId].salaryAmount = salary.amount;
        partnerMap[pId].partnerConfirmed = salary.partnerConfirmed;
      }
    }
    
    res.json({ stats: Object.values(partnerMap) });
  } catch (error) {
    next(error);
  }
};

// @desc    Partner collection + salary history (for admin)
// @route   GET /api/users/partner-collection-history/:partnerId
// @access  Private/Admin
const getPartnerCollectionHistory = async (req, res, next) => {
  try {
    const { partnerId } = req.params;
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 90);

    const Order = require("../models/Order");
    const DeliveryAssignment = require("../models/DeliveryAssignment");
    const PartnerSalary = require("../models/PartnerSalary");

    const assignments = await DeliveryAssignment.find({ deliveryPartner: partnerId })
      .populate({
        path: "order",
        select: "deliveryDate total"
      })
      .lean();

    const byDate = {};

    for (const a of assignments) {
      const date = a.order?.deliveryDate;
      if (!date) continue;

      if (!byDate[date]) {
        byDate[date] = {
          date,
          deliveryCount: 0,
          deliveredCount: 0,
          codCollected: 0,
          upiCollected: 0,
          totalCollected: 0,
          totalOrderAmount: 0,
          totalPending: 0,
          salaryAmount: 0
        };
      }

      const row = byDate[date];
      const orderTotal = Number(a.order?.total || 0);
      const collected = a.status === "delivered" ? Number(a.paymentCollected || 0) : 0;
      const pending =
        a.status === "delivered" ? Math.max(0, orderTotal - collected) : orderTotal;

      row.deliveryCount += 1;
      row.totalOrderAmount += orderTotal;
      row.totalPending += pending;

      if (a.status === "delivered") {
        row.deliveredCount += 1;
        row.totalCollected += collected;
        if (a.paymentMethod === "cash" || a.paymentMethod === "partial_cash") {
          row.codCollected += collected;
        } else if (a.paymentMethod === "upi" || a.paymentMethod === "partial_upi") {
          row.upiCollected += collected;
        }
      }
    }

    const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a)).slice(0, limit);

    const salaries = await PartnerSalary.find({
      deliveryPartner: partnerId,
      date: { $in: dates }
    }).lean();

    const salaryByDate = {};
    salaries.forEach((s) => {
      salaryByDate[s.date] = Number(s.amount || 0);
    });

    const history = dates.map((date) => ({
      ...byDate[date],
      salaryAmount: salaryByDate[date] || 0,
      netAfterSalary: byDate[date].totalCollected - (salaryByDate[date] || 0)
    }));

    res.json({ history });
  } catch (error) {
    next(error);
  }
};

// @desc    Save partner salary for a specific date
// @route   POST /api/users/partner-salaries
// @access  Private/Admin
const savePartnerSalary = async (req, res, next) => {
  try {
    const { date, partnerId, amount } = req.body;
    
    if (!date || !partnerId) {
      return res.status(400).json({ message: "Date and Partner ID are required" });
    }
    
    const PartnerSalary = require("../models/PartnerSalary");
    
    const salary = await PartnerSalary.findOneAndUpdate(
      { date, deliveryPartner: partnerId },
      { 
        amount: Number(amount) || 0,
        updatedBy: req.user._id
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    
    res.json({ salary, message: "Salary saved successfully" });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current delivery partner's earnings
// @route   GET /api/users/me/earnings
// @access  Private/Delivery Partner
const getMyEarnings = async (req, res, next) => {
  try {
    const partnerId = req.user._id;

    const DeliveryAssignment = require("../models/DeliveryAssignment");
    const assignments = await DeliveryAssignment.find({
      deliveryPartner: partnerId
    }).populate("order", "deliveryDate");

    const dailyStats = {}; // key: YYYY-MM-DD

    for (const assignment of assignments) {
      if (!assignment.order || !assignment.order.deliveryDate) continue;
      
      const date = assignment.order.deliveryDate;
      
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date: date,
          deliveredCount: 0,
          failedCount: 0,
          codCollected: 0,
          upiCollected: 0,
          salaryEarned: 0,
          partnerConfirmed: false
        };
      }
      
      const stat = dailyStats[date];
      
      if (assignment.status === "delivered") stat.deliveredCount += 1;
      if (assignment.status === "failed") stat.failedCount += 1;
      
      if (assignment.paymentCollected > 0) {
        if (assignment.paymentMethod === "cash" || assignment.paymentMethod === "partial_cash") {
          stat.codCollected += assignment.paymentCollected;
        } else if (assignment.paymentMethod === "upi" || assignment.paymentMethod === "partial_upi") {
          stat.upiCollected += assignment.paymentCollected;
        }
      }
    }

    const dates = Object.keys(dailyStats);

    const PartnerSalary = require("../models/PartnerSalary");
    const salaries = await PartnerSalary.find({
      deliveryPartner: partnerId,
      date: { $in: dates }
    });

    for (const salary of salaries) {
      if (dailyStats[salary.date]) {
        dailyStats[salary.date].salaryEarned = salary.amount;
        dailyStats[salary.date].partnerConfirmed = salary.partnerConfirmed;
      }
    }

    const results = Object.values(dailyStats).sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ earnings: results });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm salary collection
// @route   POST /api/users/me/earnings/:date/confirm
// @access  Private/Delivery Partner
const confirmSalaryCollection = async (req, res, next) => {
  try {
    const { date } = req.params;
    const partnerId = req.user._id;

    const PartnerSalary = require("../models/PartnerSalary");
    const salary = await PartnerSalary.findOne({ date, deliveryPartner: partnerId });

    if (!salary) {
      return res.status(404).json({ message: "No salary record found for this date" });
    }

    salary.partnerConfirmed = true;
    await salary.save();

    res.json({ message: "Salary collection confirmed successfully", salary });
  } catch (error) {
    next(error);
  }
};

// @desc    View partner verification PDF from DB
// @route   GET /api/users/:id/document
// @access  Private/Admin (or the partner themselves)
const getPartnerDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === "admin";
    const isSelf = String(req.user._id) === String(id);

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: "Not authorized to view this document" });
    }

    const user = await User.findById(id).select("+documentData");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.documentData || !user.documentData.length) {
      return res.status(404).json({ message: "No document uploaded for this partner" });
    }

    const fileName = user.documentFileName || `${user.documentType || "document"}.pdf`;
    res.setHeader("Content-Type", user.documentMimeType || "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${fileName.replace(/"/g, "")}"`);
    res.setHeader("Content-Length", user.documentData.length);
    res.send(user.documentData);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete partner verification PDF from DB (free storage)
// @route   DELETE /api/users/:id/document
// @access  Private/Admin
const deletePartnerDocument = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.updateOne(
      { _id: user._id },
      {
        $unset: { documentData: "", documentUploadedAt: "" },
        $set: {
          documentMimeType: "",
          documentFileName: "",
          documentType: "",
          documentUrl: ""
        }
      }
    );

    res.json({
      message: "Document deleted from database successfully",
      hasDocument: false
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  updateUser,
  deleteUser,
  getPendingPayments,
  collectPendingPayment,
  getCollectedPayments,
  deleteCollectedPayment,
  getMyPendingBreakdown,
  getUserPendingBreakdown,
  getPartnerSalariesByDate,
  getPartnerCollectionHistory,
  savePartnerSalary,
  getMyEarnings,
  confirmSalaryCollection,
  getMyOrderPaymentStatus,
  getPartnerDocument,
  deletePartnerDocument
};
