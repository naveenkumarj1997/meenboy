const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["collection", "payment"],
      required: true,
      index: true
    },
    category: {
      type: String,
      enum: ["cod", "upi", "partner_collection", "salary", "other"],
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    referenceUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    referenceOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order"
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "completed",
      index: true
    },
    notes: {
      type: String,
      trim: true
    },
    date: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

transactionSchema.index({ type: 1, category: 1, date: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
