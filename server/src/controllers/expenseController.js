const Expense = require("../models/Expense");
const ExpenseCategory = require("../models/ExpenseCategory");

const BUILTIN_CATEGORIES = Expense.EXPENSE_CATEGORIES;
const BUILTIN_LABELS = Expense.CATEGORY_LABELS;

const localToday = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const parseAmount = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
};

const slugifyCategoryId = (raw) =>
  String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

const getAllCategories = async () => {
  const custom = await ExpenseCategory.find().sort({ label: 1 }).lean();
  const builtins = BUILTIN_CATEGORIES.map((id) => ({
    id,
    label: BUILTIN_LABELS[id] || id,
    isBuiltin: true
  }));
  const customMapped = custom.map((c) => ({
    id: c.id,
    label: c.label,
    isBuiltin: false,
    _id: c._id
  }));

  const seen = new Set(builtins.map((c) => c.id));
  const merged = [...builtins];
  customMapped.forEach((c) => {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      merged.push(c);
    }
  });
  return merged;
};

const isValidCategoryId = async (categoryId) => {
  const id = String(categoryId || "").trim();
  if (!id) return false;
  if (BUILTIN_CATEGORIES.includes(id)) return true;
  const found = await ExpenseCategory.findOne({ id }).select("_id").lean();
  return Boolean(found);
};

const labelMapFromCategories = (categories) => {
  const map = {};
  categories.forEach((c) => {
    map[c.id] = c.label;
  });
  return map;
};

// @desc    List expenses with optional filters + category totals
// @route   GET /api/expenses
// @access  Admin
const listExpenses = async (req, res, next) => {
  try {
    const { from, to, category, search, limit = 200 } = req.query;
    const query = {};

    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = String(from);
      if (to) query.date.$lte = String(to);
    }
    if (category && category !== "all") {
      query.category = category;
    }
    if (search && String(search).trim()) {
      const q = String(search).trim();
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { notes: { $regex: q, $options: "i" } }
      ];
    }

    const [expenses, categories] = await Promise.all([
      Expense.find(query)
        .populate("createdBy", "name")
        .sort({ date: -1, createdAt: -1 })
        .limit(Math.min(500, Number(limit) || 200))
        .lean(),
      getAllCategories()
    ]);

    const labels = labelMapFromCategories(categories);
    const byCategory = {};
    categories.forEach((c) => {
      byCategory[c.id] = {
        category: c.id,
        label: c.label,
        total: 0,
        count: 0,
        isBuiltin: Boolean(c.isBuiltin)
      };
    });

    let grandTotal = 0;
    expenses.forEach((e) => {
      const amount = Number(e.amount) || 0;
      grandTotal += amount;
      if (!byCategory[e.category]) {
        byCategory[e.category] = {
          category: e.category,
          label: labels[e.category] || e.category,
          total: 0,
          count: 0,
          isBuiltin: false
        };
      }
      byCategory[e.category].total += amount;
      byCategory[e.category].count += 1;
    });

    res.json({
      expenses,
      summary: {
        total: Math.round(grandTotal * 100) / 100,
        count: expenses.length,
        byCategory: Object.values(byCategory)
      },
      categories
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create expense
// @route   POST /api/expenses
// @access  Admin
const createExpense = async (req, res, next) => {
  try {
    const { date, category, amount, title, notes, paymentMethod } = req.body;
    const parsedAmount = parseAmount(amount);
    const categoryId = String(category || "").trim();

    if (!(await isValidCategoryId(categoryId))) {
      return res.status(400).json({ message: "Valid expense category is required" });
    }
    if (parsedAmount == null) {
      return res.status(400).json({ message: "Valid amount is required" });
    }
    if (parsedAmount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    const expenseDate = String(date || localToday()).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) {
      return res.status(400).json({ message: "Date must be YYYY-MM-DD" });
    }

    const expense = await Expense.create({
      date: expenseDate,
      category: categoryId,
      amount: parsedAmount,
      title: String(title || "").trim(),
      notes: String(notes || "").trim(),
      paymentMethod: ["cash", "upi", "bank", "card", "other"].includes(paymentMethod)
        ? paymentMethod
        : "cash",
      createdBy: req.user._id
    });

    await expense.populate("createdBy", "name");
    res.status(201).json({ expense, message: "Expense saved" });
  } catch (error) {
    next(error);
  }
};

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Admin
const updateExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const { date, category, amount, title, notes, paymentMethod } = req.body;

    if (date !== undefined) {
      const expenseDate = String(date).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) {
        return res.status(400).json({ message: "Date must be YYYY-MM-DD" });
      }
      expense.date = expenseDate;
    }
    if (category !== undefined) {
      const categoryId = String(category || "").trim();
      if (!(await isValidCategoryId(categoryId))) {
        return res.status(400).json({ message: "Invalid category" });
      }
      expense.category = categoryId;
    }
    if (amount !== undefined) {
      const parsedAmount = parseAmount(amount);
      if (parsedAmount == null || parsedAmount <= 0) {
        return res.status(400).json({ message: "Valid amount is required" });
      }
      expense.amount = parsedAmount;
    }
    if (title !== undefined) expense.title = String(title || "").trim();
    if (notes !== undefined) expense.notes = String(notes || "").trim();
    if (paymentMethod !== undefined) {
      if (["cash", "upi", "bank", "card", "other"].includes(paymentMethod)) {
        expense.paymentMethod = paymentMethod;
      }
    }

    await expense.save();
    await expense.populate("createdBy", "name");
    res.json({ expense, message: "Expense updated" });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Admin
const deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }
    await expense.deleteOne();
    res.json({ message: "Expense deleted" });
  } catch (error) {
    next(error);
  }
};

// @desc    List expense categories (builtin + custom)
// @route   GET /api/expenses/categories
// @access  Admin
const listExpenseCategories = async (req, res, next) => {
  try {
    const categories = await getAllCategories();
    res.json({ categories });
  } catch (error) {
    next(error);
  }
};

// @desc    Add custom expense category
// @route   POST /api/expenses/categories
// @access  Admin
const createExpenseCategory = async (req, res, next) => {
  try {
    const label = String(req.body.label || "").trim();
    if (label.length < 2) {
      return res.status(400).json({ message: "Category name must be at least 2 characters" });
    }

    let id = slugifyCategoryId(req.body.id || label);
    if (!id) {
      return res.status(400).json({ message: "Could not create a valid category id from the name" });
    }

    if (BUILTIN_CATEGORIES.includes(id)) {
      return res.status(400).json({
        message: "This category already exists in the default list"
      });
    }

    const existing = await ExpenseCategory.findOne({
      $or: [{ id }, { label: { $regex: `^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } }]
    }).lean();
    if (existing) {
      return res.status(400).json({ message: "This category already exists" });
    }

    // Avoid collision if slug taken
    let uniqueId = id;
    let n = 2;
    while (await ExpenseCategory.findOne({ id: uniqueId }).select("_id").lean()) {
      uniqueId = `${id}_${n}`.slice(0, 80);
      n += 1;
    }

    const category = await ExpenseCategory.create({
      id: uniqueId,
      label,
      createdBy: req.user._id
    });

    const categories = await getAllCategories();
    res.status(201).json({
      category: { id: category.id, label: category.label, isBuiltin: false, _id: category._id },
      categories,
      message: "Category added"
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "This category already exists" });
    }
    next(error);
  }
};

// @desc    Delete custom expense category (not builtin)
// @route   DELETE /api/expenses/categories/:id
// @access  Admin
const deleteExpenseCategory = async (req, res, next) => {
  try {
    const id = String(req.params.id || "").trim();
    if (BUILTIN_CATEGORIES.includes(id)) {
      return res.status(400).json({ message: "Default categories cannot be deleted" });
    }

    const category = await ExpenseCategory.findOne({ id });
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const inUse = await Expense.countDocuments({ category: id });
    if (inUse > 0) {
      return res.status(400).json({
        message: `Cannot delete: ${inUse} expense(s) still use this category. Change those expenses first.`
      });
    }

    await category.deleteOne();
    const categories = await getAllCategories();
    res.json({ message: "Category deleted", categories });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  listExpenseCategories,
  createExpenseCategory,
  deleteExpenseCategory
};
