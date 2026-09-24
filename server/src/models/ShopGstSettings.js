const mongoose = require("mongoose");

/**
 * Single-document shop GST settings for Fish Friendly (Madurai / TN B2C).
 * Rates are configurable — confirm with your CA for fresh fish/meat HSN slabs.
 */
const categoryRateSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, trim: true },
    hsnCode: { type: String, trim: true, default: "" },
    gstRatePercent: { type: Number, min: 0, max: 28, default: 0 }
  },
  { _id: false }
);

const shopGstSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "default",
      unique: true
    },
    legalName: {
      type: String,
      trim: true,
      default: "FISHFRIENDLY"
    },
    tradeName: {
      type: String,
      trim: true,
      default: "FISHFRIENDLY"
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: ""
    },
    stateCode: {
      type: String,
      trim: true,
      default: "33"
    },
    stateName: {
      type: String,
      trim: true,
      default: "Tamil Nadu"
    },
    addressLine1: {
      type: String,
      trim: true,
      default: "177, Kalai Nagar"
    },
    addressLine2: {
      type: String,
      trim: true,
      default: "Thanakkankulam"
    },
    city: {
      type: String,
      trim: true,
      default: "Madurai"
    },
    postalCode: {
      type: String,
      trim: true,
      default: "625006"
    },
    phone: {
      type: String,
      trim: true,
      default: "+91 9087894319"
    },
    email: {
      type: String,
      trim: true,
      default: "fishfriendlymeats@gmail.com"
    },
    /** Prices charged to customers already include GST */
    pricesInclusive: {
      type: Boolean,
      default: true
    },
    registrationType: {
      type: String,
      enum: ["regular", "composition", "unregistered"],
      default: "unregistered"
    },
    deliveryFeeGstRatePercent: {
      type: Number,
      min: 0,
      max: 28,
      default: 0
    },
    deliveryFeeHsn: {
      type: String,
      trim: true,
      default: ""
    },
    categoryRates: {
      type: [categoryRateSchema],
      default: () => [
        { category: "Fish", hsnCode: "0302", gstRatePercent: 0 },
        { category: "Seafood", hsnCode: "0306", gstRatePercent: 0 },
        { category: "Chicken", hsnCode: "0207", gstRatePercent: 0 },
        { category: "Country Chicken", hsnCode: "0207", gstRatePercent: 0 },
        { category: "Mutton", hsnCode: "0204", gstRatePercent: 0 }
      ]
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default:
        "Fresh fish/meat GST treatment varies. Update HSN & rates after CA advice. This section prepares sales records for GSTR entry — it does not file returns."
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ShopGstSettings", shopGstSettingsSchema);
