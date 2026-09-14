const mongoose = require("mongoose");

const alertEmailSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    emails: {
      type: [String],
      default: [],
      validate: {
        validator(arr) {
          return Array.isArray(arr) && arr.length <= 30;
        },
        message: "At most 30 alert emails allowed"
      }
    },
    notifyWebsiteBooking: { type: Boolean, default: true },
    notifyContactQuery: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AlertEmailSettings", alertEmailSettingsSchema);
