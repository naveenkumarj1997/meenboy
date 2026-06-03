const User = require("../models/User");

// @desc    Get all users (customers, delivery_partners, admins)
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    const query = role ? { role } : {};
    
    // Don't fetch passwords
    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({ users });
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
    const { name, email, role, status, phone, mapUrl, address, password, isNoticed } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (status) user.status = status;
    if (phone !== undefined) user.phone = phone;
    if (mapUrl !== undefined) user.mapUrl = mapUrl;
    if (address !== undefined) user.address = address;
    if (password) user.password = password;
    if (isNoticed !== undefined) user.isNoticed = isNoticed;

    const updatedUser = await user.save();
    
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
    const users = await User.find({ pendingBalance: { $gt: 0 } })
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
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid collection amount" });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.pendingBalance = Math.max(0, user.pendingBalance - amount);
    const updatedUser = await user.save();
    
    // Create ManualCollection record
    const ManualCollection = require("../models/ManualCollection");
    await ManualCollection.create({
      customer: user._id,
      admin: req.user._id,
      amount: amount
    });
    
    updatedUser.password = undefined;

    res.json({ user: updatedUser, message: "Payment collected successfully" });
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


// @desc    Get date-wise breakdown of a specific user's pending payments
// @route   GET /api/users/:id/pending-breakdown
// @access  Private/Admin
const getUserPendingBreakdown = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const totalPending = user.pendingBalance || 0;
    
    if (totalPending <= 0) {
      return res.json({ totalPending: 0, breakdown: [] });
    }

    const Order = require("../models/Order");
    const userOrders = await Order.find({ customer: user._id }).select("_id deliveryDate total");
    const orderIds = userOrders.map(o => o._id);

    const DeliveryAssignment = require("../models/DeliveryAssignment");
    const assignments = await DeliveryAssignment.find({
      order: { $in: orderIds },
      status: "delivered"
    }).populate("order", "deliveryDate total");

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
          createdAt: assignment.updatedAt
        });
        totalGeneratedDebt += debt;
      }
    });

    allDebts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const repaidAmount = Math.max(0, totalGeneratedDebt - totalPending);
    
    let currentRepaid = repaidAmount;
    const breakdown = [];

    for (const debt of allDebts) {
      if (currentRepaid >= debt.amount) {
        currentRepaid -= debt.amount;
      } else {
        const remainingDue = debt.amount - currentRepaid;
        currentRepaid = 0;
        
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

module.exports = {
  getAllUsers,
  updateUser,
  deleteUser,
  getPendingPayments,
  collectPendingPayment,
  getCollectedPayments,
  getMyPendingBreakdown,
  getUserPendingBreakdown,
  getPartnerSalariesByDate,
  savePartnerSalary,
  getMyEarnings,
  confirmSalaryCollection,
  getMyOrderPaymentStatus
};
