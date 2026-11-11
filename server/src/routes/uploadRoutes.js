const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const { protect, authorizeRoles } = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

const MAX_DOCUMENT_BYTES = 200 * 1024; // 200 KB
const ALLOWED_DOC_TYPES = ["aadhaar", "dl", "rc", "voter_id"];

const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Image uploads stay on disk (product images)
const imageStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

function checkFileType(file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === ".heic" || ext === ".heif" || String(file.mimetype || "").includes("heic")) {
    return cb(new Error("iPhone HEIC photos are not supported. Open the photo, export or share as JPG, then upload."));
  }
  const filetypes = /jpg|jpeg|png|webp/;
  const extname = filetypes.test(ext);
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error("Use a JPG, PNG, or WEBP photo (not HEIC / PDF)."));
}

const upload = multer({
  storage: imageStorage,
  fileFilter(req, file, cb) {
    checkFileType(file, cb);
  },
  limits: { fileSize: 8 * 1024 * 1024 }
});

/**
 * @desc    Upload single image
 * @route   POST /api/upload
 * @access  Private/Admin
 */
router.post("/", protect, authorizeRoles("admin"), (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: "Photo must be under 8 MB. Compress it or export as JPG, then try again."
        });
      }
      return res.status(400).json({ message: err.message || "Upload failed" });
    }
    if (err) {
      return res.status(400).json({ message: err.message || "Upload failed" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "No image provided" });
    }

    const imagePath = `/uploads/${req.file.filename}`;
    res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      url: imagePath
    });
  });
});

// Partner PDF → memory → MongoDB (no disk needed on host)
const uploadDocument = multer({
  storage: multer.memoryStorage(),
  fileFilter(req, file, cb) {
    const extOk = path.extname(file.originalname).toLowerCase() === ".pdf";
    const mimeOk = file.mimetype === "application/pdf";
    if (extOk && mimeOk) return cb(null, true);
    cb(new Error("PDF only. Please upload a .pdf file."));
  },
  limits: { fileSize: MAX_DOCUMENT_BYTES }
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "PDF must be under 200 KB. Compress the file and try again."
      });
    }
    return res.status(400).json({ message: err.message || "Upload failed" });
  }
  if (err) {
    return res.status(400).json({ message: err.message || "Upload failed" });
  }
  next();
};

/**
 * @desc    Upload partner verification document (PDF ≤ 200KB) into DB
 * @route   POST /api/upload/document
 * @access  Private/DeliveryPartner
 */
router.post(
  "/document",
  protect,
  authorizeRoles("delivery_partner"),
  (req, res, next) => {
    uploadDocument.single("document")(req, res, (err) => handleMulterError(err, req, res, next));
  },
  async (req, res) => {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ message: "No PDF document provided" });
      }

      if (req.file.size > MAX_DOCUMENT_BYTES) {
        return res.status(400).json({
          message: "PDF must be under 200 KB. Compress the file and try again."
        });
      }

      const documentType = String(req.body.documentType || "").toLowerCase().trim();
      if (!ALLOWED_DOC_TYPES.includes(documentType)) {
        return res.status(400).json({
          message: "Select document type: Aadhaar, DL, RC, or Voter ID"
        });
      }

      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.documentData = req.file.buffer;
      user.documentMimeType = "application/pdf";
      user.documentFileName = req.file.originalname || `${documentType}.pdf`;
      user.documentType = documentType;
      user.documentUploadedAt = new Date();
      // Clear legacy disk path if any
      user.documentUrl = "";

      if (req.body.phone) {
        user.phone = String(req.body.phone).trim();
      }

      await user.save();

      res.status(200).json({
        success: true,
        message: "Document uploaded successfully",
        hasDocument: true,
        documentType: user.documentType,
        documentFileName: user.documentFileName,
        phone: user.phone
      });
    } catch (error) {
      console.error("Partner document upload failed:", error);
      res.status(500).json({
        message: "Failed to save document. Please try again.",
        error: error.message
      });
    }
  }
);

module.exports = router;
