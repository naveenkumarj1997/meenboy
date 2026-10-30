const mongoose = require("mongoose");

const customerReviewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    place: { type: String, trim: true, maxlength: 80, default: "" },
    review: { type: String, required: true, trim: true, maxlength: 600 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    isPublished: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

customerReviewSchema.index({ isPublished: 1, sortOrder: 1, createdAt: -1 });

module.exports = mongoose.model("CustomerReview", customerReviewSchema);
