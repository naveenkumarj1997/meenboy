const User = require("../models/User");
const {
  ASSIGNABLE_SECTION_IDS,
  ADMIN_SECTIONS,
  isFullAdmin,
  normalizeAdminSections
} = require("../utils/adminSections");

const shapeAdmin = (u) => {
  const obj = u.toObject ? u.toObject() : u;
  const sections = Array.isArray(obj.adminSections) ? obj.adminSections : [];
  const full = isFullAdmin(obj);
  return {
    _id: obj._id,
    id: obj._id,
    name: obj.name,
    email: obj.email,
    phone: obj.phone || "",
    status: obj.status,
    role: obj.role,
    adminSections: sections,
    isFullAdmin: full,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt
  };
};

// @desc    List section definitions for Manage Admins UI
// @route   GET /api/users/admin-sections
// @access  Full admin
const listAdminSectionDefs = async (req, res) => {
  res.json({
    sections: ADMIN_SECTIONS.filter((s) => !s.always && !s.fullOnly),
    assignableIds: ASSIGNABLE_SECTION_IDS
  });
};

// @desc    List all admin accounts
// @route   GET /api/users/admins
// @access  Full admin
const listAdmins = async (req, res, next) => {
  try {
    const admins = await User.find({ role: "admin" })
      .select("-password -documentData")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ admins: admins.map(shapeAdmin) });
  } catch (error) {
    next(error);
  }
};

// @desc    Create admin (full or limited)
// @route   POST /api/users/admins
// @access  Full admin
const createAdmin = async (req, res, next) => {
  try {
    const { name, email, password, phone, adminSections, isFullAdmin: makeFull } = req.body;

    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ message: "Name is required" });
    }
    if (!email || !String(email).includes("@")) {
      return res.status(400).json({ message: "Valid email is required" });
    }
    if (!password || String(password).length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: "Email already exists" });
    }

    let sections = [];
    if (!makeFull) {
      sections = normalizeAdminSections(adminSections);
      if (sections === null) {
        return res.status(400).json({ message: "Invalid admin sections" });
      }
      if (sections.length === 0) {
        return res.status(400).json({
          message: "Select at least one section, or mark as full admin"
        });
      }
    }

    const admin = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      password,
      phone: phone ? String(phone).trim() : "",
      role: "admin",
      status: "active",
      isRealUser: true,
      isFullAdmin: Boolean(makeFull) || sections.length === 0,
      adminSections: sections
    });

    res.status(201).json({
      message:
        Boolean(makeFull) || sections.length === 0
          ? "Full admin created"
          : "Limited admin created",
      admin: shapeAdmin(admin)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update admin access / details
// @route   PUT /api/users/admins/:id
// @access  Full admin
const updateAdmin = async (req, res, next) => {
  try {
    const admin = await User.findById(req.params.id);
    if (!admin || admin.role !== "admin") {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Prevent locking yourself out of Manage Admins
    const selfId = String(req.user._id);
    const targetId = String(admin._id);
    if (selfId === targetId && req.body.isFullAdmin === false) {
      return res.status(400).json({
        message: "You cannot remove your own full admin access"
      });
    }
    if (selfId === targetId && req.body.status === "blocked") {
      return res.status(400).json({ message: "You cannot block your own account" });
    }

    if (req.body.name !== undefined) admin.name = String(req.body.name).trim();
    if (req.body.email !== undefined) admin.email = String(req.body.email).toLowerCase().trim();
    if (req.body.phone !== undefined) admin.phone = String(req.body.phone || "").trim();
    if (req.body.status !== undefined) {
      if (!["active", "blocked"].includes(req.body.status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      admin.status = req.body.status;
    }
    if (req.body.password) {
      if (String(req.body.password).length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      admin.password = req.body.password;
    }

    if (req.body.isFullAdmin === true) {
      admin.isFullAdmin = true;
      admin.adminSections = [];
    } else if (req.body.isFullAdmin === false || req.body.adminSections !== undefined) {
      const sections = normalizeAdminSections(req.body.adminSections ?? admin.adminSections);
      if (sections === null) {
        return res.status(400).json({ message: "Invalid admin sections" });
      }
      if (sections.length === 0) {
        return res.status(400).json({
          message: "Select at least one section, or mark as full admin"
        });
      }
      admin.isFullAdmin = false;
      admin.adminSections = sections;
    }

    await admin.save();
    res.json({ message: "Admin updated", admin: shapeAdmin(admin) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already exists" });
    }
    next(error);
  }
};

// @desc    Delete admin account
// @route   DELETE /api/users/admins/:id
// @access  Full admin
const deleteAdmin = async (req, res, next) => {
  try {
    const admin = await User.findById(req.params.id);
    if (!admin || admin.role !== "admin") {
      return res.status(404).json({ message: "Admin not found" });
    }
    if (String(admin._id) === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }
    // Keep at least one full admin
    if (isFullAdmin(admin)) {
      const fullCount = await User.countDocuments({
        role: "admin",
        $or: [{ adminSections: { $exists: false } }, { adminSections: { $size: 0 } }]
      });
      if (fullCount <= 1) {
        return res.status(400).json({
          message: "Cannot delete the last full admin account"
        });
      }
    }

    await admin.deleteOne();
    res.json({ message: "Admin deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listAdminSectionDefs,
  listAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin
};
