import { useState, useEffect } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";

const PARTNER_NAV_LINKS = [
  { label: "Deliveries", href: "/dashboard/delivery" },
  { label: "Earnings", href: "/dashboard/delivery/earnings" }
];

export default function PartnerEarnings() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [earnings, setEarnings] = useState<any[]>([]);
  
  // Search and Sort
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "earnings">("date");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    if (token) fetchEarnings();
  }, [token]);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      setError("");
      
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/me/earnings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch earnings");
      }
      
      setEarnings(data.earnings || []);
    } catch (err: any) {
      setError(err.message || "Failed to load earnings data");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCollection = async (date: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/me/earnings/${date}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to confirm collection");
      
      // Update local state
      setEarnings(prev => prev.map(e => e.date === date ? { ...e, partnerConfirmed: true } : e));
    } catch (err: any) {
      setError(err.message || "Failed to confirm collection");
    }
  };

  // Filter and Sort Data
  const filteredAndSorted = [...earnings]
    .filter(e => {
      if (!searchQuery) return true;
      return e.date.includes(searchQuery);
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        return sortOrder === "desc" 
          ? new Date(b.date).getTime() - new Date(a.date).getTime()
          : new Date(a.date).getTime() - new Date(b.date).getTime();
      } else {
        return sortOrder === "desc"
          ? b.salaryEarned - a.salaryEarned
          : a.salaryEarned - b.salaryEarned;
      }
    });

  const totalEarned = filteredAndSorted.reduce((sum, item) => sum + (item.salaryEarned || 0), 0);
  const totalCOD = filteredAndSorted.reduce((sum, item) => sum + (item.codCollected || 0), 0);
  const totalUPI = filteredAndSorted.reduce((sum, item) => sum + (item.upiCollected || 0), 0);

  return (
    <DashboardShell
      title="My Earnings & Collections"
      description="Track your daily payouts and the cash/UPI amounts you've collected."
      navLinks={PARTNER_NAV_LINKS}
    >
      {error && <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Displayed Earnings</div>
          <div className="text-3xl font-black text-purple-400">₹{totalEarned.toFixed(2)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Displayed COD</div>
          <div className="text-3xl font-black text-amber-400">₹{totalCOD.toFixed(2)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Displayed UPI</div>
          <div className="text-3xl font-black text-blue-400">₹{totalUPI.toFixed(2)}</div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        
        {/* Controls */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">🔍</span>
            <input
              type="text"
              placeholder="Search by date (YYYY-MM-DD)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2 outline-none focus:border-purple-500 transition-colors"
            />
          </div>
          
          <div className="flex gap-2 items-center">
            <span className="text-sm text-slate-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:border-purple-500 transition-colors"
            >
              <option value="date">Date</option>
              <option value="earnings">Earnings</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
              className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg px-3 py-2 transition-colors border border-slate-700"
            >
              {sortOrder === "desc" ? "↓" : "↑"}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-center">Deliveries (Succ/Fail)</th>
                <th className="px-6 py-4 text-right">Cash (COD) Collected</th>
                <th className="px-6 py-4 text-right">UPI Collected</th>
                <th className="px-6 py-4 text-right text-purple-400">Salary Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">Loading your earnings data...</td>
                </tr>
              ) : filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">No earnings data found matching your criteria.</td>
                </tr>
              ) : (
                filteredAndSorted.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-white">{item.date}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-teal-400 font-bold">{item.deliveredCount}</span>
                      <span className="text-slate-500 mx-1">/</span>
                      <span className="text-rose-400 font-bold">{item.failedCount}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-amber-400">₹{item.codCollected.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-medium text-blue-400">₹{item.upiCollected.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-black text-purple-400 text-lg">
                      <div className="flex flex-col items-end gap-1">
                        <span>₹{item.salaryEarned.toFixed(2)}</span>
                        {item.salaryEarned > 0 && (
                          item.partnerConfirmed ? (
                            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">Collected ✅</span>
                          ) : (
                            <button
                              onClick={() => handleConfirmCollection(item.date)}
                              className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded font-bold shadow-lg shadow-purple-500/30 transition-colors"
                            >
                              Collect
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
