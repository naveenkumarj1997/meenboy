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
    bookingSource: {
      type: String,
      enum: ["website", "manual"],
      default: "website",
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
        },
        estimatedUnitPrice: {
          type: Number,
          min: 0
        },
        estimatedTotalPrice: {
          type: Number,
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
    discountAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    discountNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },
    addonAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    addonNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    estimatedTotal: {
      type: Number,
      min: 0
    },
    dailyPriceUpdated: {
      type: Boolean,
      default: false,
      index: true
    },
    dailyPriceUpdatedAt: {
      type: Date
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
      phone: { type: String, trim: true },
      alternatePhone: { type: String, trim: true, default: "" }
    },
    mapUrl: {
      type: String,
      trim: true
    },
    customerNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
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

