const DailyPurchase = require("../models/DailyPurchase");
const { getBusinessStartDate } = require("../utils/moneyManagement");

const emptyPurchaseTemplate = (date) => ({
  date,
  chickenShop: 0,
  muttonShop: 0,
  fishCompany: 0,
  localFishShop: 0,
  chickenShopSettled: 0,
  muttonShopSettled: 0,
  fishCompanySettled: 0,
  localFishShopSettled: 0,
  total: 0,
  totalSettled: 0
});

// @desc    Get purchase data for a specific date
// @route   GET /api/purchases/:date
// @access  Private/Admin
const getPurchaseByDate = async (req, res, next) => {
  try {
    const { date } = req.params; // Expects YYYY-MM-DD
    const businessStart = getBusinessStartDate();

    if (date < businessStart) {
      return res.json({
        purchase: emptyPurchaseTemplate(date),
        businessStartDate: businessStart,
        beforeBusinessStart: true
      });
    }

    let purchase = await DailyPurchase.findOne({ date }).populate("updatedBy", "name email");

    if (!purchase) {
      purchase = emptyPurchaseTemplate(date);
    }

    res.json({ purchase, businessStartDate: businessStart });
  } catch (error) {
    next(error);
  }
};

// @desc    Save or update purchase data for a specific date
// @route   POST /api/purchases
// @access  Private/Admin
const savePurchase = async (req, res, next) => {
  try {
    const { 
      date, 
      chickenShop, muttonShop, fishCompany, localFishShop,
      chickenShopSettled, muttonShopSettled, fishCompanySettled, localFishShopSettled
    } = req.body;
    
    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const businessStart = getBusinessStartDate();
    if (date < businessStart) {
      return res.status(400).json({
        message: `Purchases are tracked from ${businessStart} (real business start). Pick a date on or after that day.`
      });
    }

    const update = { updatedBy: req.user._id };
    const assignAmount = (key, val) => {
      if (val !== undefined && val !== null && val !== "") {
        update[key] = Number(val) || 0;
      }
    };

    assignAmount("chickenShop", chickenShop);
    assignAmount("muttonShop", muttonShop);
    assignAmount("fishCompany", fishCompany);
    assignAmount("localFishShop", localFishShop);
    assignAmount("chickenShopSettled", chickenShopSettled);
    assignAmount("muttonShopSettled", muttonShopSettled);
    assignAmount("fishCompanySettled", fishCompanySettled);
    assignAmount("localFishShopSettled", localFishShopSettled);

    const purchase = await DailyPurchase.findOneAndUpdate(
      { date },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate("updatedBy", "name email");

    res.json({
      purchase,
      message: "Purchase saved successfully",
      businessStartDate: businessStart
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get overall pending settlements for all vendors
// @route   GET /api/purchases/overall-pending
// @access  Private/Admin
const getOverallPending = async (req, res, next) => {
  try {
    const businessStart = getBusinessStartDate();
    const result = await DailyPurchase.aggregate([
      { $match: { date: { $gte: businessStart } } },
      {
        $group: {
          _id: null,
          totalChickenPurchased: { $sum: "$chickenShop" },
          totalChickenSettled: { $sum: "$chickenShopSettled" },
          totalMuttonPurchased: { $sum: "$muttonShop" },
          totalMuttonSettled: { $sum: "$muttonShopSettled" },
          totalFishCoPurchased: { $sum: "$fishCompany" },
          totalFishCoSettled: { $sum: "$fishCompanySettled" },
          totalLocalFishPurchased: { $sum: "$localFishShop" },
          totalLocalFishSettled: { $sum: "$localFishShopSettled" }
        }
      }
    ]);

    let overall = {
      chickenPending: 0,
      muttonPending: 0,
      fishCoPending: 0,
      localFishPending: 0,
      totalPending: 0
    };

    if (result.length > 0) {
      const data = result[0];
      overall.chickenPending = (data.totalChickenPurchased || 0) - (data.totalChickenSettled || 0);
      overall.muttonPending = (data.totalMuttonPurchased || 0) - (data.totalMuttonSettled || 0);
      overall.fishCoPending = (data.totalFishCoPurchased || 0) - (data.totalFishCoSettled || 0);
      overall.localFishPending = (data.totalLocalFishPurchased || 0) - (data.totalLocalFishSettled || 0);
      
      overall.totalPending = overall.chickenPending + overall.muttonPending + overall.fishCoPending + overall.localFishPending;
    }

    res.json({ ...overall, businessStartDate: businessStart });
  } catch (error) {
    next(error);
  }
};

// @desc    Calculate Admin Earnings (Profit) per day
// @route   GET /api/purchases/admin-earnings
// @access  Private/Admin
const getAdminEarnings = async (req, res, next) => {
  try {
    const Order = require("../models/Order");
    const PartnerSalary = require("../models/PartnerSalary");
    const DeliveryAssignment = require("../models/DeliveryAssignment");

    // 1. Fetch all delivered orders grouped by deliveryDate
    const orders = await Order.find({ status: "delivered" }).select("deliveryDate total");
    
    // 2. Fetch daily purchases (real business only)
    const purchases = await DailyPurchase.find({ date: { $gte: getBusinessStartDate() } });

    // 3. Fetch all partner salaries
    const salaries = await PartnerSalary.find({});

    // 4. Fetch all delivery assignments (for collected amounts)
    const assignments = await DeliveryAssignment.find({ status: "delivered" }).populate("order", "deliveryDate");

    const statsMap = {}; // key: YYYY-MM-DD

    const getStat = (date) => {
      if (!date) return null;
      if (!statsMap[date]) {
        statsMap[date] = {
          date,
          totalSales: 0,
          totalPurchases: 0,
          partnerSalaries: 0,
          amountCollected: 0
        };
      }
      return statsMap[date];
    };

    // Aggregate Orders
    for (const order of orders) {
      if (!order.deliveryDate) continue;
      const stat = getStat(order.deliveryDate);
      stat.totalSales += order.total || 0;
    }

    // Aggregate Purchases
    for (const purchase of purchases) {
      if (!purchase.date) continue;
      const stat = getStat(purchase.date);
      stat.totalPurchases += purchase.total || 0;
    }

    // Aggregate Salaries
    for (const salary of salaries) {
      if (!salary.date) continue;
      const stat = getStat(salary.date);
      stat.partnerSalaries += salary.amount || 0;
    }

    // Aggregate Collected Amount
    for (const assignment of assignments) {
      if (!assignment.order || !assignment.order.deliveryDate) continue;
      const stat = getStat(assignment.order.deliveryDate);
      stat.amountCollected += assignment.paymentCollected || 0;
    }

    // Compute derived values and sort
    const results = Object.values(statsMap).map(stat => {
      const grossEarnings = stat.totalSales - stat.totalPurchases - stat.partnerSalaries;
      const amountPending = stat.totalSales - stat.amountCollected;
      const actualEarnings = grossEarnings - amountPending; // Or: amountCollected - totalPurchases - partnerSalaries

      return {
        ...stat,
        grossEarnings,
        amountPending,
        actualEarnings
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Descending by date

    res.json({ earnings: results });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete test vendor purchase/settlement rows before business start
// @route   DELETE /api/purchases/test-data
// @access  Private/Admin
const deleteTestPurchaseData = async (req, res, next) => {
  try {
    const businessStart = getBusinessStartDate();
    const result = await DailyPurchase.deleteMany({ date: { $lt: businessStart } });
    res.json({
      message: `Removed ${result.deletedCount} test purchase/settlement record(s) before ${businessStart}.`,
      deletedCount: result.deletedCount,
      businessStartDate: businessStart
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPurchaseByDate,
  savePurchase,
  getOverallPending,
  getAdminEarnings,
  deleteTestPurchaseData
};
