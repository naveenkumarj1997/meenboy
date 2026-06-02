const mongoose = require("mongoose");

const priceUpdateSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true
    },
    previousPrice: {
      type: Number,
      required: true,
      min: 0
    },
    newPrice: {
      type: Number,
      required: true,
      min: 0
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },
  {
    timestamps: true
  }
);

priceUpdateSchema.index({ product: 1, createdAt: -1 });

module.exports = mongoose.model("PriceUpdate", priceUpdateSchema);

