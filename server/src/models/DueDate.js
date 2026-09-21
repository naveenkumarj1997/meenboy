const mongoose = require("mongoose");

const DUE_CATEGORIES = [
  "rent",
  "recharge",
  "renewal",
  "meeting",
  "visit",
  "purchase",
  "plan",
  "other"
];

const dueDateSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160
    },
    category: {
      type: String,
      enum: DUE_CATEGORIES,
      default: "other",
      index: true
    },
    /** Anchor / first due date (YYYY-MM-DD). For monthly, day-of-month comes from this. */
    dueDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true
    },
    recurrence: {
      type: String,
      enum: ["none", "monthly"],
      default: "none",
      index: true
    },
    /** 1–31; used when recurrence is monthly */
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31,
      default: null
    },
    amount: {
      type: Number,
      min: 0,
      default: null
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    /**
     * When admin clicks "Got it / Dismiss notify" for an occurrence,
     * we store that occurrence date so highlight stops until the next cycle.
     */
    acknowledgedForDate: {
      type: String,
      default: "",
      match: /^$|^\d{4}-\d{2}-\d{2}$/
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

dueDateSchema.pre("validate", function (next) {
  if (this.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(this.dueDate)) {
    const day = Number(this.dueDate.slice(8, 10));
    if (this.recurrence === "monthly") {
      this.dayOfMonth = day;
    }
  }
  next();
});

module.exports = mongoose.model("DueDate", dueDateSchema);
module.exports.DUE_CATEGORIES = DUE_CATEGORIES;
