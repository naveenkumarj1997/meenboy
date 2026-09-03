const Order = require("../models/Order");
const Product = require("../models/Product");
const DeliveryAssignment = require("../models/DeliveryAssignment");
const DailyPriceUpdate = require("../models/DailyPriceUpdate");
const { normalizeProductId } = require("./vendorPrep");
const { formatAddress } = require("./buildCategoryOrdersReport");

const buildAllOrdersForDate = async (date) => {
  const orders = await Order.find({ deliveryDate: date })
    .populate("customer", "name phone email mapUrl alternatePhone")
    .sort({ deliveryTime: 1, createdAt: 1 })
    .lean();

  const orderIds = orders.map((o) => o._id);
  const assignments = await DeliveryAssignment.find({ order: { $in: orderIds } })
    .populate("deliveryPartner", "name phone")
    .lean();

  const assignmentByOrder = {};
  assignments.forEach((a) => {
    assignmentByOrder[String(a.order)] = a;
  });

  const productIds = [
    ...new Set(
      orders.flatMap((o) =>
        (o.items || []).map((item) => normalizeProductId(item.product)).filter(Boolean)
      )
    )
  ];

  const products = await Product.find({ _id: { $in: productIds } })
    .select("category unit")
    .lean();

  const categoryByProduct = {};
  products.forEach((p) => {
    categoryByProduct[String(p._id)] = p.category;
  });

  const dailyUpdate = await DailyPriceUpdate.findOne({ deliveryDate: date }).lean();
  const dailyPriceUpdatedForDate = Boolean(dailyUpdate);

  const orderRows = orders.map((order) => {
    const assignment = assignmentByOrder[String(order._id)];
    const dailyPriceUpdated = Boolean(order.dailyPriceUpdated || dailyPriceUpdatedForDate);
    const items = (order.items || []).map((item) => {
      const productId = normalizeProductId(item.product);
      return {
        productName: item.productName,
        cutName: item.cutName || "",
        quantity: item.quantity,
        unit: item.unit || "kg",
        notes: item.notes || "",
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        estimatedUnitPrice: item.estimatedUnitPrice ?? item.unitPrice,
        estimatedTotalPrice: item.estimatedTotalPrice ?? item.totalPrice,
        productCategory: categoryByProduct[productId] || "Other"
      };
    });

    return {
      orderId: order._id,
      customerName: order.customer?.name || "Guest",
      phone: order.address?.phone || order.customer?.phone || "",
      alternatePhone:
        order.address?.alternatePhone || order.customer?.alternatePhone || "",
      email: order.customer?.email || "",
      address: formatAddress(order.address),
      deliveryTime: order.deliveryTime || "",
      deliveryDate: order.deliveryDate,
      status: order.status,
      bookingSource: order.bookingSource || "website",
      partnerName: assignment?.deliveryPartner?.name || "Unassigned",
      partnerPhone: assignment?.deliveryPartner?.phone || "",
      assignmentStatus: assignment?.status || "",
      paymentCollected: assignment?.paymentCollected || 0,
      paymentMethod: assignment?.paymentMethod || "",
      mapUrl: order.mapUrl || order.customer?.mapUrl || "",
      customerNotes: order.customerNotes || "",
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      discountAmount: order.discountAmount || 0,
      discountNote: order.discountNote || "",
      addonAmount: order.addonAmount || 0,
      addonNote: order.addonNote || "",
      total: order.total,
      paymentStatus: order.paymentStatus || "",
      dailyPriceUpdated,
      items,
      createdAt: order.createdAt
    };
  });

  return {
    date,
    stats: {
      orderCount: orderRows.length,
      itemCount: orderRows.reduce((sum, o) => sum + o.items.length, 0)
    },
    orders: orderRows
  };
};

module.exports = {
  buildAllOrdersForDate
};
