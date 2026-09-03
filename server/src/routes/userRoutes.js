const express = require("express");
const { protect, authorizeRoles, authorizeAdminSections, requireFullAdmin } = require("../middleware/auth");
const {
  getAllUsers,
  updateUser,
  deleteUser,
  getPendingPayments,
  collectPendingPayment,
  getMyPendingBreakdown,
  getCollectedPayments,
  deleteCollectedPayment,
  getUserPendingBreakdown,
  getPartnerSalariesByDate,
  getPartnerCollectionHistory,
  savePartnerSalary,
  getMyEarnings,
  confirmSalaryCollection,
  getMyOrderPaymentStatus,
  getPartnerDocument,
  deletePartnerDocument
} = require("../controllers/userController");
const {
  listAdminSectionDefs,
  listAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin
} = require("../controllers/adminManageController");

const router = express.Router();

router.use(protect);

// Routes accessible to any authenticated user (e.g. customer)
router.get("/me/pending-breakdown", getMyPendingBreakdown);
router.get("/me/order-payment-status", getMyOrderPaymentStatus);
router.get("/me/earnings", authorizeRoles("delivery_partner"), getMyEarnings);
router.post("/me/earnings/:date/confirm", authorizeRoles("delivery_partner"), confirmSalaryCollection);

// Partner document view: admin or the partner themselves
router.get("/:id/document", getPartnerDocument);

// Admin only routes below
router.use(authorizeRoles("admin"));

// Manage Admins (full admin only) — register before /:id routes
router.get("/admin-sections", requireFullAdmin, listAdminSectionDefs);
router.get("/admins", requireFullAdmin, listAdmins);
router.post("/admins", requireFullAdmin, createAdmin);
router.put("/admins/:id", requireFullAdmin, updateAdmin);
router.delete("/admins/:id", requireFullAdmin, deleteAdmin);

router.get(
  "/pending-payments",
  authorizeAdminSections("pending_payments"),
  getPendingPayments
);
router.get(
  "/collected-payments",
  authorizeAdminSections("collected_payments"),
  getCollectedPayments
);
router.delete(
  "/collected-payments/:collectionId",
  authorizeAdminSections("collected_payments"),
  deleteCollectedPayment
);
router.get(
  "/partner-salaries/:date",
  authorizeAdminSections("partner_salary", "earnings"),
  getPartnerSalariesByDate
);
router.get(
  "/partner-collection-history/:partnerId",
  authorizeAdminSections("partner_salary", "earnings", "delivery_amount_collection"),
  getPartnerCollectionHistory
);
router.post(
  "/partner-salaries",
  authorizeAdminSections("partner_salary"),
  savePartnerSalary
);
router.get(
  "/:id/pending-breakdown",
  authorizeAdminSections("pending_payments", "users", "new_customers"),
  getUserPendingBreakdown
);
router.post(
  "/:id/collect-payment",
  authorizeAdminSections("pending_payments"),
  collectPendingPayment
);
router.delete(
  "/:id/document",
  authorizeAdminSections("partner_approvals", "users"),
  deletePartnerDocument
);

router.get(
  "/",
  authorizeAdminSections(
    "users",
    "new_customers",
    "partner_approvals",
    "manual_booking",
    "pending_payments"
  ),
  getAllUsers
);
router.put(
  "/:id",
  authorizeAdminSections("users", "new_customers", "partner_approvals", "manage_admins"),
  updateUser
);
router.delete("/:id", authorizeAdminSections("users"), deleteUser);

module.exports = router;
