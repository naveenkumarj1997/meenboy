const express = require("express");
const router = express.Router();
const {
  getAvailability,
  getAvailabilityByDate,
  updateAvailability
} = require("../controllers/availabilityController");
const { protect, authorizeRoles, authorizeAdminSections } = require("../middleware/auth");

// Public route to check availability for a specific date
router.get("/:date", getAvailabilityByDate);

// Admin only routes
router.use(protect);
router.use(authorizeRoles("admin"));
router.use(authorizeAdminSections("availability"));

router.get("/", getAvailability);
router.put("/:date", updateAvailability);

module.exports = router;
