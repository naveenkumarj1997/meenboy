const express = require("express");
const { protect, authorizeRoles } = require("../middleware/auth");
const { getPurchaseByDate, savePurchase, getOverallPending, getAdminEarnings, deleteTestPurchaseData } = require("../controllers/purchaseController");

const router = express.Router();

// All purchase routes are admin only
router.use(protect);
router.use(authorizeRoles("admin"));

router.delete("/test-data", deleteTestPurchaseData);
router.get("/overall-pending", getOverallPending);
router.get("/admin-earnings", getAdminEarnings);
router.get("/:date", getPurchaseByDate);
router.post("/", savePurchase);

module.exports = router;
