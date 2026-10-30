const express = require("express");
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
  deletePhoto
} = require("../controllers/homepageContentController");

const router = express.Router();

router.get("/reviews", getPublicReviews);
router.get("/photos", getPublicPhotos);

router.get("/reviews/admin", protect, authorizeRoles("admin"), authorizeAdminSections("customer_reviews"), listAdminReviews);
router.post("/reviews/admin", protect, authorizeRoles("admin"), authorizeAdminSections("customer_reviews"), createReview);
router.put("/reviews/admin/:id", protect, authorizeRoles("admin"), authorizeAdminSections("customer_reviews"), updateReview);
router.delete("/reviews/admin/:id", protect, authorizeRoles("admin"), authorizeAdminSections("customer_reviews"), deleteReview);

router.get("/photos/admin", protect, authorizeRoles("admin"), authorizeAdminSections("sourcing_photos"), listAdminPhotos);
router.post("/photos/admin", protect, authorizeRoles("admin"), authorizeAdminSections("sourcing_photos"), createPhoto);
router.put("/photos/admin/:id", protect, authorizeRoles("admin"), authorizeAdminSections("sourcing_photos"), updatePhoto);
router.delete("/photos/admin/:id", protect, authorizeRoles("admin"), authorizeAdminSections("sourcing_photos"), deletePhoto);

module.exports = router;
