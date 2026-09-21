import { useEffect, useMemo, useState } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import {
  acknowledgeDueDate,
  createDueDate,
  deleteDueDate,
  getDueDates,
  updateDueDate,
  type DueDateItem
} from "../../lib/api";

const CATEGORY_OPTIONS = [
  { id: "rent", label: "Rent" },
  { id: "recharge", label: "Recharge" },
  { id: "renewal", label: "Renewal" },
  { id: "meeting", label: "Meeting" },
  { id: "visit", label: "Visit" },
  { id: "purchase", label: "Purchase" },
  { id: "plan", label: "Plan" },
  { id: "other", label: "Other" }
];

function localTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function categoryLabel(id: string) {
  return CATEGORY_OPTIONS.find((c) => c.id === id)?.label || id;
}

function urgencyLabel(item: DueDateItem) {
  if (item.isOverdue) return "Overdue";
  if (item.daysUntil === 0) return "Due today";
  if (item.daysUntil === 1) return "Due tomorrow";
  if (item.daysUntil > 1 && item.daysUntil <= 3) return `In ${item.daysUntil} days`;
  if (item.daysUntil < 0) return `${Math.abs(item.daysUntil)}d past`;
  return `In ${item.daysUntil} days`;
}

function cardTone(item: DueDateItem) {
  if (item.isOverdue || (item.needsAttention && item.daysUntil === 0)) {
    return "border-rose-500/50 bg-rose-500/10 ring-1 ring-rose-500/30";
  }
  if (item.needsAttention && item.daysUntil === 1) {
    return "border-orange-500/45 bg-orange-500/10 ring-1 ring-orange-500/25";
  }
  if (item.needsAttention) {
    return "border-amber-500/40 bg-amber-500/10 ring-1 ring-amber-500/20";
  }
  return "border-slate-800 bg-slate-900/60";
}

function chipTone(item: DueDateItem) {
  if (item.isOverdue || item.daysUntil === 0) {
    return "bg-rose-500/20 text-rose-200 border-rose-500/30";
  }
  if (item.daysUntil === 1) return "bg-orange-500/20 text-orange-200 border-orange-500/30";
  if (item.daysUntil <= 3) return "bg-amber-500/20 text-amber-200 border-amber-500/30";
  return "bg-slate-700/40 text-slate-300 border-slate-600/40";
}

type FormState = {
  title: string;
  category: string;
  dueDate: string;
  recurrence: "none" | "monthly";
  amount: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  title: "",
  category: "rent",
  dueDate: localTodayStr(),
  recurrence: "monthly",
  amount: "",
  notes: ""
});

export default function AdminDueDates() {
  const { token } = useAuth();
  const [items, setItems] = useState<DueDateItem[]>([]);
  const [today, setToday] = useState(localTodayStr());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");

  const load = async (silent = false) => {
    if (!token) return;
    try {
      if (!silent) setLoading(true);
      setError("");
      const res = await getDueDates(token, showInactive);
      setItems(res.items || []);
      setToday(res.today || localTodayStr());
    } catch (err: any) {
      if (!silent) setError(err.message || "Failed to load due dates");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, showInactive]);

  const urgent = useMemo(
    () => items.filter((i) => i.isActive && (i.needsAttention || i.isOverdue)),
    [items]
  );

  const visible = useMemo(() => {
    if (filterCategory === "all") return items;
    return items.filter((i) => i.category === filterCategory);
  }, [items, filterCategory]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const startEdit = (item: DueDateItem) => {
    setEditingId(item._id);
    setForm({
      title: item.title,
      category: item.category || "other",
      dueDate: item.dueDate,
      recurrence: item.recurrence === "monthly" ? "monthly" : "none",
      amount: item.amount != null ? String(item.amount) : "",
      notes: item.notes || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async () => {
    if (!token) return;
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.dueDate)) {
      setError("Pick a valid due date");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const payload = {
        title: form.title.trim(),
        category: form.category,
        dueDate: form.dueDate,
        recurrence: form.recurrence,
        amount: form.amount === "" ? null : Number(form.amount),
        notes: form.notes.trim()
      };

      if (editingId) {
        await updateDueDate(token, editingId, payload);
        setSuccess("Due date updated");
      } else {
        await createDueDate(token, payload);
        setSuccess("Due date added");
      }
      resetForm();
      await load(true);
      window.dispatchEvent(new Event("ff:due-dates-count"));
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleAcknowledge = async (id: string) => {
    if (!token) return;
    try {
      setError("");
      await acknowledgeDueDate(token, id);
      setSuccess("Reminder dismissed for this due. It will alert again next cycle.");
      await load(true);
      window.dispatchEvent(new Event("ff:due-dates-count"));
    } catch (err: any) {
      setError(err.message || "Failed to dismiss reminder");
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!window.confirm("Delete this due date?")) return;
    try {
      await deleteDueDate(token, id);
      setSuccess("Deleted");
      if (editingId === id) resetForm();
      await load(true);
      window.dispatchEvent(new Event("ff:due-dates-count"));
    } catch (err: any) {
      setError(err.message || "Failed to delete");
    }
  };

  const handleToggleActive = async (item: DueDateItem) => {
    if (!token) return;
    try {
      await updateDueDate(token, item._id, { isActive: !item.isActive });
      await load(true);
      window.dispatchEvent(new Event("ff:due-dates-count"));
    } catch (err: any) {
      setError(err.message || "Failed to update");
    }
  };

  return (
    <DashboardShell
      title="Due Dates"
      description="Track rent, recharges, renewals, meetings, visits and more. Monthly items repeat on the same date. Nearby dues highlight until you dismiss the reminder."
      navLinks={ADMIN_NAV_LINKS}
    >
      <div className="space-y-6">
        {urgent.length > 0 ? (
          <div className="rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-500/15 via-orange-500/10 to-amber-500/10 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-rose-200">
                Needs attention · {urgent.length}
              </h2>
              <span className="text-[11px] text-slate-400">Within 3 days · or overdue</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {urgent.map((item) => (
                <div
                  key={`urgent-${item._id}`}
                  className={`rounded-xl border px-3 py-3 ${cardTone(item)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{item.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {categoryLabel(item.category)}
                        {item.recurrence === "monthly" ? " · Monthly" : ""}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border ${chipTone(item)}`}
                    >
                      {urgencyLabel(item)}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-300">Next: {item.nextDueDate}</div>
                  <button
                    type="button"
                    onClick={() => handleAcknowledge(item._id)}
                    className="mt-3 w-full text-xs font-semibold py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white border border-white/10"
                  >
                    Got it — dismiss notify
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 sm:p-5">
          <h2 className="text-sm font-bold text-white mb-3">
            {editingId ? "Edit due date" : "Add due date"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="text-[10px] uppercase text-slate-500">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                placeholder="Shop rent / Airtel recharge"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-500">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-500">Due date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-500">Repeat</label>
              <select
                value={form.recurrence}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    recurrence: e.target.value === "monthly" ? "monthly" : "none"
                  }))
                }
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="none">One time</option>
                <option value="monthly">Every month (same date)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase text-slate-500">Amount (optional)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                placeholder="₹"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="text-[10px] uppercase text-slate-500">Notes</label>
              <input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                placeholder="Landlord UPI / meeting place"
              />
            </div>
          </div>
          {form.recurrence === "monthly" && form.dueDate ? (
            <p className="mt-2 text-[11px] text-teal-400/90">
              Repeats every month on day {Number(form.dueDate.slice(8, 10))} · alerts 1–3 days before
            </p>
          ) : (
            <p className="mt-2 text-[11px] text-slate-500">
              One-time due · highlighted 1–3 days before until you dismiss notify
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-teal-500 text-slate-950 hover:bg-teal-400 disabled:opacity-50"
            >
              {saving ? "Saving…" : editingId ? "Update" : "Add due"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-200 text-sm px-3 py-2">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 text-sm px-3 py-2">
            {success}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="all">All categories</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-slate-600"
              />
              Show inactive
            </label>
          </div>
          <div className="text-xs text-slate-500">Today {today}</div>
        </div>

        {loading ? (
          <div className="text-slate-400 text-sm py-10 text-center">Loading due dates…</div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-12 text-center text-slate-400 text-sm">
            No due dates yet. Add rent, recharge, meetings and more above.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((item) => (
              <div key={item._id} className={`rounded-2xl border p-4 ${cardTone(item)}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-base font-bold text-white truncate">{item.title}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded border border-slate-600/50 text-slate-300 bg-slate-800/60">
                        {categoryLabel(item.category)}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded border border-slate-600/50 text-slate-300 bg-slate-800/60">
                        {item.recurrence === "monthly" ? "Monthly" : "One time"}
                      </span>
                      {!item.isActive ? (
                        <span className="text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded border border-slate-600 text-slate-500">
                          Inactive
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded border ${chipTone(item)}`}>
                    {urgencyLabel(item)}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-400">
                  <div>
                    Next due: <span className="text-slate-200 font-medium">{item.nextDueDate}</span>
                  </div>
                  {item.recurrence === "monthly" ? (
                    <div>Repeats on day {item.dayOfMonth || Number(item.dueDate.slice(8, 10))} each month</div>
                  ) : (
                    <div>Fixed date: {item.dueDate}</div>
                  )}
                  {item.amount != null ? (
                    <div>
                      Amount: <span className="text-slate-200">₹{Number(item.amount).toLocaleString("en-IN")}</span>
                    </div>
                  ) : null}
                  {item.notes ? <div className="text-slate-500 truncate">{item.notes}</div> : null}
                  {item.isAcknowledged ? (
                    <div className="text-emerald-400/80">Notify dismissed for this due</div>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(item.needsAttention || item.isOverdue) && item.isActive ? (
                    <button
                      type="button"
                      onClick={() => handleAcknowledge(item._id)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-100 border border-rose-500/30 hover:bg-rose-500/30"
                    >
                      Dismiss notify
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(item)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    {item.isActive ? "Pause" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item._id)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
