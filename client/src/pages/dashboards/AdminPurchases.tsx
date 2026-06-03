import { useState, useEffect } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";

const NAV_LINKS = [
  { label: "Overview", href: "/dashboard/admin" },
  { label: "Profile", href: "/dashboard/admin/profile" },
  { label: "New Customers", href: "/dashboard/admin/new-customers" },
  { label: "New Delivery Partners", href: "/dashboard/admin/partner-approvals" },
  { label: "Products", href: "/dashboard/admin/products" },
  { label: "Daily Prices", href: "/dashboard/admin/daily-prices" },
  { label: "Order Management", href: "/dashboard/admin/deliveries" },
  { label: "Partner Report", href: "/dashboard/admin/partner-report" },
  { label: "Pending Payments", href: "/dashboard/admin/pending-payments" },
  { label: "Collected Payments", href: "/dashboard/admin/collected-payments" },
  { label: "Purchases", href: "/dashboard/admin/purchases" },
  { label: "Settlements", href: "/dashboard/admin/settlements" },
  { label: "Partner Salary", href: "/dashboard/admin/partner-salary" },
  { label: "Admin Earnings", href: "/dashboard/admin/earnings" },
  { label: "Users", href: "/dashboard/admin/users" },
  { label: "Money", href: "/dashboard/admin/finance" },
  { label: "Availability", href: "/dashboard/admin/availability" },
  { label: "Manual Booking", href: "/dashboard/admin/manual-booking" }
];

export default function AdminPurchases() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Format today's date as YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);

  const [formData, setFormData] = useState({
    chickenShop: 0,
    muttonShop: 0,
    fishCompany: 0,
    localFishShop: 0
  });

  useEffect(() => {
    if (token && selectedDate) {
      fetchPurchaseData(selectedDate);
    }
  }, [token, selectedDate]);

  const fetchPurchaseData = async (date: string) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/purchases/${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch purchase data");
      }
      
      const p = data.purchase;
      setFormData({
        chickenShop: p.chickenShop || 0,
        muttonShop: p.muttonShop || 0,
        fishCompany: p.fishCompany || 0,
        localFishShop: p.localFishShop || 0
      });
    } catch (err: any) {
      setError(err.message || "Failed to load purchases");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/purchases`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: selectedDate,
          ...formData
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to save purchases");
      }
      
      setSuccess("Purchases saved successfully for " + selectedDate);
    } catch (err: any) {
      setError(err.message || "Failed to save purchases");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    const numValue = value === "" ? 0 : Number(value);
    setFormData(prev => ({ ...prev, [field]: numValue }));
  };

  const totalPurchase = formData.chickenShop + formData.muttonShop + formData.fishCompany + formData.localFishShop;

  return (
    <DashboardShell
      title="Daily Purchases"
      description="Track and record your daily vendor purchases."
      navLinks={NAV_LINKS}
    >
      {error && <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">{error}</div>}
      {success && <div className="mb-6 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col - Input Form */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-slate-800 pb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Purchase Entry</h3>
              <p className="text-sm text-slate-400 mt-1">Select a date to view or edit.</p>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={today} // prevent future dates if desired
                className="bg-slate-950 border border-slate-700 text-white px-4 py-2 rounded-lg outline-none focus:border-teal-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Chicken Shop */}
              <div className="bg-slate-950/50 p-5 rounded-xl border border-slate-800 focus-within:border-teal-500/50 transition-colors">
                <label className="block text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <span>🍗</span> Chicken Shop
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-500">₹</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={formData.chickenShop || ""}
                    onChange={(e) => handleInputChange("chickenShop", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-4 py-3 text-white outline-none focus:border-teal-500 transition-colors"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Mutton Shop */}
              <div className="bg-slate-950/50 p-5 rounded-xl border border-slate-800 focus-within:border-teal-500/50 transition-colors">
                <label className="block text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <span>🍖</span> Mutton Shop
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-500">₹</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={formData.muttonShop || ""}
                    onChange={(e) => handleInputChange("muttonShop", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-4 py-3 text-white outline-none focus:border-teal-500 transition-colors"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Fish Company */}
              <div className="bg-slate-950/50 p-5 rounded-xl border border-slate-800 focus-within:border-teal-500/50 transition-colors">
                <label className="block text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <span>🏢</span> Fish Company
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-500">₹</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={formData.fishCompany || ""}
                    onChange={(e) => handleInputChange("fishCompany", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-4 py-3 text-white outline-none focus:border-teal-500 transition-colors"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Local Fish Shop */}
              <div className="bg-slate-950/50 p-5 rounded-xl border border-slate-800 focus-within:border-teal-500/50 transition-colors">
                <label className="block text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <span>🐟</span> Local Fish Shop
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-500">₹</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={formData.localFishShop || ""}
                    onChange={(e) => handleInputChange("localFishShop", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-4 py-3 text-white outline-none focus:border-teal-500 transition-colors"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 flex justify-end">
              <button
                onClick={handleSave}
                disabled={loading}
                className="bg-teal-500 hover:bg-teal-400 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? "Saving..." : "Save Purchases"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Col - Summary */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl sticky top-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              📊 Daily Summary
            </h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Chicken Shop</span>
                <span className="font-medium text-white">₹{formData.chickenShop.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Mutton Shop</span>
                <span className="font-medium text-white">₹{formData.muttonShop.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Fish Company</span>
                <span className="font-medium text-white">₹{formData.fishCompany.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Local Fish Shop</span>
                <span className="font-medium text-white">₹{formData.localFishShop.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800">
              <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Total Purchases</div>
              <div className="text-4xl font-black text-teal-400">
                ₹{totalPurchase.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}

