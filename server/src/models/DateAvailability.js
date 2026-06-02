const mongoose = require("mongoose");
const { PRODUCT_CATEGORIES } = require("./Product");

const dateAvailabilitySchema = new mongoose.Schema(
  {
    date: {
      type: String, // format: YYYY-MM-DD
      required: true,
      unique: true,
      index: true
    },
    isClosed: {
      type: Boolean,
      default: false
    },
    unavailableCategories: {
      type: [String],
      enum: PRODUCT_CATEGORIES,
      default: []
    },
    unavailableProducts: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Product",
      default: []
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("DateAvailability", dateAvailabilitySchema);
