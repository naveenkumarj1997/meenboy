const express = require("express");
const { protect, authorizeRoles, authorizeAdminSections } = require("../middleware/auth");
const {
  getPublicBookingBanner,
  getAdminBookingBanner,
  updateBookingBanner
} = require("../controllers/bookingBannerController");

const router = express.Router();

router.get("/", getPublicBookingBanner);

router.get(
  "/admin",
  protect,
  authorizeRoles("admin"),
  authorizeAdminSections("availability"),
  getAdminBookingBanner
);

router.put(
  "/admin",
  protect,
  authorizeRoles("admin"),
  authorizeAdminSections("availability"),
  updateBookingBanner
);

module.exports = router;
