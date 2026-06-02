const Payment = require("../models/Payment");
const Order = require("../models/Order");
const { createNotification } = require("../utils/notifications");

const createPaymentRecord = async (req, res, next) => {
  try {
    const { order, provider, providerPaymentId, amount, currency, status, rawResponse } = req.body;

    const payment = await Payment.create({
      order,
      customer: req.user._id,
      provider,
      providerPaymentId,
      amount,
      currency,
      status,
      rawResponse
    });

    await createNotification({
      user: req.user._id,
      type: "payment_status_updated",
      title: "Payment created",
      message: `Payment record created with status: ${payment.status}`,
      metadata: { orderId: payment.order, paymentId: payment._id, status: payment.status }
    });

    res.status(201).json({ payment });
  } catch (error) {
    next(error);
  }
};

const listPaymentsForOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const payments = await Payment.find({ order: orderId }).sort({ createdAt: -1 });
    res.json({ payments });
  } catch (error) {
    next(error);
  }
};

const getMyPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({ customer: req.user._id })
      .populate("order", "total status deliveryDate deliveryTime")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ payments });
  } catch (error) {
    next(error);
  }
};

const updatePaymentStatus = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { status } = req.body;

    const payment = await Payment.findByIdAndUpdate(
      paymentId,
      { status },
      { new: true, runValidators: true }
    );
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    const order = await Order.findById(payment.order);
    if (order) {
      const mapped = status === "captured" ? "paid" : status === "failed" ? "failed" : "authorized";
      order.paymentStatus = ["paid", "failed", "authorized"].includes(mapped)
        ? mapped
        : order.paymentStatus;
      await order.save();

      await createNotification({
        user: order.customer,
        type: "payment_status_updated",
        title: "Payment status updated",
        message: `Payment status updated to: ${payment.status}`,
        metadata: { orderId: order._id, paymentId: payment._id, status: payment.status }
      });
    }

    res.json({ payment });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPaymentRecord,
  listPaymentsForOrder,
  getMyPayments,
  updatePaymentStatus
};

