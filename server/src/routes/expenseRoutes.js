const express = require("express");
const { protect, authorizeRoles, authorizeAdminSections } = require("../middleware/auth");
const {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  listExpenseCategories,
  createExpenseCategory,
  deleteExpenseCategory
} = require("../controllers/expenseController");

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("admin"));
router.use(authorizeAdminSections("expenses"));

router.get("/categories", listExpenseCategories);
router.post("/categories", createExpenseCategory);
router.delete("/categories/:id", deleteExpenseCategory);

router.get("/", listExpenses);
router.post("/", createExpense);
router.put("/:id", updateExpense);
router.delete("/:id", deleteExpense);

module.exports = router;
