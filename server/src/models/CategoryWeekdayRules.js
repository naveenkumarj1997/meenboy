const mongoose = require("mongoose");
const { PRODUCT_CATEGORIES } = require("./Product");

const categoryRuleSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: PRODUCT_CATEGORIES,
      required: true
    },
    /** JS weekday numbers: 0=Sun … 6=Sat. Empty = never deliverable via website rules. */
    deliveryWeekdays: {
      type: [Number],
      default: [0, 1, 2, 3, 4, 5, 6],
      validate: {
        validator(arr) {
          return Array.isArray(arr) && arr.every((n) => Number.isInteger(n) && n >= 0 && n <= 6);
        },
        message: "deliveryWeekdays must be integers 0–6"
      }
    },
    cutoffEnabled: { type: Boolean, default: false },
    /** Must place website order this many calendar days before delivery day. */
    cutoffDaysBefore: { type: Number, default: 2, min: 0, max: 14 },
    /** Cutoff clock time in Asia/Kolkata (24h). Default 21:00 = 9 PM. */
    cutoffHour: { type: Number, default: 21, min: 0, max: 23 },
    cutoffMinute: { type: Number, default: 0, min: 0, max: 59 }
  },
  { _id: false }
);

const categoryWeekdayRulesSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    enabled: { type: Boolean, default: true },
    rules: { type: [categoryRuleSchema], default: [] },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("CategoryWeekdayRules", categoryWeekdayRulesSchema);
