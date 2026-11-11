const express = require("express");
const multer = require("multer");
const path = require("path");
const { protect, authorizeRoles, authorizeAdminSections } = require("../middleware/auth");
const {
  getPublicReviews,
  listAdminReviews,
  createReview,
  updateReview,
  deleteReview,
  getPublicPhotos,
  listAdminPhotos,
  createPhoto,
  updatePhoto,
  deletePhoto,
  getPhotoFile
} = require("../controllers/homepageContentController");

const router = express.Router();
const MAX_PHOTO_BYTES = 250 * 1024;

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (ext === ".heic" || ext === ".heif") {
      return cb(new Error("iPhone HEIC is not supported. Export as JPG first."));
    }
    const extOk = /jpe?g|png|webp/.test(ext.replace(".", ""));
    const mimeOk = /image\/(jpeg|jpg|png|webp)/i.test(file.mimetype || "");
    if (extOk && mimeOk) return cb(null, true);
    cb(new Error("Use a JPG, PNG, or WEBP photo under 250 KB."));
  }
});

const handlePhotoUpload = (req, res, next) => {
  const type = String(req.headers["content-type"] || "");
  if (!type.includes("multipart/form-data")) return next();
  photoUpload.single("image")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Photo must be under 250 KB. Compress it and try again." });
      }
      return res.status(400).json({ message: err.message || "Upload failed" });
    }
    if (err) return res.status(400).json({ message: err.message || "Upload failed" });
    next();
  });
};

router.get("/reviews", getPublicReviews);
router.get("/photos", getPublicPhotos);
router.get("/photos/file/:id", getPhotoFile);

router.get("/reviews/admin", protect, authorizeRoles("admin"), authorizeAdminSections("customer_reviews"), listAdminReviews);
router.post("/reviews/admin", protect, authorizeRoles("admin"), authorizeAdminSections("customer_reviews"), createReview);
router.put("/reviews/admin/:id", protect, authorizeRoles("admin"), authorizeAdminSections("customer_reviews"), updateReview);
router.delete("/reviews/admin/:id", protect, authorizeRoles("admin"), authorizeAdminSections("customer_reviews"), deleteReview);

router.get("/photos/admin", protect, authorizeRoles("admin"), authorizeAdminSections("sourcing_photos"), listAdminPhotos);
router.post(
  "/photos/admin",
  protect,
  authorizeRoles("admin"),
  authorizeAdminSections("sourcing_photos"),
  handlePhotoUpload,
  createPhoto
);
router.put(
  "/photos/admin/:id",
  protect,
  authorizeRoles("admin"),
  authorizeAdminSections("sourcing_photos"),
  handlePhotoUpload,
  updatePhoto
);
router.delete("/photos/admin/:id", protect, authorizeRoles("admin"), authorizeAdminSections("sourcing_photos"), deletePhoto);

module.exports = router;
