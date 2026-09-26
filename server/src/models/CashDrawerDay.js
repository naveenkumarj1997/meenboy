const mongoose = require("mongoose");

/**
 * Cashier drawer day record for Walk-in Accounts:
 * opening float, counted closing, cash handed to manager/bank.
 */
const cashDrawerDaySchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      unique: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true
    },
    openingCash: {
      type: Number,
      min: 0,
      default: 0
    },
    closingCashCounted: {
      type: Number,
      min: 0,
      default: null
    },
    cashToManager: {
      type: Number,
      min: 0,
      default: 0
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    closedAt: {
      type: Date,
      default: null
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("CashDrawerDay", cashDrawerDaySchema);
