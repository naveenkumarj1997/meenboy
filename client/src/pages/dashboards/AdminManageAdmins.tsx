import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import { ASSIGNABLE_ADMIN_SECTIONS, isFullAdmin } from "../../lib/adminSections";
import {
  createManagedAdmin,
  deleteManagedAdmin,
  listManagedAdmins,
  updateManagedAdmin,
  type ManagedAdmin
} from "../../lib/api";
import { Navigate } from "react-router-dom";

const emptyForm = () => ({
  name: "",
  email: "",
  phone: "",
  password: "",
  isFullAdmin: false,
  adminSections: [] as string[],
  status: "active"
});

export default function AdminManageAdmins() {
  const { token, user } = useAuth();
  const [admins, setAdmins] = useState<ManagedAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const allowed = isFullAdmin(user);

  const load = async () => {
    if (!token || !allowed) return;
    try {
      setLoading(true);
      setError("");
      const res = await listManagedAdmins(token);
      setAdmins(res.admins || []);
    } catch (err: any) {
      setError(err.message || "Failed to load admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, allowed]);

  if (!allowed) {
    return <Navigate to="/dashboard/admin" replace />;
  }

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const toggleSection = (id: string) => {
    setForm((prev) => {
      const has = prev.adminSections.includes(id);
      return {
        ...prev,
        adminSections: has
          ? prev.adminSections.filter((s) => s !== id)
          : [...prev.adminSections, id]
      };
    });
  };

  const startEdit = (admin: ManagedAdmin) => {
    setEditingId(String(admin.id || admin._id));
    setForm({
      name: admin.name || "",
      email: admin.email || "",
      phone: admin.phone || "",
      password: "",
      isFullAdmin: Boolean(admin.isFullAdmin),
      adminSections: [...(admin.adminSections || [])],
      status: admin.status || "active"
    });
    setSuccess("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!form.isFullAdmin && form.adminSections.length === 0) {
      setError("Select at least 1–3 sections, or choose Full admin access");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (editingId) {
        await updateManagedAdmin(token, editingId, {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          status: form.status,
          isFullAdmin: form.isFullAdmin,
          adminSections: form.isFullAdmin ? [] : form.adminSections,
          ...(form.password.trim() ? { password: form.password.trim() } : {})
        });
        setSuccess("Admin updated");
      } else {
        if (form.password.trim().length < 8) {
          setError("Password must be at least 8 characters");
          setSaving(false);
          return;
        }
        await createManagedAdmin(token, {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password.trim(),
          isFullAdmin: form.isFullAdmin,
          adminSections: form.isFullAdmin ? [] : form.adminSections
        });
        setSuccess("Admin created");
      }
      resetForm();
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to save admin");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (admin: ManagedAdmin) => {
    if (!token) return;
    const id = String(admin.id || admin._id);
    const ok = window.confirm(`Delete admin "${admin.name}"? This cannot be undone.`);
    if (!ok) return;
    try {
      setError("");
      await deleteManagedAdmin(token, id);
      setSuccess("Admin deleted");
      if (editingId === id) resetForm();
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to delete admin");
    }
  };

  const sectionLabel = (id: string) =>
    ASSIGNABLE_ADMIN_SECTIONS.find((s) => s.id === id)?.label || id;

  return (
    <DashboardShell
      title="Manage Admins"
      description="Create admin logins and give each person access to only the sections they should manage."
      navLinks={ADMIN_NAV_LINKS}
    >
      <div className="space-y-5 md:space-y-6">
        {error && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {success}
          </div>
        )}

        <form
          onSubmit={handleSave}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base sm:text-lg font-bold text-white">
              {editingId ? "Edit admin" : "Add admin"}
            </h3>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Email (login)</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Phone (optional)</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {editingId ? "New password (optional)" : "Password"}
              </label>
              <input
                type="password"
                required={!editingId}
                minLength={editingId ? undefined : 8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editingId ? "Leave blank to keep" : "Min 8 characters"}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm"
              />
            </div>
          </div>

          {editingId && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full sm:w-56 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm"
              >
                <option value="active">Active</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          )}

          <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-slate-700 bg-slate-950/60 p-3">
            <input
              type="checkbox"
              checked={form.isFullAdmin}
              onChange={(e) =>
                setForm({
                  ...form,
                  isFullAdmin: e.target.checked,
                  adminSections: e.target.checked ? [] : form.adminSections
                })
              }
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-semibold text-white">Full admin access</span>
              <span className="block text-xs text-slate-400 mt-0.5">
                Can see every section, including Manage Admins. Turn off to give only selected
                sections.
              </span>
            </span>
          </label>

          {!form.isFullAdmin && (
            <div>
              <p className="text-xs text-slate-400 mb-2">
                Choose sections this admin can open (pick 2–3 or as many as needed):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                {ASSIGNABLE_ADMIN_SECTIONS.map((s) => {
                  const checked = form.adminSections.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                        checked
                          ? "border-teal-500/40 bg-teal-500/10 text-teal-100"
                          : "border-slate-700 bg-slate-950 text-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSection(s.id)}
                      />
                      <span className="truncate">{s.label}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Selected: {form.adminSections.length || 0} · Overview & Profile are always included
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-semibold"
          >
            {saving ? "Saving…" : editingId ? "Update admin" : "Create admin"}
          </button>
        </form>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-800">
            <h3 className="text-base font-bold text-white">Admin accounts</h3>
            <p className="text-xs text-slate-400 mt-1">
              {loading ? "Loading…" : `${admins.length} admin(s)`}
            </p>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-slate-800">
            {admins.map((admin) => {
              const id = String(admin.id || admin._id);
              return (
                <div key={id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white">{admin.name}</p>
                      <p className="text-xs text-slate-400">{admin.email}</p>
                    </div>
                    <span
                      className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${
                        admin.isFullAdmin
                          ? "bg-amber-500/15 text-amber-200"
                          : "bg-cyan-500/15 text-cyan-200"
                      }`}
                    >
                      {admin.isFullAdmin ? "Full" : "Limited"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {admin.isFullAdmin
                      ? "All sections"
                      : (admin.adminSections || []).map(sectionLabel).join(", ") || "None"}
                  </p>
                  <p className="text-xs text-slate-500">Status: {admin.status}</p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => startEdit(admin)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(admin)}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/15 text-xs text-rose-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
            {!loading && admins.length === 0 && (
              <p className="p-4 text-sm text-slate-400">No admins found.</p>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase text-slate-400 bg-slate-950/50">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Access</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {admins.map((admin) => {
                  const id = String(admin.id || admin._id);
                  return (
                    <tr key={id} className="text-slate-200">
                      <td className="px-4 py-3 font-medium text-white">{admin.name}</td>
                      <td className="px-4 py-3 text-slate-400">{admin.email}</td>
                      <td className="px-4 py-3">
                        {admin.isFullAdmin ? (
                          <span className="text-amber-200">Full admin</span>
                        ) : (
                          <span className="text-slate-300">
                            {(admin.adminSections || []).map(sectionLabel).join(", ") || "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 capitalize">{admin.status}</td>
                      <td className="px-4 py-3 space-x-2">
                        <button
                          type="button"
                          onClick={() => startEdit(admin)}
                          className="text-teal-300 hover:text-teal-200"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(admin)}
                          className="text-rose-300 hover:text-rose-200"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!loading && admins.length === 0 && (
              <p className="p-4 text-sm text-slate-400">No admins found.</p>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
