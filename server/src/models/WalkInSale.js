const mongoose = require("mongoose");

const walkInItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product"
    },
    catchItemId: {
      type: String,
      trim: true,
      default: ""
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

const walkInPaymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0.01 },
    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "card", "other"],
      required: true
    },
    notes: { type: String, trim: true, maxlength: 300, default: "" },
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    collectedAt: { type: Date, default: Date.now }
  },
  { _id: true }
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
    /** Legacy primary method; last collection method is preferred for display */
    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "card", "other", "pending"],
      default: "pending"
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid"],
      default: "pending",
      index: true
    },
    amountPaid: {
      type: Number,
      min: 0,
      default: 0
    },
    payments: {
      type: [walkInPaymentSchema],
      default: []
    },
    paidAt: {
      type: Date,
      default: null
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },
    status: {
      type: String,
      enum: ["active", "cancelled"],
      default: "active",
      index: true
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    cancelReason: {
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
walkInSaleSchema.index({ saleDate: 1, paymentStatus: 1 });
walkInSaleSchema.index({ status: 1, saleDate: -1 });

walkInSaleSchema.virtual("amountDue").get(function amountDue() {
  return Math.max(0, Math.round((Number(this.total || 0) - Number(this.amountPaid || 0)) * 100) / 100);
});

walkInSaleSchema.set("toJSON", { virtuals: true });
walkInSaleSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("WalkInSale", walkInSaleSchema);
