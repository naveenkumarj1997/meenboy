import { useState, useEffect } from "react";
import DashboardShell from "./DashboardShell";
import { getDailyPriceProducts, updateDailyPrices } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { formatQuantityLabel } from "../../lib/weightOptions";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";

export default function AdminDailyPrices() {
  const { token } = useAuth();

  const [deliveryDate, setDeliveryDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });

  const [products, setProducts] = useState<any[]>([]);
  const [changes, setChanges] = useState<any[]>([]);
  const [dailyPriceUpdated, setDailyPriceUpdated] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updatedByName, setUpdatedByName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [priceUpdates, setPriceUpdates] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!token) return;
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryDate, token]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccessMsg("");
      const res = await getDailyPriceProducts(token!, deliveryDate);
      setProducts(res.products || []);
      setChanges(res.changes || []);
      setDailyPriceUpdated(Boolean(res.dailyPriceUpdated));
      setUpdatedAt(res.updatedAt || null);
      setUpdatedByName(res.updatedByName || null);

      const initialUpdates: Record<string, number> = {};
      (res.products || []).forEach((p: any) => {
        const key = `${p.productId}-${p.cutName || "default"}`;
        initialUpdates[key] = p.currentUnitPrice;
      });
      setPriceUpdates(initialUpdates);
    } catch (err: any) {
      setError(err.message || "Failed to fetch products for this date.");
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (productId: string, cutName: string, newPrice: number) => {
    const key = `${productId}-${cutName || "default"}`;
    setPriceUpdates((prev) => ({
      ...prev,
      [key]: newPrice
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccessMsg("");

      const updates = products.map((p) => {
        const key = `${p.productId}-${p.cutName || "default"}`;
        return {
          productId: p.productId,
          productName: p.productName,
          cutName: p.cutName || "",
          newPrice: priceUpdates[key]
        };
      });

      const res = await updateDailyPrices(token!, { deliveryDate, priceUpdates: updates });
      setSuccessMsg(
        res.updatedCount === 0
          ? `${res.message} Prices are saved for this date. If an order total did not change, the order may already be delivered or the delivery date may not match.`
          : res.message
      );

      if (res.products?.length) {
        setProducts(res.products);
        setChanges(res.changes || []);
        setDailyPriceUpdated(true);
        const initialUpdates: Record<string, number> = {};
        res.products.forEach((p: any) => {
          const key = `${p.productId}-${p.cutName || "default"}`;
          initialUpdates[key] = p.currentUnitPrice;
        });
        setPriceUpdates(initialUpdates);
      } else {
        await fetchProducts();
      }
    } catch (err: any) {
      setError(err.message || "Failed to update prices.");
    } finally {
      setSaving(false);
    }
  };

  const totalAmountDiff = changes.reduce((sum, c) => sum + Number(c.amountDifference || 0), 0);

  return (
    <DashboardShell
      title="Daily Price Management"
      description="Set actual market prices 1 day before delivery. Until you save here, customers see approximate prices on their order and invoice."
      navLinks={ADMIN_NAV_LINKS}
    >
      <div className="mb-6 bg-slate-900/50 border border-slate-800 rounded-xl p-5">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Select Delivery Date
        </label>
        <input
          type="date"
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-teal-500"
        />
      </div>

      {dailyPriceUpdated ? (
        <div className="mb-6 rounded-xl border-2 border-emerald-400 bg-emerald-500/15 p-4">
          <p className="text-emerald-300 font-black uppercase text-sm">Daily price was updated for this date</p>
          <p className="text-emerald-100/80 text-sm mt-1">
            {updatedAt ? `Saved ${new Date(updatedAt).toLocaleString()}` : "Saved"}
            {updatedByName ? ` · by ${updatedByName}` : ""}
          </p>
        </div>
      ) : (
        <div className="mb-6 rounded-xl border-2 border-amber-400 bg-amber-500/15 p-4">
          <p className="text-amber-300 font-black uppercase text-sm">Daily price is not updated for this date</p>
          <p className="text-amber-100/80 text-sm mt-1">
            Customers still see approximate booking prices. Save below 1 day before delivery to confirm actual rates.
          </p>
        </div>
      )}

      {dailyPriceUpdated && (
        <div className="mb-6 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h3 className="text-white font-bold">What changed for this day</h3>
            <p className="text-slate-400 text-sm mt-1">
              Booked rate vs daily rate, and how much extra or less customers pay.
            </p>
          </div>
          {changes.length === 0 ? (
            <p className="px-5 py-4 text-slate-400 text-sm">Rates were saved, but no fish amount changed.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300 min-w-[720px]">
                <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3 font-medium">Fish</th>
                    <th className="px-5 py-3 font-medium">Qty</th>
                    <th className="px-5 py-3 font-medium">Booked rate</th>
                    <th className="px-5 py-3 font-medium">Daily rate</th>
                    <th className="px-5 py-3 font-medium">Difference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {changes.map((c, idx) => {
                    const up = Number(c.amountDifference) > 0;
                    return (
                      <tr key={idx}>
                        <td className="px-5 py-3 text-white">
                          {c.productName}
                          {c.cutName ? <span className="text-slate-400"> · {c.cutName}</span> : null}
                        </td>
                        <td className="px-5 py-3">{formatQuantityLabel(c.quantity, c.unit)}</td>
                        <td className="px-5 py-3">₹{Number(c.bookedUnitPrice).toFixed(2)} / {c.unit || "kg"}</td>
                        <td className="px-5 py-3 font-semibold text-white">₹{Number(c.dailyUnitPrice).toFixed(2)} / {c.unit || "kg"}</td>
                        <td className={`px-5 py-3 font-black ${up ? "text-amber-300" : "text-teal-300"}`}>
                          {up ? "+" : "−"}₹{Math.abs(Number(c.amountDifference)).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {changes.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-800 flex justify-between text-sm">
              <span className="text-slate-400">Net amount difference for this date</span>
              <span className={`font-black ${totalAmountDiff >= 0 ? "text-amber-300" : "text-teal-300"}`}>
                {totalAmountDiff >= 0 ? "+" : "−"}₹{Math.abs(totalAmountDiff).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}

      {error && <div className="mb-4 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">{error}</div>}
      {successMsg && <div className="mb-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">{successMsg}</div>}

      {loading ? (
        <div className="text-slate-400">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="text-slate-400">No orders found for this delivery date.</div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300 min-w-[720px]">
              <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Product</th>
                  <th className="px-6 py-4 font-medium">Cut</th>
                  <th className="px-6 py-4 font-medium">Qty ordered</th>
                  <th className="px-6 py-4 font-medium">Booked rate</th>
                  <th className="px-6 py-4 font-medium">Daily unit price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {products.map((p) => {
                  const key = `${p.productId}-${p.cutName || "default"}`;
                  return (
                    <tr key={key} className="hover:bg-slate-800/20">
                      <td className="px-6 py-4 text-white">{p.productName}</td>
                      <td className="px-6 py-4">
                        {p.cutName ? (
                          <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md text-xs">
                            {p.cutName}
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-white">
                        {formatQuantityLabel(p.totalQuantity, p.unit)}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        ₹{Number(p.estimatedUnitPrice ?? p.currentUnitPrice).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={priceUpdates[key] ?? ""}
                            onChange={(e) => handlePriceChange(p.productId, p.cutName, parseFloat(e.target.value) || 0)}
                            className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-teal-500"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-800 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-teal-500 hover:bg-teal-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : dailyPriceUpdated ? "Save daily prices again" : "Update Prices"}
            </button>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
