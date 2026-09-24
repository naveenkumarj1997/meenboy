const express = require("express");
const { protect, authorizeRoles, authorizeAdminSections } = require("../middleware/auth");
const {
  getPublicTodayCatch,
  getAdminTodayCatch,
  updateTodayCatch
} = require("../controllers/todayCatchController");

const router = express.Router();

router.get("/", getPublicTodayCatch);

router.get(
  "/admin",
  protect,
  authorizeRoles("admin"),
  authorizeAdminSections("todays_catch", "products", "daily_prices", "walk_in"),
  getAdminTodayCatch
);

router.put(
  "/admin",
  protect,
  authorizeRoles("admin"),
  authorizeAdminSections("todays_catch", "products", "daily_prices"),
  updateTodayCatch
);

module.exports = router;
