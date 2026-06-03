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

export default function AdminSettlements() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);

  // We need to keep track of the original purchases and the settled amounts
  const [purchases, setPurchases] = useState({
    chickenShop: 0,
    muttonShop: 0,
    fishCompany: 0,
    localFishShop: 0
  });

  const [settled, setSettled] = useState({
    chickenShopSettled: 0,
    muttonShopSettled: 0,
    fishCompanySettled: 0,
    localFishShopSettled: 0
  });

  const [overallPending, setOverallPending] = useState<any>(null);

  useEffect(() => {
    if (token) {
      fetchOverallPending();
    }
  }, [token]);

  useEffect(() => {
    if (token && selectedDate) {
      fetchSettlementData(selectedDate);
    }
  }, [token, selectedDate]);

  const fetchOverallPending = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/purchases/overall-pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setOverallPending(data);
    } catch (err) {
      console.error("Failed to fetch overall pending", err);
    }
  };

  const fetchSettlementData = async (date: string) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/purchases/${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch settlement data");
      }
      
      const p = data.purchase;
      setPurchases({
        chickenShop: p.chickenShop || 0,
        muttonShop: p.muttonShop || 0,
        fishCompany: p.fishCompany || 0,
        localFishShop: p.localFishShop || 0
      });
      setSettled({
        chickenShopSettled: p.chickenShopSettled || 0,
        muttonShopSettled: p.muttonShopSettled || 0,
        fishCompanySettled: p.fishCompanySettled || 0,
        localFishShopSettled: p.localFishShopSettled || 0
      });
    } catch (err: any) {
      setError(err.message || "Failed to load settlements");
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
          ...purchases, // Must send purchases back so they aren't overwritten with 0
          ...settled
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to save settlements");
      }
      
      setSuccess("Settlements saved successfully for " + selectedDate);
      fetchOverallPending(); // Refresh overall pending
    } catch (err: any) {
      setError(err.message || "Failed to save settlements");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof settled, value: string) => {
    const numValue = value === "" ? 0 : Number(value);
    setSettled(prev => ({ ...prev, [field]: numValue }));
  };

  // Calculations
  const totalPurchase = purchases.chickenShop + purchases.muttonShop + purchases.fishCompany + purchases.localFishShop;
  const totalSettledAmt = settled.chickenShopSettled + settled.muttonShopSettled + settled.fishCompanySettled + settled.localFishShopSettled;
  const totalPending = totalPurchase - totalSettledAmt;

  const pendingChicken = purchases.chickenShop - settled.chickenShopSettled;
  const pendingMutton = purchases.muttonShop - settled.muttonShopSettled;
  const pendingFishCo = purchases.fishCompany - settled.fishCompanySettled;
  const pendingLocalFish = purchases.localFishShop - settled.localFishShopSettled;

  return (
    <DashboardShell
      title="Vendor Settlements"
      description="Manage and pay your vendors for daily purchases."
      navLinks={NAV_LINKS}
    >
      {error && <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">{error}</div>}
      {success && <div className="mb-6 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">{success}</div>}

      {overallPending && (
        <div className="mb-6 bg-slate-900 border border-rose-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-rose-500/10 text-rose-400 text-xs font-bold px-3 py-1 rounded-bl-xl border-l border-b border-rose-500/20">
            LIFETIME DEBT
          </div>
          <h3 className="text-lg font-bold text-white mb-4">Total Outstanding Pending to Vendors</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-500 uppercase font-bold mb-1">🍗 Chicken Shop</div>
              <div className={`text-xl font-bold ${overallPending.chickenPending > 0 ? 'text-rose-400' : 'text-teal-400'}`}>₹{overallPending.chickenPending.toFixed(2)}</div>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-500 uppercase font-bold mb-1">🍖 Mutton Shop</div>
              <div className={`text-xl font-bold ${overallPending.muttonPending > 0 ? 'text-rose-400' : 'text-teal-400'}`}>₹{overallPending.muttonPending.toFixed(2)}</div>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-500 uppercase font-bold mb-1">🏢 Fish Company</div>
              <div className={`text-xl font-bold ${overallPending.fishCoPending > 0 ? 'text-rose-400' : 'text-teal-400'}`}>₹{overallPending.fishCoPending.toFixed(2)}</div>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-500 uppercase font-bold mb-1">🐟 Local Fish</div>
              <div className={`text-xl font-bold ${overallPending.localFishPending > 0 ? 'text-rose-400' : 'text-teal-400'}`}>₹{overallPending.localFishPending.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col - Input Form */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-slate-800 pb-6">
            <div>
              <h3 className="text-xl font-bold text-white">Settlement Entry</h3>
              <p className="text-sm text-slate-400 mt-1">Select a date to view purchases and enter payments.</p>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={today}
                className="bg-slate-950 border border-slate-700 text-white px-4 py-2 rounded-lg outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-6">
            
            {/* Vendor Card - Chicken Shop */}
            <div className="bg-slate-950/50 p-5 rounded-xl border border-slate-800 focus-within:border-blue-500/50 transition-colors">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><span>🍗</span> Chicken Shop</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                  <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Purchased</div>
                  <div className="text-lg font-bold text-white">₹{purchases.chickenShop.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Amount Settled</div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-500">₹</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={settled.chickenShopSettled || ""}
                      onChange={(e) => handleInputChange("chickenShopSettled", e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-4 py-2 text-white outline-none focus:border-blue-500 transition-colors"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className={`bg-slate-900 border rounded-lg p-3 ${pendingChicken > 0 ? 'border-rose-500/30' : pendingChicken < 0 ? 'border-teal-500/30' : 'border-slate-800'}`}>
                  <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Pending</div>
                  <div className={`text-lg font-bold ${pendingChicken > 0 ? 'text-rose-400' : pendingChicken < 0 ? 'text-teal-400' : 'text-slate-400'}`}>
                    ₹{pendingChicken.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Vendor Card - Mutton Shop */}
            <div className="bg-slate-950/50 p-5 rounded-xl border border-slate-800 focus-within:border-blue-500/50 transition-colors">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><span>🍖</span> Mutton Shop</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                  <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Purchased</div>
                  <div className="text-lg font-bold text-white">₹{purchases.muttonShop.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Amount Settled</div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-500">₹</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={settled.muttonShopSettled || ""}
                      onChange={(e) => handleInputChange("muttonShopSettled", e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-4 py-2 text-white outline-none focus:border-blue-500 transition-colors"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className={`bg-slate-900 border rounded-lg p-3 ${pendingMutton > 0 ? 'border-rose-500/30' : pendingMutton < 0 ? 'border-teal-500/30' : 'border-slate-800'}`}>
                  <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Pending</div>
                  <div className={`text-lg font-bold ${pendingMutton > 0 ? 'text-rose-400' : pendingMutton < 0 ? 'text-teal-400' : 'text-slate-400'}`}>
                    ₹{pendingMutton.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Vendor Card - Fish Company */}
            <div className="bg-slate-950/50 p-5 rounded-xl border border-slate-800 focus-within:border-blue-500/50 transition-colors">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><span>🏢</span> Fish Company</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                  <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Purchased</div>
                  <div className="text-lg font-bold text-white">₹{purchases.fishCompany.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Amount Settled</div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-500">₹</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={settled.fishCompanySettled || ""}
                      onChange={(e) => handleInputChange("fishCompanySettled", e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-4 py-2 text-white outline-none focus:border-blue-500 transition-colors"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className={`bg-slate-900 border rounded-lg p-3 ${pendingFishCo > 0 ? 'border-rose-500/30' : pendingFishCo < 0 ? 'border-teal-500/30' : 'border-slate-800'}`}>
                  <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Pending</div>
                  <div className={`text-lg font-bold ${pendingFishCo > 0 ? 'text-rose-400' : pendingFishCo < 0 ? 'text-teal-400' : 'text-slate-400'}`}>
                    ₹{pendingFishCo.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Vendor Card - Local Fish Shop */}
            <div className="bg-slate-950/50 p-5 rounded-xl border border-slate-800 focus-within:border-blue-500/50 transition-colors">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><span>🐟</span> Local Fish Shop</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                  <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Purchased</div>
                  <div className="text-lg font-bold text-white">₹{purchases.localFishShop.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Amount Settled</div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-500">₹</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={settled.localFishShopSettled || ""}
                      onChange={(e) => handleInputChange("localFishShopSettled", e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-4 py-2 text-white outline-none focus:border-blue-500 transition-colors"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className={`bg-slate-900 border rounded-lg p-3 ${pendingLocalFish > 0 ? 'border-rose-500/30' : pendingLocalFish < 0 ? 'border-teal-500/30' : 'border-slate-800'}`}>
                  <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Pending</div>
                  <div className={`text-lg font-bold ${pendingLocalFish > 0 ? 'text-rose-400' : pendingLocalFish < 0 ? 'text-teal-400' : 'text-slate-400'}`}>
                    ₹{pendingLocalFish.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 flex justify-end">
              <button
                onClick={handleSave}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? "Saving..." : "Save Settlements"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Col - Summary */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl sticky top-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              📊 Settlement Summary
            </h3>
            
            <div className="space-y-6">
              
              <div>
                <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Total Purchased</div>
                <div className="text-2xl font-bold text-white">₹{totalPurchase.toFixed(2)}</div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Total Settled</div>
                <div className="text-3xl font-black text-blue-400">₹{totalSettledAmt.toFixed(2)}</div>
              </div>

              <div className="pt-6 border-t border-slate-800">
                <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Total Pending to Settle</div>
                <div className={`text-4xl font-black ${totalPending > 0 ? 'text-rose-500' : totalPending < 0 ? 'text-teal-500' : 'text-slate-300'}`}>
                  ₹{totalPending.toFixed(2)}
                </div>
                {totalPending < 0 && (
                  <p className="text-teal-400 text-xs mt-2 font-medium">You have overpaid by ₹{Math.abs(totalPending).toFixed(2)}</p>
                )}
              </div>
              
            </div>
          </div>
        </div>

      </div>
    </DashboardShell>
  );
}

