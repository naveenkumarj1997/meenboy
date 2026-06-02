const mongoose = require("mongoose");

const deliveryAssignmentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ["assigned", "picked_up", "en_route", "delivered", "failed", "cancelled"],
      default: "assigned",
      index: true
    },
    estimatedArrival: {
      type: Date
    },
    actualArrival: {
      type: Date
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500
    },
    sequence: {
      type: Number,
      default: 0
    },
    paymentCollected: {
      type: Number,
      default: 0
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "none"],
      default: "none"
    }
  },
  {
    timestamps: true
  }
);

deliveryAssignmentSchema.index({ deliveryPartner: 1, status: 1 });

module.exports = mongoose.model("DeliveryAssignment", deliveryAssignmentSchema);

