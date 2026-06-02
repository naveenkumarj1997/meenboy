const express = require("express");
const multer = require("multer");
const path = require("path");
const { protect, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

// Setup Multer Storage
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, "uploads/"); // Make sure this folder exists
  },
  filename(req, file, cb) {
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  }
});

// File validation
function checkFileType(file, cb) {
  const filetypes = /jpg|jpeg|png|webp/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Images only! (jpg, jpeg, png, webp)"));
  }
}

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * @desc    Upload single image
 * @route   POST /api/upload
 * @access  Private/Admin
 */
router.post("/", protect, authorizeRoles("admin"), upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No image provided" });
  }
  
  // Return the path starting with /uploads/
  const imagePath = `/uploads/${req.file.filename}`;
  
  res.status(200).json({
    success: true,
    message: "Image uploaded successfully",
    url: imagePath
  });
});

// PDF validation for documents
function checkDocumentType(file, cb) {
  const filetypes = /pdf/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("PDF only!"));
  }
}

const uploadDocument = multer({
  storage,
  fileFilter: function (req, file, cb) {
    checkDocumentType(file, cb);
  },
  limits: { fileSize: 1 * 1024 * 1024 } // 1MB limit
});

/**
 * @desc    Upload partner verification document (PDF)
 * @route   POST /api/upload/document
 * @access  Private/DeliveryPartner
 */
router.post("/document", protect, authorizeRoles("delivery_partner"), uploadDocument.single("document"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No document provided" });
  }
  
  try {
    const documentUrl = `/uploads/${req.file.filename}`;
    
    // Save to user profile
    req.user.documentUrl = documentUrl;
    
    // If phone number is provided in the body, update it too
    if (req.body.phone) {
      req.user.phone = req.body.phone;
    }
    
    await req.user.save();
    
    res.status(200).json({
      success: true,
      message: "Document uploaded successfully",
      url: documentUrl,
      phone: req.user.phone
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to save document to user profile", error: error.message });
  }
});

module.exports = router;
