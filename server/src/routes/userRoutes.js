const express = require("express");
const { protect, authorizeRoles } = require("../middleware/auth");
const { getAllUsers, updateUser, deleteUser, getPendingPayments, collectPendingPayment, getMyPendingBreakdown, getCollectedPayments, getUserPendingBreakdown, getPartnerSalariesByDate, savePartnerSalary, getMyEarnings, confirmSalaryCollection, getMyOrderPaymentStatus } = require("../controllers/userController");

const router = express.Router();

router.use(protect);

// Routes accessible to any authenticated user (e.g. customer)
router.get("/me/pending-breakdown", getMyPendingBreakdown);
router.get("/me/order-payment-status", getMyOrderPaymentStatus);
router.get("/me/earnings", authorizeRoles("delivery_partner"), getMyEarnings);
router.post("/me/earnings/:date/confirm", authorizeRoles("delivery_partner"), confirmSalaryCollection);

// Admin only routes below
router.use(authorizeRoles("admin"));

router.get("/pending-payments", getPendingPayments);
router.get("/collected-payments", getCollectedPayments);
router.get("/partner-salaries/:date", getPartnerSalariesByDate);
router.post("/partner-salaries", savePartnerSalary);
router.get("/:id/pending-breakdown", getUserPendingBreakdown);
router.post("/:id/collect-payment", collectPendingPayment);

router.get("/", getAllUsers);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;
