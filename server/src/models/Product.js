const mongoose = require("mongoose");

// ─── Valid Categories ──────────────────────────────────────────────────────────
const PRODUCT_CATEGORIES = [
  "Seafood",
  "Fish",
  "Chicken",
  "Mutton",
  "Country Chicken"
];

// ─── Available Cut Sub-schema ─────────────────────────────────────────────────
const cutSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Cut name is required"],
      trim: true,
      maxlength: 100
    },
    price: {
      type: Number,
      required: [true, "Cut price is required"],
      min: [0, "Price cannot be negative"]
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300
    }
  },
  { _id: false } // No separate _id for sub-documents
);

// ─── Product Schema ───────────────────────────────────────────────────────────
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [160, "Name cannot exceed 160 characters"]
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: PRODUCT_CATEGORIES,
        message: `Category must be one of: ${PRODUCT_CATEGORIES.join(", ")}`
      },
      index: true
    },
    unit: {
      type: String,
      enum: ["kg", "piece"],
      default: "kg"
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"]
    },
    minPrice: {
      type: Number,
      required: [true, "Minimum price is required"],
      min: [0, "Price cannot be negative"]
    },
    maxPrice: {
      type: Number,
      required: [true, "Maximum price is required"],
      min: [0, "Price cannot be negative"]
    },
    availableCuts: {
      type: [cutSchema],
      default: []
    },
    image: {
      type: String,
      trim: true,
      default: ""
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
productSchema.index({ name: "text", description: "text" });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ minPrice: 1, maxPrice: 1 });

// ─── Pre-save: auto-generate slug + validate price range ─────────────────────
productSchema.pre("save", function (next) {
  // Auto-generate slug from name if not set
  if (!this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  // Ensure minPrice <= maxPrice
  if (this.minPrice > this.maxPrice) {
    return next(
      new Error(`minPrice (${this.minPrice}) cannot be greater than maxPrice (${this.maxPrice})`)
    );
  }

  return next();
});

// ─── Export ───────────────────────────────────────────────────────────────────
module.exports = mongoose.model("Product", productSchema);
module.exports.PRODUCT_CATEGORIES = PRODUCT_CATEGORIES;
