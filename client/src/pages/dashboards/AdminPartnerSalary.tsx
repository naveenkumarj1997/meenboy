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

export default function AdminPartnerSalary() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [stats, setStats] = useState<any[]>([]);
  
  // Local state to manage salary inputs before saving
  const [salaryInputs, setSalaryInputs] = useState<Record<string, number>>({});

  useEffect(() => {
    if (token && selectedDate) {
      fetchData(selectedDate);
    }
  }, [token, selectedDate]);

  const fetchData = async (date: string) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/partner-salaries/${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch data");
      }
      
      setStats(data.stats || []);
      
      const initialInputs: Record<string, number> = {};
      data.stats.forEach((s: any) => {
        initialInputs[s.partnerId] = s.salaryAmount;
      });
      setSalaryInputs(initialInputs);
      
    } catch (err: any) {
      setError(err.message || "Failed to load partner stats");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (partnerId: string, val: string) => {
    const num = val === "" ? 0 : Number(val);
    setSalaryInputs(prev => ({ ...prev, [partnerId]: num }));
  };

  const handleSave = async (partnerId: string, partnerName: string) => {
    try {
      setError("");
      setSuccess("");
      
      const amount = salaryInputs[partnerId];
      
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/partner-salaries`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: selectedDate,
          partnerId,
          amount
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to save salary");
      }
      
      setSuccess(`Salary of ₹${amount} saved for ${partnerName}`);
      
      // Update local stats object so UI reflects the saved state
      setStats(prev => prev.map(s => s.partnerId === partnerId ? { ...s, salaryAmount: amount } : s));
      
    } catch (err: any) {
      setError(err.message || "Failed to save salary");
    }
  };

  return (
    <DashboardShell
      title="Delivery Partner Salary"
      description="Track daily deliveries, collections, and manage payouts for your delivery partners."
      navLinks={NAV_LINKS}
    >
      {error && <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">{error}</div>}
      {success && <div className="mb-6 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">{success}</div>}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-xl font-bold text-white">Select Date</h3>
            <p className="text-sm text-slate-400 mt-1">Showing data for partners who worked on this date.</p>
          </div>
          <div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={today}
              className="bg-slate-950 border border-slate-700 text-white px-4 py-2 rounded-lg outline-none focus:border-purple-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading delivery data...</div>
      ) : stats.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-xl">
          <div className="text-4xl mb-4">🛵</div>
          <h3 className="text-lg font-bold text-white mb-2">No Deliveries Found</h3>
          <p className="text-slate-400">No delivery partners were assigned orders on {selectedDate}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {stats.map(partner => (
            <div key={partner.partnerId} className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl hover:border-slate-700 transition-colors">
              
              {/* Header */}
              <div className="bg-slate-800/40 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800/50 gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xl border border-purple-500/30">
                    {partner.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">{partner.name}</h3>
                      {partner.salaryAmount > 0 && (
                        partner.partnerConfirmed ? (
                          <span className="text-[10px] uppercase tracking-wider font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">Collected ✅</span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wider font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">Ask to confirm ⏳</span>
                        )
                      )}
                    </div>
                    <p className="text-xs text-slate-400">📞 {partner.phone || "No phone"}</p>
                  </div>
                </div>
                
                {/* Payout Input */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-500">₹</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={salaryInputs[partner.partnerId] || ""}
                      onChange={(e) => handleInputChange(partner.partnerId, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-4 py-2 text-white outline-none focus:border-purple-500 transition-colors"
                      placeholder="Salary Amount"
                    />
                  </div>
                  <button
                    onClick={() => handleSave(partner.partnerId, partner.name)}
                    disabled={salaryInputs[partner.partnerId] === partner.salaryAmount}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap shadow-lg shadow-purple-500/20"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Delivered</div>
                  <div className="text-2xl font-black text-teal-400">{partner.deliveredCount}</div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Failed</div>
                  <div className="text-2xl font-black text-rose-400">{partner.failedCount}</div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cash (COD) Collected</div>
                  <div className="text-2xl font-black text-amber-400">₹{partner.codCollected.toFixed(2)}</div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">UPI Collected</div>
                  <div className="text-2xl font-black text-blue-400">₹{partner.upiCollected.toFixed(2)}</div>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

