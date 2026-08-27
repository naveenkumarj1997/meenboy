const express = require("express");
const { protect, authorizeRoles } = require("../middleware/auth");
const {
  addTransaction,
  getTransactions,
  getFinanceSummary,
  getMoneyManagement,
  updateTransactionStatus
} = require("../controllers/financeController");

const router = express.Router();

// All finance routes are admin only
router.use(protect);
router.use(authorizeRoles("admin"));

router.route("/")
  .post(addTransaction)
  .get(getTransactions);

router.get("/summary", getFinanceSummary);
router.get("/money-management", getMoneyManagement);

router.put("/:id/status", updateTransactionStatus);

module.exports = router;
