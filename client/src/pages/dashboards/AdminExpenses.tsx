import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import { BUSINESS_START_DATE } from "../../lib/businessDates";
import {
  createExpense,
  createExpenseCategory,
  deleteExpense,
  deleteExpenseCategory,
  getExpenses,
  updateExpense,
  type ExpensePayload
} from "../../lib/api";

const localToday = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const money = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const emptyForm = (): ExpensePayload & {
  paymentMethod: NonNullable<ExpensePayload["paymentMethod"]>;
} => ({
  date: localToday(),
  category: "travel",
  amount: 0,
  title: "",
  notes: "",
  paymentMethod: "cash"
});

const FALLBACK_CATEGORIES: Array<{ id: string; label: string; isBuiltin?: boolean }> = [
  { id: "travel", label: "Travel / market visit", isBuiltin: true },
  { id: "shop_supplies", label: "Shop supplies / things for shop", isBuiltin: true },
  { id: "rent", label: "Monthly rent", isBuiltin: true },
  { id: "shop_advance", label: "Shop advance", isBuiltin: true },
  { id: "domain", label: "Domain / website", isBuiltin: true },
  { id: "utilities", label: "Utilities (electricity, water, etc.)", isBuiltin: true },
  { id: "packaging", label: "Packaging / bags", isBuiltin: true },
  { id: "marketing", label: "Marketing / ads", isBuiltin: true },
  { id: "fuel", label: "Fuel / vehicle", isBuiltin: true },
  { id: "salary_misc", label: "Staff / helper pay (misc)", isBuiltin: true },
  { id: "maintenance", label: "Maintenance / repair", isBuiltin: true },
  { id: "other", label: "Other", isBuiltin: true }
];

export default function AdminExpenses() {
  const { token } = useAuth();
  const [from, setFrom] = useState(BUSINESS_START_DATE);
  const [to, setTo] = useState(localToday);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [summary, setSummary] = useState<{
    total: number;
    count: number;
    byCategory: Array<{ category: string; label: string; total: number; count: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const itemsPerPage = 5;

  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(
    async (overrides?: {
      from?: string;
      to?: string;
      category?: string;
      search?: string;
    }) => {
      if (!token) return;
      const nextFrom = overrides?.from ?? from;
      const nextTo = overrides?.to ?? to;
      const nextCategory = overrides?.category ?? categoryFilter;
      const nextSearch = overrides?.search ?? search;
      try {
        setLoading(true);
        setError("");
        const res = await getExpenses(token, {
          from: nextFrom,
          to: nextTo,
          category: nextCategory === "all" ? undefined : nextCategory,
          search: nextSearch || undefined
        });
        setExpenses(res.expenses || []);
        setSummary(res.summary || null);
        if (res.categories?.length) setCategories(res.categories);
      } catch (err: any) {
        setError(err.message || "Failed to load expenses");
        setExpenses([]);
      } finally {
        setLoading(false);
      }
    },
    [token, from, to, categoryFilter, search]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setCurrentPage(1);
  }, [from, to, categoryFilter, search]);

  const categoryLabel = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c) => {
      map[c.id] = c.label;
    });
    return map;
  }, [categories]);

  const activeCategoryTotals = useMemo(
    () => (summary?.byCategory || []).filter((c) => c.count > 0),
    [summary]
  );

  const totalPages = Math.max(1, Math.ceil(expenses.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedExpenses = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage;
    return expenses.slice(start, start + itemsPerPage);
  }, [expenses, safePage, itemsPerPage]);

  const rangeLabel =
    expenses.length === 0
      ? "0 entries"
      : `Showing ${(safePage - 1) * itemsPerPage + 1}–${Math.min(
          safePage * itemsPerPage,
          expenses.length
        )} of ${expenses.length}`;

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const startEdit = (expense: any) => {
    setEditingId(expense._id);
    setForm({
      date: expense.date,
      category: expense.category,
      amount: Number(expense.amount) || 0,
      title: expense.title || "",
      notes: expense.notes || "",
      paymentMethod: expense.paymentMethod || "cash"
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!form.amount || Number(form.amount) <= 0) {
      setError("Enter an amount greater than 0");
      return;
    }
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const payload: ExpensePayload = {
        date: form.date,
        category: form.category,
        amount: Number(form.amount),
        title: String(form.title || "").trim(),
        notes: String(form.notes || "").trim(),
        paymentMethod: form.paymentMethod
      };
      if (editingId) {
        await updateExpense(token, editingId, payload);
        setSuccess("Expense updated");
      } else {
        await createExpense(token, payload);
        setSuccess("Expense saved — shown in the list below");
      }

      const nextFrom = payload.date < from ? payload.date : from;
      const nextTo = payload.date > to ? payload.date : to;
      setFrom(nextFrom);
      setTo(nextTo);
      setCategoryFilter("all");
      setSearchInput("");
      setSearch("");
      resetForm();

      await load({
        from: nextFrom,
        to: nextTo,
        category: "all",
        search: ""
      });
      setCurrentPage(1);
    } catch (err: any) {
      setError(err.message || "Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    const ok = window.confirm("Delete this expense entry?");
    if (!ok) return;
    try {
      setError("");
      await deleteExpense(token, id);
      setSuccess("Expense deleted");
      if (editingId === id) resetForm();
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to delete expense");
    }
  };

  const showAllFromBusinessStart = () => {
    setFrom(BUSINESS_START_DATE);
    setTo(localToday());
    setCategoryFilter("all");
    setSearchInput("");
    setSearch("");
  };

  const handleAddCategory = async () => {
    if (!token) return;
    const label = newCategoryName.trim();
    if (label.length < 2) {
      setError("Category name must be at least 2 characters");
      return;
    }
    try {
      setSavingCategory(true);
      setError("");
      const res = await createExpenseCategory(token, label);
      setCategories(res.categories || []);
      if (res.category?.id) {
        setForm((prev) => ({ ...prev, category: res.category.id }));
      }
      setNewCategoryName("");
      setSuccess(`Category "${res.category?.label || label}" added`);
    } catch (err: any) {
      setError(err.message || "Failed to add category");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string, label: string) => {
    if (!token) return;
    const ok = window.confirm(`Delete category "${label}"?`);
    if (!ok) return;
    try {
      setError("");
      const res = await deleteExpenseCategory(token, categoryId);
      setCategories(res.categories || []);
      if (form.category === categoryId) {
        setForm((prev) => ({ ...prev, category: "other" }));
      }
      if (categoryFilter === categoryId) setCategoryFilter("all");
      setSuccess("Category deleted");
    } catch (err: any) {
      setError(err.message || "Failed to delete category");
    }
  };

  const customCategories = useMemo(
    () => categories.filter((c) => c.isBuiltin === false),
    [categories]
  );

  return (
    <DashboardShell
      title="Expenses"
      description="Record travel, rent, shop advances, domain, supplies, and other business costs. Separate from vendor fish/meat purchases."
      navLinks={ADMIN_NAV_LINKS}
    >
      <div className="space-y-5 md:space-y-6 max-w-7xl mx-auto">
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/40 text-rose-300 p-3 sm:p-4 rounded-xl text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-teal-500/10 border border-teal-500/40 text-teal-300 p-3 sm:p-4 rounded-xl text-sm">
            {success}
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">
              Total in range
            </div>
            <div className="text-2xl sm:text-3xl font-black text-rose-400 break-all">
              {money(summary?.total || 0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">{summary?.count || 0} entries</div>
            <button
              type="button"
              onClick={showAllFromBusinessStart}
              className="mt-3 text-[11px] text-teal-400 hover:text-teal-300 underline"
            >
              Show all from {BUSINESS_START_DATE}
            </button>
          </div>
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-500 font-bold mb-3">
              By category (selected dates)
            </div>
            {activeCategoryTotals.length === 0 ? (
              <p className="text-sm text-slate-500">No expenses in this date range yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {activeCategoryTotals.map((c) => (
                  <button
                    key={c.category}
                    type="button"
                    onClick={() =>
                      setCategoryFilter((prev) => (prev === c.category ? "all" : c.category))
                    }
                    className={`text-left rounded-xl border px-3 py-2.5 text-xs transition-colors min-h-[64px] ${
                      categoryFilter === c.category
                        ? "border-teal-500/50 bg-teal-500/10 text-teal-200"
                        : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    <div className="font-semibold leading-snug line-clamp-2">{c.label}</div>
                    <div className="text-rose-300 font-bold mt-1">{money(c.total)}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 md:gap-6">
          {/* Add / edit form */}
          <form
            onSubmit={handleSave}
            className="xl:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-3 sm:space-y-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base sm:text-lg font-bold text-white">
                {editingId ? "Edit expense" : "Add expense"}
              </h3>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-white shrink-0"
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Date</label>
                <input
                  type="date"
                  required
                  min={BUSINESS_START_DATE}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.amount || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      amount: e.target.value === "" ? 0 : Number(e.target.value)
                    })
                  }
                  placeholder="e.g. 500"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  placeholder="New category name…"
                  className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={savingCategory || newCategoryName.trim().length < 2}
                  className="shrink-0 px-3 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white text-xs font-semibold"
                >
                  {savingCategory ? "…" : "Add"}
                </button>
              </div>
              {customCategories.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {customCategories.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-2 text-xs text-slate-400"
                    >
                      <span className="truncate">{c.label}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(c.id, c.label)}
                        className="shrink-0 text-rose-400 hover:text-rose-300"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Title (optional)</label>
              <input
                type="text"
                value={form.title || ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Fish display table"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Paid by</label>
              <select
                value={form.paymentMethod}
                onChange={(e) =>
                  setForm({
                    ...form,
                    paymentMethod: e.target.value as ExpensePayload["paymentMethod"]
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank">Bank transfer</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Notes (optional)</label>
              <textarea
                rows={3}
                value={form.notes || ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any detail you want to remember later"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm resize-y min-h-[72px]"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-teal-500 hover:bg-teal-400 text-white font-bold py-3 rounded-xl disabled:opacity-50 text-sm sm:text-base"
            >
              {saving ? "Saving..." : editingId ? "Update expense" : "Save expense"}
            </button>
          </form>

          {/* List */}
          <div className="xl:col-span-8 space-y-3 sm:space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">From</label>
                  <input
                    type="date"
                    value={from}
                    min={BUSINESS_START_DATE}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">To</label>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-sm"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-slate-400 mb-1">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-sm"
                  >
                    <option value="all">All</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs text-slate-400 mb-1">Search</label>
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Title or notes"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-sm"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Showing {from} → {to}. If a saved expense is missing, widen this range (your
                earlier entry may be on an older date).
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              {loading ? (
                <div className="p-8 sm:p-10 text-center text-slate-400 text-sm">
                  Loading expenses...
                </div>
              ) : expenses.length === 0 ? (
                <div className="p-8 sm:p-10 text-center text-slate-400 text-sm space-y-3">
                  <p>No expenses in this date range / filter.</p>
                  <button
                    type="button"
                    onClick={showAllFromBusinessStart}
                    className="text-teal-400 hover:text-teal-300 font-semibold underline"
                  >
                    Show all from {BUSINESS_START_DATE}
                  </button>
                </div>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="md:hidden divide-y divide-slate-800">
                    {paginatedExpenses.map((expense) => (
                      <div key={expense._id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-xs text-slate-500">{expense.date}</div>
                            <div className="font-semibold text-white mt-0.5">
                              {expense.title || categoryLabel[expense.category] || expense.category}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {categoryLabel[expense.category] || expense.category} ·{" "}
                              {String(expense.paymentMethod || "cash").toUpperCase()}
                            </div>
                          </div>
                          <div className="text-rose-300 font-bold shrink-0">
                            {money(expense.amount)}
                          </div>
                        </div>
                        {expense.notes ? (
                          <p className="text-xs text-slate-400 whitespace-pre-wrap">{expense.notes}</p>
                        ) : null}
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => startEdit(expense)}
                            className="flex-1 py-2 rounded-lg bg-amber-500/15 text-amber-200 border border-amber-500/30 text-xs font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(expense._id)}
                            className="flex-1 py-2 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-semibold"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm table-fixed">
                      <thead className="bg-slate-950/80 text-slate-400 text-xs uppercase">
                        <tr>
                          <th className="px-4 py-3 text-left w-[110px]">Date</th>
                          <th className="px-4 py-3 text-left w-[180px]">Category</th>
                          <th className="px-4 py-3 text-left">Details</th>
                          <th className="px-4 py-3 text-right w-[110px]">Amount</th>
                          <th className="px-4 py-3 text-right w-[130px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {paginatedExpenses.map((expense) => (
                          <tr key={expense._id} className="hover:bg-slate-800/40">
                            <td className="px-4 py-3 text-slate-300 align-top">{expense.date}</td>
                            <td className="px-4 py-3 text-white align-top">
                              <div className="leading-snug">
                                {categoryLabel[expense.category] || expense.category}
                              </div>
                              <div className="text-[10px] uppercase text-slate-500 mt-0.5">
                                {expense.paymentMethod || "cash"}
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="text-white font-medium break-words">
                                {expense.title || "—"}
                              </div>
                              {expense.notes ? (
                                <div className="text-xs text-slate-400 mt-0.5 whitespace-pre-wrap break-words">
                                  {expense.notes}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-rose-300 align-top whitespace-nowrap">
                              {money(expense.amount)}
                            </td>
                            <td className="px-4 py-3 text-right align-top whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => startEdit(expense)}
                                className="text-amber-300 hover:text-amber-200 text-xs font-semibold mr-3"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(expense._id)}
                                className="text-rose-400 hover:text-rose-300 text-xs font-semibold"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {expenses.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
                <div className="text-xs sm:text-sm text-slate-400">{rangeLabel}</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
                  >
                    Previous
                  </button>
                  <span className="text-xs sm:text-sm text-slate-300 font-medium px-2">
                    Page {safePage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
