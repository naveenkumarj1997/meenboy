import { useState, useEffect } from "react";
import DashboardShell from "./DashboardShell";
import { getDailyPriceProducts, updateDailyPrices } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

const ADMIN_NAV_LINKS = [
  { label: "Overview", href: "/dashboard/admin" },
  { label: "Profile", href: "/dashboard/admin/profile" },
  { label: "New Customers", href: "/dashboard/admin/new-customers" },
  { label: "New Delivery Partners", href: "/dashboard/admin/partner-approvals" },
  { label: "Products", href: "/dashboard/admin/products" },
  { label: "Daily Prices", href: "/dashboard/admin/daily-prices" },
  { label: "Order Management", href: "/dashboard/admin/deliveries" },
  { label: "Partner Report", href: "/dashboard/admin/partner-report" },
  { label: "Users", href: "/dashboard/admin/users" },
  { label: "Money", href: "/dashboard/admin/finance" },
  { label: "Availability", href: "/dashboard/admin/availability" },
  { label: "Manual Booking", href: "/dashboard/admin/manual-booking" }
];

export default function AdminDailyPrices() {
  const { token } = useAuth();
  
  // Default to tomorrow
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  
  const [products, setProducts] = useState<any[]>([]);
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
      setProducts(res.products);
      
      const initialUpdates: Record<string, number> = {};
      res.products.forEach((p: any) => {
        const key = `${p.productId}-${p.cutName || 'default'}`;
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
    const key = `${productId}-${cutName || 'default'}`;
    setPriceUpdates(prev => ({
      ...prev,
      [key]: newPrice
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccessMsg("");
      
      const updates = products.map(p => {
        const key = `${p.productId}-${p.cutName || 'default'}`;
        return {
          productId: p.productId,
          cutName: p.cutName,
          newPrice: priceUpdates[key]
        };
      });
      
      const res = await updateDailyPrices(token!, { deliveryDate, priceUpdates: updates });
      setSuccessMsg(res.message);
    } catch (err: any) {
      setError(err.message || "Failed to update prices.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell
      title="Daily Price Management"
      description="Update prices for products ordered for a specific delivery date. The order totals will be recalculated automatically."
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

      {error && <div className="mb-4 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">{error}</div>}
      {successMsg && <div className="mb-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">{successMsg}</div>}

      {loading ? (
        <div className="text-slate-400">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="text-slate-400">No pending or confirmed orders found for this delivery date.</div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium">Cut</th>
                <th className="px-6 py-4 font-medium">Total Quantity Ordered</th>
                <th className="px-6 py-4 font-medium">New Unit Price (per unit)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {products.map((p) => {
                const key = `${p.productId}-${p.cutName || 'default'}`;
                return (
                  <tr key={key} className="hover:bg-slate-800/20">
                    <td className="px-6 py-4">{p.productName}</td>
                    <td className="px-6 py-4">
                      {p.cutName ? (
                        <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md text-xs">
                          {p.cutName}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-white">{p.totalQuantity}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">$</span>
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
          <div className="p-4 border-t border-slate-800 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-teal-500 hover:bg-teal-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? "Updating..." : "Update Prices"}
            </button>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
