import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import {
  getAdminProducts,
  getAdminTodayCatch,
  updateTodayCatch,
  type TodayCatchItem
} from "../../lib/api";

const emptyItem = (): TodayCatchItem => ({
  name: "",
  price: 0,
  unit: "kg",
  note: "",
  availableQty: 0,
  imageUrl: "",
  productId: null
});

export default function AdminTodaysCatch() {
  const { token } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [headline, setHeadline] = useState("Stock Available");
  const [subheadline, setSubheadline] = useState(
    "See what's in stock today — price & quantity. Order fast on WhatsApp."
  );
  const [items, setItems] = useState<TodayCatchItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [productPick, setProductPick] = useState("");

  const load = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError("");
      const [catchRes, productsRes] = await Promise.all([
        getAdminTodayCatch(token),
        getAdminProducts(token)
      ]);
      const data = catchRes.todayCatch;
      setEnabled(data.enabled === true);
      setHeadline(data.headline || "Stock Available");
      setSubheadline(
        data.subheadline ||
          "See what's in stock today — price & quantity. Order fast on WhatsApp."
      );
      setItems(data.items || []);
      setProducts(productsRes.data?.products || []);
    } catch (err: any) {
      setError(err.message || "Failed to load today's catch");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const updateItem = (index: number, patch: Partial<TodayCatchItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addBlank = () => {
    if (items.length >= 24) {
      setError("Maximum 24 items");
      return;
    }
    setItems((prev) => [...prev, emptyItem()]);
  };

  const addFromProduct = () => {
    if (!productPick) return;
    const p = products.find((x) => String(x._id) === productPick);
    if (!p) return;
    if (items.length >= 24) {
      setError("Maximum 24 items");
      return;
    }
    const price = Number(p.minPrice ?? p.price ?? 0) || 0;
    setItems((prev) => [
      ...prev,
      {
        name: p.name || "",
        price,
        unit: p.unit || "kg",
        note: "",
        availableQty: 0,
        imageUrl: p.image || p.imageUrl || "",
        productId: String(p._id)
      }
    ]);
    setProductPick("");
  };

  const handleToggle = async () => {
    if (!token || saving) return;
    const next = !enabled;

    if (next) {
      const hasItems = items.some(
        (item) => item.name.trim() && Number.isFinite(Number(item.price)) && Number(item.price) >= 0
      );
      if (!hasItems) {
        setError("Add at least one item before turning ON for the homepage");
        return;
      }
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      setEnabled(next);
      const res = await updateTodayCatch(token, { enabled: next });
      setEnabled(res.todayCatch.enabled === true);
      setSuccess(
        res.todayCatch.enabled
          ? "ON — Today's Catch is visible on the customer home page"
          : "OFF — Today's Catch is hidden on the home page"
      );
    } catch (err: any) {
      setEnabled(!next);
      setError(err.message || "Failed to update toggle");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!token) return;
    const cleaned = items
      .map((item, index) => ({
        ...item,
        name: item.name.trim(),
        price: Number(item.price),
        unit: (item.unit || "kg").trim(),
        note: (item.note || "").trim(),
        availableQty: Number(item.availableQty) > 0 ? Number(item.availableQty) : 0,
        sortOrder: index
      }))
      .filter((item) => item.name && Number.isFinite(item.price) && item.price >= 0);

    if (enabled && cleaned.length === 0) {
      setError("Add at least one item before keeping the homepage ON");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const res = await updateTodayCatch(token, {
        enabled,
        headline: headline.trim(),
        subheadline: subheadline.trim(),
        items: cleaned
      });
      setItems(res.todayCatch.items || []);
      setEnabled(res.todayCatch.enabled === true);
      setHeadline(res.todayCatch.headline || "Stock Available");
      setSubheadline(res.todayCatch.subheadline || "");
      setSuccess(
        res.todayCatch.enabled
          ? "Saved — visible on the customer home page (below the hero)"
          : "Saved — hidden on the home page (toggle is OFF)"
      );
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell
      title="Today's Catch"
      description="Control the homepage board: add fish with today's prices, then turn the toggle ON to show it to customers."
      navLinks={ADMIN_NAV_LINKS}
    >
      {error && (
        <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {success}
        </div>
      )}

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : (
        <div className="space-y-5">
          {/* Show on homepage toggle */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-white font-bold text-base">Show on homepage</h3>
              <p className="text-slate-400 text-xs mt-1">
                Saves immediately when you switch. ON = customers see live stock on the home
                page. OFF = home page shows “no stock now — pre-order for Wednesday & Sunday”.
              </p>
              <p className="text-xs mt-2 font-semibold">
                Status:{" "}
                <span className={enabled ? "text-teal-300" : "text-slate-400"}>
                  {enabled ? "ON — visible to customers" : "OFF — hidden"}
                </span>
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={saving}
              onClick={handleToggle}
              className={`relative inline-flex h-9 w-16 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                enabled ? "bg-teal-500" : "bg-slate-700"
              }`}
            >
              <span
                className={`inline-block h-7 w-7 transform rounded-full bg-white shadow transition-transform ${
                  enabled ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Headline</label>
              <input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Subheadline</label>
              <input
                value={subheadline}
                onChange={(e) => setSubheadline(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end justify-between">
              <h3 className="text-white font-bold">Catch items ({items.length})</h3>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <select
                  value={productPick}
                  onChange={(e) => setProductPick(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm flex-1 sm:w-56"
                >
                  <option value="">Add from products…</option>
                  {products
                    .filter((p) => p.isActive !== false)
                    .map((p) => (
                      <option key={p._id} value={String(p._id)}>
                        {p.name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={addFromProduct}
                  disabled={!productPick}
                  className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-40"
                >
                  Add product
                </button>
                <button
                  type="button"
                  onClick={addBlank}
                  className="px-3 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white text-sm font-semibold"
                >
                  + Custom item
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <p className="text-slate-500 text-sm py-6 text-center">
                No items yet. Add from products or create a custom row.
              </p>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={item.id || `new-${index}`}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950/50"
                  >
                    <div className="md:col-span-3">
                      <label className="text-[10px] uppercase text-slate-500">Name</label>
                      <input
                        value={item.name}
                        onChange={(e) => updateItem(index, { name: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-sm"
                        placeholder="Seer fish"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] uppercase text-slate-500">Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price || ""}
                        onChange={(e) =>
                          updateItem(index, {
                            price: e.target.value === "" ? 0 : Number(e.target.value)
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-sm"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="text-[10px] uppercase text-slate-500">Unit</label>
                      <input
                        value={item.unit || ""}
                        onChange={(e) => updateItem(index, { unit: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-sm"
                        placeholder="kg"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] uppercase text-slate-500">
                        Available qty
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={item.availableQty || ""}
                        onChange={(e) =>
                          updateItem(index, {
                            availableQty: e.target.value === "" ? 0 : Number(e.target.value)
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-sm"
                        placeholder="e.g. 4"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] uppercase text-slate-500">Note</label>
                      <input
                        value={item.note || ""}
                        onChange={(e) => updateItem(index, { note: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-sm"
                        placeholder="Fresh today"
                      />
                    </div>
                    <div className="md:col-span-2 flex items-end">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="w-full px-3 py-2 rounded-lg text-rose-300 hover:bg-rose-500/10 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold text-sm"
          >
            {saving ? "Saving…" : "Save Today's Catch"}
          </button>
        </div>
      )}
    </DashboardShell>
  );
}
