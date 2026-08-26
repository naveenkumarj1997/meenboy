const mongoose = require("mongoose");

const walkInItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product"
    },
    productName: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      trim: true,
      default: ""
    },
    cutName: {
      type: String,
      trim: true,
      default: ""
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.01
    },
    unit: {
      type: String,
      enum: ["kg", "piece"],
      default: "kg"
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
  },
  { _id: false }
);

const walkInSaleSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    saleDate: {
      type: String,
      required: true,
      index: true,
      match: /^\d{4}-\d{2}-\d{2}$/
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
      index: true,
      maxlength: 20
    },
    items: {
      type: [walkInItemSchema],
      validate: [(v) => Array.isArray(v) && v.length > 0, "At least one item is required"]
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "other"],
      default: "cash"
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    invoicePath: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

walkInSaleSchema.index({ customerPhone: 1, saleDate: -1 });
walkInSaleSchema.index({ createdAt: -1 });

module.exports = mongoose.model("WalkInSale", walkInSaleSchema);
