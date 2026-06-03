const mongoose = require("mongoose");

const dailyPurchaseSchema = new mongoose.Schema(
  {
    date: {
      type: String, // Storing as YYYY-MM-DD for exact daily matching
      required: true,
      unique: true,
      index: true
    },
    chickenShop: {
      type: Number,
      default: 0,
      min: 0
    },
    muttonShop: {
      type: Number,
      default: 0,
      min: 0
    },
    fishCompany: {
      type: Number,
      default: 0,
      min: 0
    },
    localFishShop: {
      type: Number,
      default: 0,
      min: 0
    },
    chickenShopSettled: {
      type: Number,
      default: 0,
      min: 0
    },
    muttonShopSettled: {
      type: Number,
      default: 0,
      min: 0
    },
    fishCompanySettled: {
      type: Number,
      default: 0,
      min: 0
    },
    localFishShopSettled: {
      type: Number,
      default: 0,
      min: 0
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

// Virtual for total
dailyPurchaseSchema.virtual("total").get(function () {
  return (this.chickenShop || 0) + (this.muttonShop || 0) + (this.fishCompany || 0) + (this.localFishShop || 0);
});

// Virtual for total settled
dailyPurchaseSchema.virtual("totalSettled").get(function () {
  return (this.chickenShopSettled || 0) + (this.muttonShopSettled || 0) + (this.fishCompanySettled || 0) + (this.localFishShopSettled || 0);
});

// Ensure virtuals are included in JSON
dailyPurchaseSchema.set("toJSON", { virtuals: true });
dailyPurchaseSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("DailyPurchase", dailyPurchaseSchema);
