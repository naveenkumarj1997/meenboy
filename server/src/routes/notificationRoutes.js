const express = require("express");
const { protect } = require("../middleware/auth");
const {
  listMyNotifications,
  markNotificationRead
} = require("../controllers/notificationController");

const router = express.Router();

router.get("/", protect, listMyNotifications);
router.patch("/:id/read", protect, markNotificationRead);

module.exports = router;

