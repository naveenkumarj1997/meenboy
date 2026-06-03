const mongoose = require("mongoose");

const partnerSalarySchema = new mongoose.Schema(
  {
    date: {
      type: String, // Storing as YYYY-MM-DD
      required: true,
      index: true
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    partnerConfirmed: {
      type: Boolean,
      default: false
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

// Ensure one salary entry per partner per day
partnerSalarySchema.index({ date: 1, deliveryPartner: 1 }, { unique: true });

module.exports = mongoose.model("PartnerSalary", partnerSalarySchema);
