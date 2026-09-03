const express = require("express");
const { protect, authorizeRoles, authorizeAdminSections } = require("../middleware/auth");
const {
  addTransaction,
  getTransactions,
  getFinanceSummary,
  getMoneyManagement,
  updateTransactionStatus
} = require("../controllers/financeController");

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("admin"));

router.get("/money-management", authorizeAdminSections("money_management"), getMoneyManagement);

router.post("/", authorizeAdminSections("finance"), addTransaction);
router.get("/", authorizeAdminSections("finance"), getTransactions);
router.get("/summary", authorizeAdminSections("finance"), getFinanceSummary);
router.put("/:id/status", authorizeAdminSections("finance"), updateTransactionStatus);

module.exports = router;
