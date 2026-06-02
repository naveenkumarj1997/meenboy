const Order = require("../models/Order");
const DeliveryAssignment = require("../models/DeliveryAssignment");
const Payment = require("../models/Payment");
const DateAvailability = require("../models/DateAvailability");
const Product = require("../models/Product");
const User = require("../models/User");
const { createNotification } = require("../utils/notifications");
const path = require("path");
const fs = require("fs");
const { generateInvoice } = require("../utils/pdfInvoice");

const createOrder = async (req, res, next) => {
  try {
    const { items, address, deliveryFee = 0, deliveryDate, deliveryTime, mapUrl } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Order must contain at least one item" });
    }

    if (deliveryDate) {
      const availability = await DateAvailability.findOne({ date: deliveryDate }).lean();
      if (availability) {
        if (availability.isClosed) {
          return res.status(400).json({ message: "Delivery is closed for the selected date. Please choose another date." });
        }

        const hasCategoryRestrictions = availability.unavailableCategories && availability.unavailableCategories.length > 0;
        const hasProductRestrictions = availability.unavailableProducts && availability.unavailableProducts.length > 0;

        if (hasCategoryRestrictions || hasProductRestrictions) {
          const productIds = items.map(item => item.product);
          const products = await Product.find({ _id: { $in: productIds } }).lean();
          
          let invalidProducts = [];
          
          if (hasCategoryRestrictions) {
            invalidProducts = invalidProducts.concat(products.filter(p => availability.unavailableCategories.includes(p.category)));
          }
          
          if (hasProductRestrictions) {
            const restrictedIds = availability.unavailableProducts.map(id => id.toString());
            const productMatch = products.filter(p => restrictedIds.includes(p._id.toString()));
            // only add if not already in invalidProducts
            productMatch.forEach(p => {
              if (!invalidProducts.find(ip => ip._id.toString() === p._id.toString())) {
                invalidProducts.push(p);
              }
            });
          }

          if (invalidProducts.length > 0) {
            const names = invalidProducts.map(p => p.name).join(", ");
            return res.status(400).json({ message: `The following items cannot be delivered on the selected date due to availability restrictions: ${names}` });
          }
        }
      }
    }

    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const total = subtotal + deliveryFee;

    const order = await Order.create({
      customer: req.user._id,
      items,
      subtotal,
      deliveryFee,
      total,
      address,
      deliveryDate,
      deliveryTime,
      mapUrl
    });

    await createNotification({
      user: req.user._id,
      type: "order_created",
      title: "Order created",
      message: `Your order has been created and is now pending.`,
      metadata: { orderId: order._id, total: order.total }
    });

    res.status(201).json({ order });
  } catch (error) {
    next(error);
  }
};

const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    const orderIds = orders.map(o => o._id);
    const assignments = await DeliveryAssignment.find({ order: { $in: orderIds } })
      .populate('deliveryPartner', 'name phone')
      .lean();

    const assignmentMap = {};
    assignments.forEach(a => {
      assignmentMap[a.order.toString()] = a.deliveryPartner;
    });

    const populatedOrders = orders.map(o => ({
      ...o,
      deliveryPartner: assignmentMap[o._id.toString()] || null
    }));

    res.json({ orders: populatedOrders });
  } catch (error) {
    next(error);
  }
};

const listOrdersForAdmin = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate("customer", "name email")
      .lean();
    res.json({ orders });
  } catch (error) {
    next(error);
  }
};

const listAssignmentsForPartner = async (req, res, next) => {
  try {
    const assignments = await DeliveryAssignment.find({
      deliveryPartner: req.user._id
    })
      .populate({
        path: "order",
        populate: {
          path: "customer",
          select: "name phone"
        }
      })
      .sort({ sequence: 1, createdAt: -1 })
      .lean();
    res.json({ assignments });
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true, runValidators: true }
    );
    if (!order) return res.status(404).json({ message: "Order not found" });

    await createNotification({
      user: order.customer,
      type: "order_status_updated",
      title: "Order status updated",
      message: `Your order status is now: ${order.status}`,
      metadata: { orderId: order._id, status: order.status }
    });

    res.json({ order });
  } catch (error) {
    next(error);
  }
};

const assignDeliveryPartner = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { deliveryPartnerId, estimatedArrival } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const assignment = await DeliveryAssignment.findOneAndUpdate(
      { order: orderId },
      {
        order: orderId,
        deliveryPartner: deliveryPartnerId,
        ...(estimatedArrival ? { estimatedArrival } : {})
      },
      { upsert: true, new: true, runValidators: true }
    );

    await createNotification({
      user: order.customer,
      type: "delivery_assigned",
      title: "Delivery partner assigned",
      message: "A delivery partner has been assigned to your order.",
      metadata: { orderId: order._id, assignmentId: assignment._id }
    });

    await createNotification({
      user: deliveryPartnerId,
      type: "delivery_assigned",
      title: "New delivery assignment",
      message: "You have been assigned a new delivery.",
      metadata: { orderId: order._id, assignmentId: assignment._id }
    });

    res.status(201).json({ assignment });
  } catch (error) {
    next(error);
  }
};

const updateDeliveryStatus = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const { status, notes, actualArrival, paymentCollected, paymentMethod } = req.body;

    const assignment = await DeliveryAssignment.findOneAndUpdate(
      { _id: assignmentId, deliveryPartner: req.user._id },
      {
        status,
        ...(notes !== undefined ? { notes } : {}),
        ...(actualArrival ? { actualArrival } : {}),
        ...(paymentCollected !== undefined ? { paymentCollected } : {}),
        ...(paymentMethod !== undefined ? { paymentMethod } : {})
      },
      { new: true, runValidators: true }
    ).populate("order");

    if (!assignment) return res.status(404).json({ message: "Assignment not found" });

    if (status === "delivered" || status === "failed") {
      await Order.findByIdAndUpdate(assignment.order._id, { status: status === "delivered" ? "delivered" : "out_for_delivery" });
    }

    await createNotification({
      user: assignment.order.customer,
      type: "order_status_updated",
      title: "Delivery update",
      message: `Delivery status updated: ${assignment.status}`,
      metadata: { orderId: assignment.order._id, assignmentId: assignment._id, status }
    });

    res.json({ assignment });
  } catch (error) {
    next(error);
  }
};

const getProductsForDailyPrice = async (req, res, next) => {
  try {
    const { deliveryDate } = req.query;
    if (!deliveryDate) {
      return res.status(400).json({ message: "deliveryDate query parameter is required" });
    }

    const orders = await Order.find({
      deliveryDate,
      status: { $in: ["pending", "confirmed"] }
    }).lean();

    const productMap = new Map();

    orders.forEach(order => {
      order.items.forEach(item => {
        const key = `${item.product}-${item.cutName || 'default'}`;
        if (!productMap.has(key)) {
          productMap.set(key, {
            productId: item.product,
            productName: item.productName,
            cutName: item.cutName,
            currentUnitPrice: item.unitPrice,
            totalQuantity: 0
          });
        }
        productMap.get(key).totalQuantity += item.quantity;
      });
    });

    res.json({ products: Array.from(productMap.values()) });
  } catch (error) {
    next(error);
  }
};

const updateDailyPrices = async (req, res, next) => {
  try {
    const { deliveryDate, priceUpdates } = req.body;

    const orders = await Order.find({
      deliveryDate,
      status: { $in: ["pending", "confirmed"] }
    });

    let updatedCount = 0;

    for (const order of orders) {
      let orderChanged = false;

      for (const item of order.items) {
        const update = priceUpdates.find(
          (pu) => String(pu.productId) === String(item.product) && (pu.cutName ? pu.cutName === item.cutName : !item.cutName)
        );

        if (update) {
          item.unitPrice = update.newPrice;
          item.totalPrice = update.newPrice * item.quantity;
          orderChanged = true;
        }
      }

      if (orderChanged) {
        order.subtotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0);
        order.total = order.subtotal + order.deliveryFee;
        await order.save();
        updatedCount++;
        
        // Update pending or authorized payments
        await Payment.updateMany(
          { order: order._id, status: { $in: ["pending", "authorized", "failed"] } },
          { amount: order.total }
        );
        
        await createNotification({
          user: order.customer,
          type: "price_updated",
          title: "Order price updated",
          message: `The price for your order on ${deliveryDate} has been updated based on today's market rate. New total: $${order.total.toFixed(2)}`,
          metadata: { orderId: order._id, total: order.total }
        });
      }
    }

    res.json({ message: `Updated prices for ${updatedCount} orders`, updatedCount });
  } catch (error) {
    next(error);
  }
};

const downloadInvoice = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId).populate("customer");
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (req.user.role === "customer" && order.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to view this invoice" });
    }

    let filePath;

    if (order.invoicePath) {
      filePath = path.join(__dirname, "../../", order.invoicePath);
      if (!fs.existsSync(filePath)) {
        order.invoicePath = null;
      }
    }

    if (!order.invoicePath) {
      const relativePath = await generateInvoice(order, order.customer);
      order.invoicePath = relativePath;
      await order.save();
      filePath = path.join(__dirname, "../../", relativePath);
    }

    res.download(filePath, `Invoice-${order._id.toString().slice(-8).toUpperCase()}.pdf`);
  } catch (error) {
    next(error);
  }
};

const listAllAssignments = async (req, res, next) => {
  try {
    const assignments = await DeliveryAssignment.find()
      .populate({
        path: "order",
        populate: { path: "customer", select: "name email phone" }
      })
      .populate("deliveryPartner", "name email")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ assignments });
  } catch (error) {
    next(error);
  }
};

const getDeliveryStats = async (req, res, next) => {
  try {
    const assignments = await DeliveryAssignment.find().lean();
    
    const total = assignments.length;
    let completed = 0;
    let inProgress = 0;
    let failed = 0;
    
    assignments.forEach(a => {
      if (a.status === "delivered") completed++;
      else if (a.status === "failed" || a.status === "cancelled") failed++;
      else inProgress++;
    });
    
    const completionPercentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    res.json({
      stats: {
        total,
        completed,
        inProgress,
        failed,
        completionPercentage
      }
    });
  } catch (error) {
    next(error);
  }
};

const reorderAssignments = async (req, res, next) => {
  try {
    const { assignments } = req.body; // Array of { id, sequence }
    if (!Array.isArray(assignments)) {
      return res.status(400).json({ message: "Assignments array is required" });
    }

    const updates = assignments.map((a) =>
      DeliveryAssignment.updateOne(
        { _id: a.id, deliveryPartner: req.user._id },
        { sequence: a.sequence }
      )
    );

    await Promise.all(updates);
    res.json({ message: "Sequence updated successfully" });
  } catch (error) {
    next(error);
  }
};

const createAdminOrder = async (req, res, next) => {
  try {
    const { items, address, deliveryFee = 0, deliveryDate, deliveryTime, mapUrl, customerId, newCustomer } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Order must contain at least one item" });
    }

    let finalCustomerId = customerId;

    // Create new user if provided
    if (newCustomer && !finalCustomerId) {
      const { name, email, phone } = newCustomer;
      // Generate a random password of 12 chars
      const randomPassword = Math.random().toString(36).slice(-12) + "A1!";
      
      const user = await User.create({
        name,
        email,
        phone,
        password: randomPassword,
        role: "customer",
        address
      });
      finalCustomerId = user._id;
    }

    if (!finalCustomerId) {
      return res.status(400).json({ message: "A customer ID or new customer details must be provided" });
    }

    // Still perform date availability checks
    if (deliveryDate) {
      const availability = await DateAvailability.findOne({ date: deliveryDate }).lean();
      if (availability) {
        if (availability.isClosed) {
          return res.status(400).json({ message: "Delivery is closed for the selected date. Please choose another date." });
        }

        const hasCategoryRestrictions = availability.unavailableCategories && availability.unavailableCategories.length > 0;
        const hasProductRestrictions = availability.unavailableProducts && availability.unavailableProducts.length > 0;

        if (hasCategoryRestrictions || hasProductRestrictions) {
          const productIds = items.map(item => item.product);
          const products = await Product.find({ _id: { $in: productIds } }).lean();
          
          let invalidProducts = [];
          
          if (hasCategoryRestrictions) {
            invalidProducts = invalidProducts.concat(products.filter(p => availability.unavailableCategories.includes(p.category)));
          }
          
          if (hasProductRestrictions) {
            const restrictedIds = availability.unavailableProducts.map(id => id.toString());
            const productMatch = products.filter(p => restrictedIds.includes(p._id.toString()));
            productMatch.forEach(p => {
              if (!invalidProducts.find(ip => ip._id.toString() === p._id.toString())) {
                invalidProducts.push(p);
              }
            });
          }

          if (invalidProducts.length > 0) {
            const names = invalidProducts.map(p => p.name).join(", ");
            return res.status(400).json({ message: `The following items cannot be delivered on the selected date: ${names}` });
          }
        }
      }
    }

    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const total = subtotal + deliveryFee;

    const order = await Order.create({
      customer: finalCustomerId,
      items,
      subtotal,
      deliveryFee,
      total,
      address,
      deliveryDate,
      deliveryTime,
      mapUrl
    });

    await createNotification({
      user: finalCustomerId,
      type: "order_created",
      title: "Order created",
      message: `An order has been manually booked for you.`,
      metadata: { orderId: order._id, total: order.total }
    });

    res.status(201).json({ order });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
       return res.status(400).json({ message: "Email is already in use by another customer." });
    }
    next(error);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  listOrdersForAdmin,
  listAssignmentsForPartner,
  updateOrderStatus,
  assignDeliveryPartner,
  updateDeliveryStatus,
  getProductsForDailyPrice,
  updateDailyPrices,
  downloadInvoice,
  listAllAssignments,
  getDeliveryStats,
  reorderAssignments,
  createAdminOrder
};

