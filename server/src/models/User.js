const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const roles = ["customer", "admin", "delivery_partner"];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false
    },
    role: {
      type: String,
      enum: roles,
      default: "customer"
    },
    // How the customer account was created
    customerSource: {
      type: String,
      enum: ["website", "manual"],
      default: "website",
      index: true
    },
    status: {
      type: String,
      enum: ["active", "blocked", "pending", "rejected"],
      default: "active"
    },
    /** Production user — new accounts default to real; mark false for test accounts */
    isRealUser: {
      type: Boolean,
      default: true,
      index: true
    },
    isNoticed: {
      type: Boolean,
      default: false
    },
    phone: {
      type: String,
      trim: true
    },
    mapUrl: {
      type: String,
      trim: true
    },
    documentUrl: {
      type: String,
      trim: true
    },
    // Partner verification PDF stored in DB (max ~200KB)
    documentType: {
      type: String,
      enum: ["aadhaar", "dl", "rc", "voter_id", ""],
      default: ""
    },
    documentFileName: {
      type: String,
      trim: true,
      default: ""
    },
    documentMimeType: {
      type: String,
      trim: true,
      default: ""
    },
    documentData: {
      type: Buffer,
      select: false
    },
    documentUploadedAt: {
      type: Date
    },
    address: {
      line1: { type: String, trim: true },
      line2: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      postalCode: { type: String, trim: true },
      country: { type: String, trim: true, default: "India" }
    },
    pendingBalance: {
      type: Number,
      default: 0,
      min: 0
    },
    adminPreferences: {
      usersAccountFilter: {
        type: String,
        enum: ["real", "test"],
        default: "real"
      }
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  return next();
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
