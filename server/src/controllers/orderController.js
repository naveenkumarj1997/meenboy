const Order = require("../models/Order");
const DeliveryAssignment = require("../models/DeliveryAssignment");
const Payment = require("../models/Payment");
const DateAvailability = require("../models/DateAvailability");
const Product = require("../models/Product");
const User = require("../models/User");
const { createNotification } = require("../utils/notifications");
const DailyPriceUpdate = require("../models/DailyPriceUpdate");
const path = require("path");
const fs = require("fs");
const { generateInvoice } = require("../utils/pdfInvoice");
const { generatePartnerDayReport } = require("../utils/pdfDeliveryReport");
const {
  generateVendorCategoryReport,
  generateVendorAllCategoriesReport
} = require("../utils/pdfVendorCategoryReport");

const applyDailyPriceFlags = async (orders) => {
  if (!orders.length) return orders;
  const dates = [...new Set(orders.map((o) => o.deliveryDate).filter(Boolean))];
  const updates = await DailyPriceUpdate.find({ deliveryDate: { $in: dates } }).lean();
  const updatedDates = new Set(updates.map((u) => u.deliveryDate));
  return orders.map((o) => ({
    ...o,
    dailyPriceUpdated: Boolean(o.dailyPriceUpdated || updatedDates.has(o.deliveryDate)),
    estimatedTotal: o.estimatedTotal != null ? o.estimatedTotal : o.total
  }));
};

const snapshotOrderItems = (items = []) =>
  items.map((item) => ({
    ...item,
    estimatedUnitPrice: item.estimatedUnitPrice ?? item.unitPrice,
    estimatedTotalPrice: item.estimatedTotalPrice ?? item.totalPrice
  }));

const createOrder = async (req, res, next) => {
  try {
    const { items, address, deliveryFee = 0, deliveryDate, deliveryTime, mapUrl } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Order must contain at least one item" });
    }

    const productIds = items.map((item) => item.product).filter(Boolean);
    if (productIds.length > 0) {
      const catalogProducts = await Product.find({ _id: { $in: productIds } }).lean();
      const inactive = catalogProducts.filter((p) => p.isActive === false);
      if (inactive.length > 0) {
        const names = inactive.map((p) => p.name).join(", ");
        return res.status(400).json({
          message: `These products are no longer available: ${names}. Please remove them from your cart.`
        });
      }
      if (catalogProducts.length !== new Set(productIds.map(String)).size) {
        return res.status(400).json({ message: "One or more products in your cart are invalid." });
      }
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
    const dailyUpdate = deliveryDate
      ? await DailyPriceUpdate.findOne({ deliveryDate }).lean()
      : null;

    const order = await Order.create({
      customer: req.user._id,
      items: snapshotOrderItems(items),
      subtotal,
      deliveryFee,
      total,
      estimatedTotal: total,
      dailyPriceUpdated: Boolean(dailyUpdate),
      dailyPriceUpdatedAt: dailyUpdate ? dailyUpdate.updatedAt : undefined,
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

    res.json({ orders: await applyDailyPriceFlags(populatedOrders) });
  } catch (error) {
    next(error);
  }
};

const listOrdersForAdmin = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate("customer", "name email phone mapUrl")
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

    const existing = await Order.findById(orderId);
    if (!existing) return res.status(404).json({ message: "Order not found" });

    if (status === "cancelled") {
      if (existing.status === "delivered") {
        return res.status(400).json({ message: "Delivered orders cannot be cancelled." });
      }
      if (existing.status === "cancelled") {
        return res.status(400).json({ message: "This order is already cancelled." });
      }
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true, runValidators: true }
    );
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (status === "cancelled") {
      await DeliveryAssignment.updateMany({ order: orderId }, { status: "cancelled" });
    }

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

const updateAdminOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { items, address, deliveryDate, deliveryTime, mapUrl, deliveryFee } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status === "cancelled") {
      return res.status(400).json({ message: "Cancelled orders cannot be edited." });
    }

    if (Array.isArray(items) && items.length > 0) {
      order.items = items.map((item) => ({
        product: item.product,
        productName: item.productName,
        productImage: item.productImage,
        quantity: item.quantity,
        unit: item.unit || "kg",
        cutName: item.cutName,
        notes: item.notes,
        unitPrice: item.unitPrice,
        totalPrice: Number(item.quantity) * Number(item.unitPrice)
      }));
      order.subtotal = order.items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
    }

    if (deliveryFee != null && deliveryFee !== "") {
      order.deliveryFee = Number(deliveryFee) || 0;
    }
    order.total = Number(order.subtotal || 0) + Number(order.deliveryFee || 0);

    if (address) {
      order.address = order.address || {};
      if (address.line1) order.address.line1 = address.line1;
      if (address.line2 !== undefined) order.address.line2 = address.line2;
      if (address.city) order.address.city = address.city;
      if (address.state) order.address.state = address.state;
      if (address.postalCode) order.address.postalCode = address.postalCode;
      if (address.phone !== undefined) order.address.phone = address.phone;
    }

    if (deliveryDate) order.deliveryDate = deliveryDate;
    if (deliveryTime) order.deliveryTime = deliveryTime;
    if (mapUrl !== undefined) order.mapUrl = mapUrl;

    await order.save();

    await createNotification({
      user: order.customer,
      type: "order_status_updated",
      title: "Order updated",
      message: "Your order has been updated by Fish Friendly admin.",
      metadata: { orderId: order._id }
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

    // If delivered and payment was partial or pay later, update user's pending balance
    if (status === "delivered") {
      const orderTotal = assignment.order.total;
      const collected = Number(paymentCollected) || 0;
      const unpaidAmount = Math.max(0, orderTotal - collected);

      if (unpaidAmount > 0) {
        await User.findByIdAndUpdate(
          assignment.order.customer,
          { $inc: { pendingBalance: unpaidAmount } }
        );
      }
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

const buildDailyPriceSummary = (orders) => {
  const productMap = new Map();

  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const key = `${item.product}-${item.cutName || "default"}`;
      if (!productMap.has(key)) {
        const booked = item.estimatedUnitPrice != null ? Number(item.estimatedUnitPrice) : Number(item.unitPrice);
        productMap.set(key, {
          productId: item.product,
          productName: item.productName,
          cutName: item.cutName,
          unit: item.unit || "kg",
          currentUnitPrice: Number(item.unitPrice),
          estimatedUnitPrice: booked,
          totalQuantity: 0
        });
      }
      productMap.get(key).totalQuantity += Number(item.quantity) || 0;
    });
  });

  const products = Array.from(productMap.values()).map((p) => {
    const qty = Math.round(Number(p.totalQuantity) * 1000) / 1000;
    const booked = Number(p.estimatedUnitPrice);
    const daily = Number(p.currentUnitPrice);
    return {
      ...p,
      totalQuantity: qty,
      amountDifference: Math.round((daily - booked) * qty * 100) / 100
    };
  });

  const changes = products
    .filter((p) => Math.abs(Number(p.amountDifference)) > 0.01)
    .map((p) => ({
      productName: p.productName,
      cutName: p.cutName,
      unit: p.unit,
      quantity: p.totalQuantity,
      bookedUnitPrice: p.estimatedUnitPrice,
      dailyUnitPrice: p.currentUnitPrice,
      amountDifference: p.amountDifference
    }));

  return { products, changes };
};

const getProductsForDailyPrice = async (req, res, next) => {
  try {
    const { deliveryDate } = req.query;
    if (!deliveryDate) {
      return res.status(400).json({ message: "deliveryDate query parameter is required" });
    }

    const orders = await Order.find({
      deliveryDate,
      status: { $nin: ["cancelled"] }
    }).lean();

    const { products, changes } = buildDailyPriceSummary(orders);
    const lock = await DailyPriceUpdate.findOne({ deliveryDate }).populate("updatedBy", "name").lean();

    res.json({
      products,
      dailyPriceUpdated: Boolean(lock),
      updatedAt: lock?.updatedAt || null,
      updatedByName: lock?.updatedBy?.name || null,
      changes: lock?.items?.length ? lock.items : changes
    });
  } catch (error) {
    next(error);
  }
};

const updateDailyPrices = async (req, res, next) => {
  try {
    const { deliveryDate, priceUpdates } = req.body;

    const orders = await Order.find({
      deliveryDate,
      status: { $in: ["pending", "confirmed", "preparing"] }
    });

    let updatedCount = 0;
    const now = new Date();

    await DailyPriceUpdate.findOneAndUpdate(
      { deliveryDate },
      { deliveryDate, updatedBy: req.user._id },
      { upsert: true, new: true }
    );

    for (const order of orders) {
      const alreadyConfirmed = Boolean(order.dailyPriceUpdated);
      if (order.estimatedTotal == null) {
        order.estimatedTotal = order.total;
      }

      let orderChanged = false;

      for (const item of order.items) {
        if (item.estimatedUnitPrice == null) item.estimatedUnitPrice = item.unitPrice;
        if (item.estimatedTotalPrice == null) item.estimatedTotalPrice = item.totalPrice;

        const update = priceUpdates.find(
          (pu) => String(pu.productId) === String(item.product) && (pu.cutName ? pu.cutName === item.cutName : !item.cutName)
        );

        if (update && update.newPrice != null && update.newPrice !== "") {
          item.unitPrice = update.newPrice;
          item.totalPrice = update.newPrice * item.quantity;
          orderChanged = true;
        }
      }

      if (orderChanged) {
        order.subtotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0);
        order.total = order.subtotal + order.deliveryFee;
        updatedCount++;
      }

      order.dailyPriceUpdated = true;
      order.dailyPriceUpdatedAt = now;
      await order.save();

      if (orderChanged) {
        await Payment.updateMany(
          { order: order._id, status: { $in: ["pending", "authorized", "failed"] } },
          { amount: order.total }
        );
      }

      if (!alreadyConfirmed || orderChanged) {
        await createNotification({
          user: order.customer,
          type: "price_updated",
          title: "Daily price updated",
          message: orderChanged
            ? `Actual price for your ${deliveryDate} delivery has been confirmed. New total: ₹${Number(order.total).toFixed(2)}`
            : `Daily price for your ${deliveryDate} delivery has been confirmed.`,
          metadata: { orderId: order._id, total: order.total }
        });
      }
    }

    const refreshed = await Order.find({
      deliveryDate,
      status: { $nin: ["cancelled"] }
    }).lean();
    const { changes } = buildDailyPriceSummary(refreshed);
    await DailyPriceUpdate.findOneAndUpdate(
      { deliveryDate },
      { items: changes, updatedBy: req.user._id },
      { upsert: true, new: true }
    );

    res.json({
      message: `Daily prices saved for ${deliveryDate}. ${updatedCount} order(s) recalculated.`,
      updatedCount,
      dailyPriceUpdated: true,
      changes
    });
  } catch (error) {
    next(error);
  }
};

const listInvoicesForAdmin = async (req, res, next) => {
  try {
    const { deliveryDate } = req.query;
    if (!deliveryDate) {
      return res.status(400).json({ message: "deliveryDate query parameter is required" });
    }

    const orders = await Order.find({
      deliveryDate,
      status: { $ne: "cancelled" }
    })
      .populate("customer", "name phone")
      .sort({ createdAt: 1 })
      .lean();

    const invoices = orders.map((order) => ({
      orderId: order._id,
      customerName: order.customer?.name || "Customer",
      customerPhone: order.customer?.phone || order.address?.phone || "",
      total: order.total,
      status: order.status,
      deliveryTime: order.deliveryTime,
      dailyPriceUpdated: Boolean(order.dailyPriceUpdated)
    }));

    res.json({ invoices });
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

    const dateLock = await DailyPriceUpdate.findOne({ deliveryDate: order.deliveryDate }).lean();
    if (dateLock && !order.dailyPriceUpdated) {
      order.dailyPriceUpdated = true;
      order.dailyPriceUpdatedAt = dateLock.updatedAt;
    }
    if (order.estimatedTotal == null) {
      order.estimatedTotal = order.total;
    }

    let filePath;

    // Always regenerate invoice so shop details / address formatting stay up to date
    if (order.invoicePath) {
      const oldPath = path.join(__dirname, "../../", order.invoicePath);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (_) {
          // ignore unlink errors and continue regenerating
        }
      }
    }

    const relativePath = await generateInvoice(order, order.customer);
    order.invoicePath = relativePath;
    await order.save();
    filePath = path.join(__dirname, "../../", relativePath);

    res.download(filePath, `Invoice-${order._id.toString().slice(-8).toUpperCase()}.pdf`);
  } catch (error) {
    next(error);
  }
};

const downloadPartnerDayReport = async (req, res, next) => {
  try {
    const { date, partnerId } = req.query;

    if (!date) {
      return res.status(400).json({ message: "date query param is required" });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      return res.status(400).json({ message: "date must be YYYY-MM-DD" });
    }

    const isAll = !partnerId || String(partnerId).toLowerCase() === "all";

    if (isAll) {
      const orders = await Order.find({ deliveryDate: date })
        .populate("customer", "name email phone mapUrl")
        .sort({ deliveryTime: 1, createdAt: 1 })
        .lean();

      const orderIds = orders.map((o) => o._id);
      const assignments = await DeliveryAssignment.find({
        order: { $in: orderIds }
      })
        .populate("deliveryPartner", "name phone")
        .lean();

      const partnerByOrder = {};
      assignments.forEach((a) => {
        partnerByOrder[String(a.order)] = a.deliveryPartner || null;
      });

      const dayRows = orders.map((order) => ({
        order,
        deliveryPartner: partnerByOrder[String(order._id)] || null,
        status: partnerByOrder[String(order._id)] ? "assigned" : "unassigned"
      }));

      const { filePath, fileName } = await generatePartnerDayReport({
        partner: null,
        date,
        assignments: dayRows,
        allPartners: true
      });

      return res.download(filePath, fileName);
    }

    const partner = await User.findOne({
      _id: partnerId,
      role: "delivery_partner"
    }).select("name phone email");

    if (!partner) {
      return res.status(404).json({ message: "Delivery partner not found" });
    }

    const assignments = await DeliveryAssignment.find({
      deliveryPartner: partnerId
    })
      .populate({
        path: "order",
        populate: { path: "customer", select: "name email phone mapUrl" }
      })
      .sort({ createdAt: 1 })
      .lean();

    const dayAssignments = assignments
      .filter((a) => a.order && a.order.deliveryDate === date)
      .sort((a, b) => {
        const tA = a.order?.deliveryTime || "";
        const tB = b.order?.deliveryTime || "";
        return String(tA).localeCompare(String(tB));
      });

    const { filePath, fileName } = await generatePartnerDayReport({
      partner,
      date,
      assignments: dayAssignments,
      allPartners: false
    });

    res.download(filePath, fileName);
  } catch (error) {
    next(error);
  }
};

const buildVendorRowsForDate = async (date, categoryFilter) => {
  const PRODUCT_CATEGORIES = Product.PRODUCT_CATEGORIES || [
    "Seafood",
    "Fish",
    "Chicken",
    "Mutton",
    "Country Chicken"
  ];

  const orders = await Order.find({
    deliveryDate: date,
    status: { $ne: "cancelled" }
  })
    .populate("customer", "name")
    .sort({ deliveryTime: 1, createdAt: 1 })
    .lean();

  const productIds = [
    ...new Set(
      orders.flatMap((o) => (o.items || []).map((item) => String(item.product)).filter(Boolean))
    )
  ];

  const products = await Product.find({ _id: { $in: productIds } })
    .select("name category unit")
    .lean();

  const categoryByProduct = {};
  const unitByProduct = {};
  products.forEach((p) => {
    categoryByProduct[String(p._id)] = p.category;
    unitByProduct[String(p._id)] = p.unit || "kg";
  });

  const rowsByCategory = {};
  PRODUCT_CATEGORIES.forEach((cat) => {
    rowsByCategory[cat] = [];
  });
  rowsByCategory.Other = [];

  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const cat = categoryByProduct[String(item.product)] || "Other";
      if (categoryFilter && categoryFilter !== "all" && cat !== categoryFilter) {
        return;
      }
      if (!rowsByCategory[cat]) rowsByCategory[cat] = [];
      rowsByCategory[cat].push({
        productName: item.productName,
        cutName: item.cutName || "",
        quantity: item.quantity,
        unit: item.unit || unitByProduct[String(item.product)] || "kg",
        notes: item.notes || "",
        orderId: order._id,
        customerName: order.customer?.name || "Guest"
      });
    });
  });

  const buildTotals = (rows) => {
    const map = {};
    rows.forEach((r) => {
      const key = `${r.productName}||${r.cutName || "-"}||${r.unit || "kg"}`;
      if (!map[key]) {
        map[key] = {
          label: r.cutName ? `${r.productName} (${r.cutName})` : r.productName,
          quantity: 0,
          unit: r.unit || "kg"
        };
      }
      map[key].quantity += Number(r.quantity) || 0;
    });
    return Object.values(map)
      .map((t) => ({
        ...t,
        quantity: Math.round(t.quantity * 1000) / 1000
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  };

  return { rowsByCategory, buildTotals, PRODUCT_CATEGORIES };
};

const downloadVendorCategoryReport = async (req, res, next) => {
  try {
    const { date, category } = req.query;

    if (!date) {
      return res.status(400).json({ message: "date query param is required" });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      return res.status(400).json({ message: "date must be YYYY-MM-DD" });
    }

    const categoryFilter =
      !category || String(category).toLowerCase() === "all" ? "all" : String(category);

    const { rowsByCategory, buildTotals, PRODUCT_CATEGORIES } = await buildVendorRowsForDate(
      date,
      categoryFilter
    );

    if (categoryFilter !== "all" && !PRODUCT_CATEGORIES.includes(categoryFilter)) {
      return res.status(400).json({
        message: `category must be one of: all, ${PRODUCT_CATEGORIES.join(", ")}`
      });
    }

    if (categoryFilter === "all") {
      const sections = PRODUCT_CATEGORIES.map((cat) => ({
        categoryLabel: cat,
        rows: rowsByCategory[cat] || [],
        totals: buildTotals(rowsByCategory[cat] || [])
      })).filter((s) => s.rows.length > 0);

      if ((rowsByCategory.Other || []).length) {
        sections.push({
          categoryLabel: "Other",
          rows: rowsByCategory.Other,
          totals: buildTotals(rowsByCategory.Other)
        });
      }

      const { filePath, fileName } = await generateVendorAllCategoriesReport({
        date,
        sections:
          sections.length > 0
            ? sections
            : PRODUCT_CATEGORIES.map((cat) => ({
                categoryLabel: cat,
                rows: [],
                totals: []
              }))
      });

      return res.download(filePath, fileName);
    }

    const rows = rowsByCategory[categoryFilter] || [];
    const { filePath, fileName } = await generateVendorCategoryReport({
      date,
      categoryLabel: categoryFilter,
      rows,
      totals: buildTotals(rows)
    });

    res.download(filePath, fileName);
  } catch (error) {
    next(error);
  }
};

const listAllAssignments = async (req, res, next) => {
  try {
    const assignments = await DeliveryAssignment.find()
      .populate({
        path: "order",
        populate: { path: "customer", select: "name email phone mapUrl" }
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
    const dailyUpdate = deliveryDate
      ? await DailyPriceUpdate.findOne({ deliveryDate }).lean()
      : null;

    const order = await Order.create({
      customer: finalCustomerId,
      items: snapshotOrderItems(items),
      subtotal,
      deliveryFee,
      total,
      estimatedTotal: total,
      dailyPriceUpdated: Boolean(dailyUpdate),
      dailyPriceUpdatedAt: dailyUpdate ? dailyUpdate.updatedAt : undefined,
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
  updateAdminOrder,
  assignDeliveryPartner,
  updateDeliveryStatus,
  getProductsForDailyPrice,
  updateDailyPrices,
  listInvoicesForAdmin,
  downloadInvoice,
  downloadPartnerDayReport,
  downloadVendorCategoryReport,
  listAllAssignments,
  getDeliveryStats,
  reorderAssignments,
  createAdminOrder
};

