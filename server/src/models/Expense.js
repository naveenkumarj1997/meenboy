const mongoose = require("mongoose");

/** Business operating expenses (not vendor fish/meat purchases) */
const EXPENSE_CATEGORIES = [
  "travel",
  "shop_supplies",
  "rent",
  "shop_advance",
  "domain",
  "utilities",
  "packaging",
  "marketing",
  "fuel",
  "salary_misc",
  "maintenance",
  "other"
];

const expenseSchema = new mongoose.Schema(
  {
    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    title: {
      type: String,
      trim: true,
      maxlength: 200,
      default: ""
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "bank", "card", "other"],
      default: "cash"
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

expenseSchema.index({ date: -1, category: 1 });

const Expense = mongoose.model("Expense", expenseSchema);

module.exports = Expense;
module.exports.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;
module.exports.CATEGORY_LABELS = {
  travel: "Travel / market visit",
  shop_supplies: "Shop supplies / things for shop",
  rent: "Monthly rent",
  shop_advance: "Shop advance",
  domain: "Domain / website",
  utilities: "Utilities (electricity, water, etc.)",
  packaging: "Packaging / bags",
  marketing: "Marketing / ads",
  fuel: "Fuel / vehicle",
  salary_misc: "Staff / helper pay (misc)",
  maintenance: "Maintenance / repair",
  other: "Other"
};
