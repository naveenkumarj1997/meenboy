const { validationResult } = require("express-validator");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const publicUser = (user) => {
  const u = user.toObject ? user.toObject() : user;
  delete u.password;
  delete u.documentData;
  const adminSections = Array.isArray(u.adminSections) ? u.adminSections : [];
  const full =
    u.role === "admin"
      ? u.isFullAdmin === false
        ? false
        : u.isFullAdmin === true
          ? true
          : adminSections.length === 0
      : undefined;
  return {
    ...u,
    id: u._id || u.id,
    hasDocument: Boolean(u.documentUploadedAt || u.documentUrl),
    documentType: u.documentType || "",
    adminSections: u.role === "admin" ? adminSections : undefined,
    isFullAdmin: u.role === "admin" ? full : undefined
  };
};

const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role, phone } = req.body;

    // Admins must be created from Manage Admins (not public register)
    if (role === "admin") {
      return res.status(403).json({
        message: "Admin accounts can only be created by a full admin"
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      phone,
      status: role === "delivery_partner" ? "pending" : "active",
      customerSource: role === "customer" ? "website" : undefined
    });

    const token = generateToken(user._id, user.role);

    return res.status(201).json({
      token,
      user: publicUser(user)
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.status === "blocked") {
      return res.status(403).json({ message: "Account is blocked. Please contact support." });
    }

    if (user.status === "rejected") {
      return res.status(403).json({ message: "Your application was rejected." });
    }

    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      token,
      user: publicUser(user)
    });
  } catch (error) {
    return next(error);
  }
};

const me = async (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.status(200).json({
    user: publicUser(req.user)
  });
};

const listDeliveryPartners = async (req, res, next) => {
  try {
    const includePending = String(req.query.includePending || "").toLowerCase() === "true";
    const query = {
      role: "delivery_partner",
      isRealUser: true,
      status: includePending ? { $in: ["active", "pending"] } : "active"
    };
    const partners = await User.find(query).select("-password").sort({ name: 1 });
    res.json({ deliveryPartners: partners });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, me, listDeliveryPartners };
