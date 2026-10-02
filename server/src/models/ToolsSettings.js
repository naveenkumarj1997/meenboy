const mongoose = require("mongoose");

const DEFAULT_REMINDER =
  "Hi {name}, this is FISHFRIENDLY. Your pending amount is ₹{amount}. " +
  "Please pay to UPI ID {upi} at your convenience. Thank you!";

/** Singleton settings used by the admin Tools section. */
const toolsSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "default" },
    upiId: { type: String, trim: true, maxlength: 80, default: "" },
    payeeName: { type: String, trim: true, maxlength: 80, default: "FISHFRIENDLY" },
    reminderTemplate: { type: String, trim: true, maxlength: 1000, default: DEFAULT_REMINDER },
    /** Cleaned weight as % of whole weight, per product (e.g. 65 = 1 kg whole gives 650 g cleaned). */
    yields: {
      type: [
        {
          productId: { type: String, required: true },
          percent: { type: Number, min: 1, max: 100, required: true }
        }
      ],
      default: []
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ToolsSettings", toolsSettingsSchema);
module.exports.DEFAULT_REMINDER = DEFAULT_REMINDER;
