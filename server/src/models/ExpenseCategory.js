const mongoose = require("mongoose");

const expenseCategorySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 80
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
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

module.exports = mongoose.model("ExpenseCategory", expenseCategorySchema);
