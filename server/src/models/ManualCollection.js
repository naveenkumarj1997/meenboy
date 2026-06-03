const mongoose = require("mongoose");

const manualCollectionSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01
    },
    paymentMethod: {
      type: String,
      default: "manual"
    },
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

manualCollectionSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ManualCollection", manualCollectionSchema);
