const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { isFullAdmin, hasAdminSection } = require("../utils/adminSections");

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, token missing" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    if (user.status === "blocked") {
      return res.status(403).json({ message: "Account is blocked. Please contact support." });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden: insufficient permissions" });
  }

  return next();
};

/** Admin with full access, or limited admin who has at least one of the given sections. */
const authorizeAdminSections = (...sectionIds) => (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: insufficient permissions" });
  }
  if (sectionIds.length === 0 || hasAdminSection(req.user, ...sectionIds)) {
    return next();
  }
  return res.status(403).json({
    message: "Forbidden: you do not have access to this section"
  });
};

const requireFullAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin" || !isFullAdmin(req.user)) {
    return res.status(403).json({
      message: "Forbidden: only full admins can manage admin accounts"
    });
  }
  return next();
};

module.exports = {
  protect,
  authorizeRoles,
  authorizeAdminSections,
  requireFullAdmin,
  isFullAdmin,
  hasAdminSection
};
