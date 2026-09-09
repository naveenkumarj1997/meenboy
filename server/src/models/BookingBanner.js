const mongoose = require("mongoose");

/** Singleton homepage fish-banner announcement (key = default). */
const bookingBannerSchema = new mongoose.Schema(
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
    message: {
      type: String,
      trim: true,
      maxlength: 180,
      default: ""
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("BookingBanner", bookingBannerSchema);
