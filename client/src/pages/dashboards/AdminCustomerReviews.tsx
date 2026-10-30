import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import { useAuth } from "../../context/AuthContext";
import {
  createCustomerReview,
  deleteCustomerReview,
  getAdminCustomerReviews,
  updateCustomerReview,
  type CustomerReviewPayload
} from "../../lib/api";
import StarRating from "../../components/StarRating";

const emptyForm = () => ({
  name: "",
  place: "",
  review: "",
  rating: 5,
  isPublished: true,
  sortOrder: 0
});

const AdminCustomerReviews = () => {
  const { token } = useAuth();
  const [rows, setRows] = useState<CustomerReviewPayload[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await getAdminCustomerReviews(token);
      setRows(res.reviews || []);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to load reviews" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const startEdit = (row: CustomerReviewPayload) => {
    setEditingId(row._id);
    setForm({
      name: row.name,
      place: row.place || "",
      review: row.review,
      rating: row.rating,
      isPublished: row.isPublished !== false,
      sortOrder: Number(row.sortOrder) || 0
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      setSaving(true);
      setMessage(null);
      if (editingId) {
        await updateCustomerReview(token, editingId, form);
        setMessage({ type: "success", text: "Review updated." });
      } else {
        await createCustomerReview(token, form);
        setMessage({ type: "success", text: "Review added. Published reviews show on the home page." });
      }
      resetForm();
      await load();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Could not save review" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !window.confirm("Remove this review from the home page?")) return;
    try {
      await deleteCustomerReview(token, id);
      if (editingId === id) resetForm();
      await load();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Could not delete" });
    }
  };

  const togglePublish = async (row: CustomerReviewPayload) => {
    if (!token) return;
    try {
      await updateCustomerReview(token, row._id, { isPublished: !row.isPublished });
      await load();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Could not update" });
    }
  };

  return (
    <DashboardShell
      title="Customer Reviews"
      description="Add customer name, star rating, and review text. Published reviews appear on the home page."
      navLinks={ADMIN_NAV_LINKS}
    >

      {message && (
        <div
          className={`mb-4 rounded-xl px-4 py-3 text-sm ${
            message.type === "success" ? "bg-teal-50 text-teal-800" : "bg-rose-50 text-rose-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-5 mb-8 grid gap-4">
        <h3 className="font-bold text-slate-800">{editingId ? "Edit review" : "Add review"}</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm font-medium text-slate-700">
            Customer name
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              placeholder="e.g. Priya"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Place (optional)
            <input
              value={form.place}
              onChange={(e) => setForm((f) => ({ ...f, place: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              placeholder="e.g. Madurai"
            />
          </label>
        </div>
        <label className="text-sm font-medium text-slate-700">
          Review
          <textarea
            required
            rows={3}
            value={form.review}
            onChange={(e) => setForm((f) => ({ ...f, review: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            placeholder="What they said about the fish and delivery"
          />
        </label>
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-sm font-medium text-slate-700 mb-1">Star rating</p>
            <StarRating value={form.rating} onChange={(n) => setForm((f) => ({ ...f, rating: n }))} />
          </div>
          <label className="text-sm font-medium text-slate-700">
            Sort order
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
              className="mt-1 w-24 rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mt-5">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
            />
            Show on home page
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-teal-600 text-white font-semibold px-5 py-2 disabled:opacity-60"
          >
            {saving ? "Saving…" : editingId ? "Update review" : "Add review"}
          </button>
          {editingId ? (
            <button type="button" onClick={resetForm} className="rounded-xl border px-4 py-2 text-sm">
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-500">No reviews yet. Add one above to show it on the home page.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row._id} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StarRating value={row.rating} size="sm" />
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      row.isPublished ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {row.isPublished ? "On home page" : "Hidden"}
                  </span>
                </div>
                <p className="font-bold text-slate-800 mt-1">
                  {row.name}
                  {row.place ? <span className="font-normal text-slate-500"> · {row.place}</span> : null}
                </p>
                <p className="text-slate-600 text-sm mt-1">{row.review}</p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button type="button" onClick={() => startEdit(row)} className="text-sm rounded-lg border px-3 py-1.5">
                  Edit
                </button>
                <button type="button" onClick={() => togglePublish(row)} className="text-sm rounded-lg border px-3 py-1.5">
                  {row.isPublished ? "Hide" : "Publish"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(row._id)}
                  className="text-sm rounded-lg border border-rose-200 text-rose-700 px-3 py-1.5"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
};

export default AdminCustomerReviews;
