const Product = require("../models/Product");
const Order = require("../models/Order");

const getAdminOverview = async (req, res, next) => {
  try {
    const totalProducts = await Product.countDocuments();
    
    const activeOrders = await Order.countDocuments({ 
      status: { $in: ["pending", "confirmed", "preparing", "out_for_delivery"] } 
    });

    const revenueResult = await Order.aggregate([
      { $match: { status: "delivered" } },
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]);
    
    const revenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    res.json({
      totalProducts,
      activeOrders,
      revenue
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminOverview
};
