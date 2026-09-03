const Order = require("../models/Order");
const Product = require("../models/Product");
const DeliveryAssignment = require("../models/DeliveryAssignment");
const { normalizeProductId } = require("./vendorPrep");
const { getOrderCategoryGroup, productCategoryMatchesGroup } = require("./categoryOrderGroups");

const formatAddress = (address) => {
  if (!address) return "";
  const parts = [
    address.line1,
    address.line2,
    [address.city, address.state].filter(Boolean).join(", "),
    address.postalCode
  ].filter((p) => p && String(p).trim());
  return parts.join(", ");
};

const buildCategoryOrdersForDate = async (date, groupId) => {
  const group = getOrderCategoryGroup(groupId);
  if (!group) {
    const err = new Error("Invalid category group");
    err.statusCode = 400;
    throw err;
  }

  const orders = await Order.find({
    deliveryDate: date,
    status: { $ne: "cancelled" }
  })
    .populate("customer", "name phone email mapUrl alternatePhone")
    .sort({ deliveryTime: 1, createdAt: 1 })
    .lean();

  const orderIds = orders.map((o) => o._id);
  const assignments = await DeliveryAssignment.find({ order: { $in: orderIds } })
    .populate("deliveryPartner", "name phone")
    .lean();

  const partnerByOrder = {};
  assignments.forEach((a) => {
    partnerByOrder[String(a.order)] = a.deliveryPartner?.name || "";
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

  const rows = [];
  const orderIdSet = new Set();

  orders.forEach((order) => {
    const matchingItems = (order.items || []).filter((item) => {
      const productId = normalizeProductId(item.product);
      const cat = categoryByProduct[productId] || "Other";
      return productCategoryMatchesGroup(cat, group);
    });

    if (!matchingItems.length) return;

    orderIdSet.add(String(order._id));

    matchingItems.forEach((item) => {
      const productId = normalizeProductId(item.product);
      const productCategory = categoryByProduct[productId] || "Other";
      rows.push({
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
        partnerName: partnerByOrder[String(order._id)] || "Unassigned",
        mapUrl: order.mapUrl || order.customer?.mapUrl || "",
        customerNotes: order.customerNotes || "",
        orderTotal: order.total,
        paymentStatus: order.paymentStatus || "",
        productName: item.productName,
        cutName: item.cutName || "",
        quantity: item.quantity,
        unit: item.unit || "kg",
        itemNotes: item.notes || "",
        productCategory
      });
    });
  });

  return {
    groupId: group.id,
    groupLabel: group.label,
    date,
    stats: {
      orderCount: orderIdSet.size,
      itemCount: rows.length
    },
    rows
  };
};

module.exports = {
  buildCategoryOrdersForDate,
  formatAddress
};
