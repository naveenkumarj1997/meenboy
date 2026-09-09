const mongoose = require("mongoose");

const partnerPetrolAllowanceSchema = new mongoose.Schema(
  {
    date: {
      type: String, // YYYY-MM-DD
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

partnerPetrolAllowanceSchema.index({ date: 1, deliveryPartner: 1 }, { unique: true });

module.exports = mongoose.model("PartnerPetrolAllowance", partnerPetrolAllowanceSchema);
