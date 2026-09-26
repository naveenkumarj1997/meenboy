const express = require("express");
const { protect, authorizeRoles, authorizeAdminSections } = require("../middleware/auth");
const {
  getDaySummary,
  listBills,
  collectPayment,
  createCashierExpense,
  deleteCashierExpense,
  upsertDrawer
} = require("../controllers/walkInAccountsController");

const router = express.Router();

router.use(
  protect,
  authorizeRoles("admin"),
  authorizeAdminSections("walk_in_accounts", "walk_in")
);

router.get("/day-summary", getDaySummary);
router.get("/bills", listBills);
router.post("/bills/:id/collect", collectPayment);
router.post("/expenses", createCashierExpense);
router.delete("/expenses/:id", deleteCashierExpense);
router.put("/drawer", upsertDrawer);

module.exports = router;
