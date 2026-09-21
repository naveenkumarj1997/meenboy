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
    isFullAdmin: u.role === "admin" ? full : undefined,
    hasNdaAccepted: Boolean(u.ndaAccepted || u.ndaAcceptedAt),
    aadhaarNumber: u.aadhaarNumber || "",
    dlNumber: u.dlNumber || "",
    bikeRcNumber: u.bikeRcNumber || "",
    bikeNumber: u.bikeNumber || "",
    ndaAcceptedAt: u.ndaAcceptedAt || null,
    ndaDownloadedAt: u.ndaDownloadedAt || null
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

/** Partner: save NDA hire details + accept agreement */
const submitPartnerNda = async (req, res, next) => {
  try {
    if (req.user.role !== "delivery_partner") {
      return res.status(403).json({ message: "Only delivery partners can submit NDA" });
    }

    const aadhaarNumber = String(req.body.aadhaarNumber || "").trim();
    const dlNumber = String(req.body.dlNumber || "").trim();
    const bikeRcNumber = String(req.body.bikeRcNumber || "").trim();
    const bikeNumber = String(req.body.bikeNumber || "").trim().toUpperCase();
    const accepted = Boolean(req.body.accepted);
    const downloaded = Boolean(req.body.downloaded);

    if (!aadhaarNumber || aadhaarNumber.replace(/\s/g, "").length < 8) {
      return res.status(400).json({ message: "Enter a valid Aadhaar number" });
    }
    if (!dlNumber || dlNumber.length < 5) {
      return res.status(400).json({ message: "Enter a valid DL number" });
    }
    if (!bikeRcNumber || bikeRcNumber.length < 5) {
      return res.status(400).json({ message: "Enter a valid bike RC number" });
    }
    if (!bikeNumber || bikeNumber.length < 4) {
      return res.status(400).json({ message: "Enter a valid bike number" });
    }
    if (!downloaded) {
      return res.status(400).json({ message: "Download the NDA PDF before accepting" });
    }
    if (!accepted) {
      return res.status(400).json({ message: "You must accept the NDA agreement" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.aadhaarNumber = aadhaarNumber;
    user.dlNumber = dlNumber;
    user.bikeRcNumber = bikeRcNumber;
    user.bikeNumber = bikeNumber;
    user.ndaAccepted = true;
    user.ndaAcceptedAt = new Date();
    if (!user.ndaDownloadedAt) user.ndaDownloadedAt = new Date();
    if (req.body.phone) user.phone = String(req.body.phone).trim();

    await user.save();

    res.json({
      message: "NDA details saved. Print, sign, and give the paper to admin. Then upload ID proof.",
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
};

/** Partner: download NDA PDF (uses saved details or body draft fields) */
const downloadPartnerNdaPdf = async (req, res, next) => {
  try {
    if (req.user.role !== "delivery_partner" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not allowed" });
    }

    let partner = req.user;
    if (req.user.role === "delivery_partner") {
      partner = await User.findById(req.user._id).select(
        "name email phone aadhaarNumber dlNumber bikeRcNumber bikeNumber"
      );
      if (!partner) return res.status(404).json({ message: "User not found" });

      // Prefer draft query/body so they can download before submit
      const draft = {
        name: partner.name,
        email: partner.email,
        phone: String(req.query.phone || partner.phone || ""),
        aadhaarNumber: String(req.query.aadhaarNumber || partner.aadhaarNumber || ""),
        dlNumber: String(req.query.dlNumber || partner.dlNumber || ""),
        bikeRcNumber: String(req.query.bikeRcNumber || partner.bikeRcNumber || ""),
        bikeNumber: String(req.query.bikeNumber || partner.bikeNumber || "")
      };

      const { generatePartnerNdaPdf } = require("../utils/pdfPartnerNda");
      const buffer = await generatePartnerNdaPdf(draft);

      partner.ndaDownloadedAt = new Date();
      await partner.save();

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="FishFriendly-Partner-NDA.pdf"`
      );
      return res.send(buffer);
    }

    // Admin download for a partner id
    const partnerId = req.query.partnerId;
    if (!partnerId) {
      return res.status(400).json({ message: "partnerId required" });
    }
    const user = await User.findById(partnerId).select(
      "name email phone aadhaarNumber dlNumber bikeRcNumber bikeNumber role"
    );
    if (!user || user.role !== "delivery_partner") {
      return res.status(404).json({ message: "Partner not found" });
    }
    const { generatePartnerNdaPdf } = require("../utils/pdfPartnerNda");
    const buffer = await generatePartnerNdaPdf(user);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="NDA-${String(user.name || "partner").replace(/\s+/g, "-")}.pdf"`
    );
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

/** Public: check if email can use forgot-password (no SMTP). */
const verifyEmailForReset = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const email = String(req.body.email || "").trim().toLowerCase();
    const user = await User.findOne({ email }).select("role status name email");

    if (!user) {
      return res.json({
        exists: false,
        message: "No account found with this email."
      });
    }

    if (user.role === "admin") {
      return res.json({
        exists: false,
        message: "Admin passwords can only be changed by a full admin in Manage Admins / Users."
      });
    }

    if (user.status === "blocked") {
      return res.status(403).json({
        exists: true,
        message: "Account is blocked. Please contact support."
      });
    }

    return res.json({
      exists: true,
      email: user.email,
      name: user.name,
      message: "Email verified. You can set a new password."
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Public forgot-password without email OTP (no SMTP).
 * Anyone who knows the account email can set a new password — use only when SMTP is unavailable.
 */
const resetPasswordByEmail = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const confirmPassword = String(req.body.confirmPassword || "");

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const user = await User.findOne({ email }).select("+password role status");
    if (!user) {
      return res.status(404).json({ message: "No account found with this email." });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        message: "Admin passwords cannot be reset here. Ask a full admin."
      });
    }

    if (user.status === "blocked") {
      return res.status(403).json({ message: "Account is blocked. Please contact support." });
    }

    user.password = password;
    await user.save();

    return res.json({
      message: "Password updated. You can log in with your new password."
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  login,
  me,
  listDeliveryPartners,
  verifyEmailForReset,
  resetPasswordByEmail,
  submitPartnerNda,
  downloadPartnerNdaPdf
};
