const mongoose = require("mongoose");

const sourcingPhotoSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true, trim: true },
    caption: { type: String, trim: true, maxlength: 160, default: "" },
    category: {
      type: String,
      enum: ["fishing", "sourcing", "cutting"],
      default: "sourcing"
    },
    isPublished: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true }
);

sourcingPhotoSchema.index({ isPublished: 1, sortOrder: 1, createdAt: -1 });

module.exports = mongoose.model("SourcingPhoto", sourcingPhotoSchema);
