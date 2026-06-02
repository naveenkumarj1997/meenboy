const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"],
      default: "pending",
      index: true
    },
    items: [
      {
        product: {
          type: String,
          required: true
        },
        productName: {
          type: String,
          required: true
        },
        productImage: {
          type: String
        },
        quantity: {
          type: Number,
          required: true,
          min: 0.1
        },
        unit: {
          type: String,
          default: "kg"
        },
        cutName: {
          type: String,
          trim: true
        },
        notes: {
          type: String,
          trim: true
        },
        unitPrice: {
          type: Number,
          required: true,
          min: 0
        },
        totalPrice: {
          type: Number,
          required: true,
          min: 0
        }
      }
    ],
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    deliveryFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "authorized", "paid", "refunded", "failed"],
      default: "pending"
    },
    address: {
      line1: { type: String, required: true, trim: true },
      line2: { type: String, trim: true },
      city: { type: String, required: true, trim: true },
      state: { type: String, required: true, trim: true },
      postalCode: { type: String, required: true, trim: true },
      country: { type: String, required: true, trim: true, default: "India" },
      phone: { type: String, trim: true }
    },
    mapUrl: {
      type: String,
      trim: true
    },
    invoicePath: {
      type: String,
      trim: true
    },
    deliveryDate: {
      type: String, // Storing as YYYY-MM-DD
      required: true
    },
    deliveryTime: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ customer: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);

