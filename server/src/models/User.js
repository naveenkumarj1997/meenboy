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
    status: {
      type: String,
      enum: ["active", "blocked", "pending", "rejected"],
      default: "active"
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
