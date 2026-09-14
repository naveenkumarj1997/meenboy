const express = require("express");
const { protect, authorizeRoles, authorizeAdminSections } = require("../middleware/auth");
const {
  getAdminAlertEmails,
  updateAdminAlertEmails,
  sendTestAlertEmail,
  submitContactQuery
} = require("../controllers/alertEmailController");

const router = express.Router();

router.post("/contact", submitContactQuery);

router.get(
  "/admin",
  protect,
  authorizeRoles("admin"),
  authorizeAdminSections("notifications"),
  getAdminAlertEmails
);

router.put(
  "/admin",
  protect,
  authorizeRoles("admin"),
  authorizeAdminSections("notifications"),
  updateAdminAlertEmails
);

router.post(
  "/admin/test",
  protect,
  authorizeRoles("admin"),
  authorizeAdminSections("notifications"),
  sendTestAlertEmail
);

module.exports = router;
