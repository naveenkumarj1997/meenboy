import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import { useAuth } from "../../context/AuthContext";
import {
  createSourcingPhoto,
  deleteSourcingPhoto,
  getAdminSourcingPhotos,
  updateSourcingPhoto,
  uploadAdminImage,
  type SourcingPhotoPayload
} from "../../lib/api";
import { mediaUrl } from "../../lib/mediaUrl";

const CATEGORIES: { id: SourcingPhotoPayload["category"]; label: string }[] = [
  { id: "fishing", label: "Fishing" },
  { id: "sourcing", label: "Sourcing" },
  { id: "cutting", label: "Cutting" }
];

const emptyForm = () => ({
  imageUrl: "",
  caption: "",
  category: "sourcing" as SourcingPhotoPayload["category"],
  isPublished: true,
  sortOrder: 0
});

const AdminSourcingPhotos = () => {
  const { token } = useAuth();
  const [rows, setRows] = useState<SourcingPhotoPayload[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await getAdminSourcingPhotos(token);
      setRows(res.photos || []);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to load photos" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const startEdit = (row: SourcingPhotoPayload) => {
    setEditingId(row._id);
    setForm({
      imageUrl: row.imageUrl,
      caption: row.caption || "",
      category: row.category,
      isPublished: row.isPublished !== false,
      sortOrder: Number(row.sortOrder) || 0
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    try {
      setUploading(true);
      const res = await uploadAdminImage(token, file);
      setForm((f) => ({ ...f, imageUrl: res.url }));
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Image upload failed" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!form.imageUrl) {
      setMessage({ type: "error", text: "Upload a photo first." });
      return;
    }
    try {
      setSaving(true);
      setMessage(null);
      if (editingId) {
        await updateSourcingPhoto(token, editingId, form);
        setMessage({ type: "success", text: "Photo updated." });
      } else {
        await createSourcingPhoto(token, form);
        setMessage({ type: "success", text: "Photo added. Published photos show on the home page." });
      }
      resetForm();
      await load();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Could not save photo" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !window.confirm("Remove this photo from the home page?")) return;
    try {
      await deleteSourcingPhoto(token, id);
      if (editingId === id) resetForm();
      await load();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Could not delete" });
    }
  };

  const togglePublish = async (row: SourcingPhotoPayload) => {
    if (!token) return;
    try {
      await updateSourcingPhoto(token, row._id, { isPublished: !row.isPublished });
      await load();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Could not update" });
    }
  };

  return (
    <DashboardShell
      title="Sourcing Photos"
      description="Upload fishing, sourcing, and cutting photos. Published photos appear on the home page."
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
        <h3 className="font-bold text-slate-800">{editingId ? "Edit photo" : "Add photo"}</h3>
        <div className="flex flex-wrap items-start gap-4">
          {form.imageUrl ? (
            <img src={mediaUrl(form.imageUrl)} alt="" className="w-32 h-32 object-cover rounded-xl border" />
          ) : (
            <div className="w-32 h-32 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-xs text-slate-400 text-center px-2">
              No photo yet
            </div>
          )}
          <label className="text-sm font-medium text-slate-700">
            {uploading ? "Uploading…" : "Choose image"}
            <input type="file" accept="image/*" onChange={handleUpload} className="mt-1 block text-sm" />
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm font-medium text-slate-700">
            Category
            <select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value as SourcingPhotoPayload["category"] }))
              }
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Caption (optional)
            <input
              value={form.caption}
              onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              placeholder="e.g. Morning catch at the harbour"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-6">
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
            disabled={saving || uploading}
            className="rounded-xl bg-teal-600 text-white font-semibold px-5 py-2 disabled:opacity-60"
          >
            {saving ? "Saving…" : editingId ? "Update photo" : "Add photo"}
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
        <p className="text-slate-500">No photos yet. Upload one above to show it on the home page.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((row) => (
            <div key={row._id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <img src={mediaUrl(row.imageUrl)} alt={row.caption || row.category} className="w-full h-40 object-cover" />
              <div className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs uppercase tracking-wide font-semibold text-teal-700">
                    {CATEGORIES.find((c) => c.id === row.category)?.label || row.category}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      row.isPublished ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {row.isPublished ? "On home page" : "Hidden"}
                  </span>
                </div>
                {row.caption ? <p className="text-sm text-slate-700 mb-3">{row.caption}</p> : null}
                <div className="flex flex-wrap gap-2">
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
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
};

export default AdminSourcingPhotos;
