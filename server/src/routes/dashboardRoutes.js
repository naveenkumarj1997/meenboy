const express = require("express");
const { protect, authorizeRoles } = require("../middleware/auth");
const { getAdminOverview } = require("../controllers/dashboardController");

const router = express.Router();

router.get("/customer", protect, authorizeRoles("customer"), (req, res) => {
  res.json({ message: `Welcome customer ${req.user.name}` });
});

router.get("/admin", protect, authorizeRoles("admin"), getAdminOverview);

router.get("/delivery", protect, authorizeRoles("delivery_partner"), (req, res) => {
  res.json({ message: `Welcome delivery partner ${req.user.name}` });
});

module.exports = router;
