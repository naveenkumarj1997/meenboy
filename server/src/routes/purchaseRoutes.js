const express = require("express");
const { protect, authorizeRoles, authorizeAdminSections } = require("../middleware/auth");
const {
  getPurchaseByDate,
  savePurchase,
  getOverallPending,
  getAdminEarnings,
  deleteTestPurchaseData
} = require("../controllers/purchaseController");

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("admin"));

router.delete(
  "/test-data",
  authorizeAdminSections("purchases"),
  deleteTestPurchaseData
);
router.get(
  "/overall-pending",
  authorizeAdminSections("settlements", "purchases", "money_management"),
  getOverallPending
);
router.get(
  "/admin-earnings",
  authorizeAdminSections("earnings", "money_management"),
  getAdminEarnings
);
router.get(
  "/:date",
  authorizeAdminSections("purchases", "settlements", "money_management"),
  getPurchaseByDate
);
router.post("/", authorizeAdminSections("purchases", "settlements"), savePurchase);

module.exports = router;
