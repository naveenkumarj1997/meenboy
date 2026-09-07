const mongoose = require("mongoose");

const todayCatchItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    price: { type: Number, required: true, min: 0 },
    unit: { type: String, trim: true, maxlength: 40, default: "kg" },
    note: { type: String, trim: true, maxlength: 200, default: "" },
    /** Max qty customers can order (e.g. 4 kg). Min on site is 0.5. */
    availableQty: { type: Number, min: 0, default: 0 },
    imageUrl: { type: String, trim: true, default: "" },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null
    },
    sortOrder: { type: Number, default: 0 }
  },
  { _id: true }
);

/** Singleton homepage "Today's Catch" board (key = default). */
const todayCatchSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "default"
    },
    enabled: {
      type: Boolean,
      default: false
    },
    headline: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "Stock Available"
    },
    subheadline: {
      type: String,
      trim: true,
      maxlength: 240,
      default: "See what's in stock today — price & quantity. Order fast on WhatsApp."
    },
    items: {
      type: [todayCatchItemSchema],
      default: []
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("TodayCatch", todayCatchSchema);
