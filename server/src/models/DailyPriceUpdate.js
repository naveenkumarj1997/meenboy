const mongoose = require("mongoose");

const dailyPriceUpdateSchema = new mongoose.Schema(
  {
    deliveryDate: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    items: [
      {
        productName: String,
        cutName: String,
        unit: { type: String, default: "kg" },
        quantity: Number,
        bookedUnitPrice: Number,
        dailyUnitPrice: Number,
        amountDifference: Number
      }
    ],
    savedRates: [
      {
        productId: String,
        productName: String,
        cutName: String,
        unitPrice: Number
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("DailyPriceUpdate", dailyPriceUpdateSchema);
