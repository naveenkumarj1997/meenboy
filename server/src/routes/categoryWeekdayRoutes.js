const express = require("express");
const { protect, authorizeRoles, authorizeAdminSections } = require("../middleware/auth");
const {
  getPublicCategoryWeekdayRules,
  getAdminCategoryWeekdayRules,
  updateAdminCategoryWeekdayRules
} = require("../controllers/categoryWeekdayController");

const router = express.Router();

router.get("/", getPublicCategoryWeekdayRules);

router.get(
  "/admin",
  protect,
  authorizeRoles("admin"),
  authorizeAdminSections("availability"),
  getAdminCategoryWeekdayRules
);

router.put(
  "/admin",
  protect,
  authorizeRoles("admin"),
  authorizeAdminSections("availability"),
  updateAdminCategoryWeekdayRules
);

module.exports = router;
