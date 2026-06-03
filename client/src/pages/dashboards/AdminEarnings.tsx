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

export default function AdminEarnings() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [earnings, setEarnings] = useState<any[]>([]);

  // State for search, sort, and pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "grossEarnings" | "actualEarnings">("date");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (token) fetchEarnings();
  }, [token]);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      setError("");
      
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/purchases/admin-earnings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch earnings");
      }
      
      setEarnings(data.earnings || []);
    } catch (err: any) {
      setError(err.message || "Failed to load admin earnings");
    } finally {
      setLoading(false);
    }
  };

  // Filter, sort, and paginate
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
      } else if (sortBy === "grossEarnings") {
        return sortOrder === "desc"
          ? (b.grossEarnings || 0) - (a.grossEarnings || 0)
          : (a.grossEarnings || 0) - (b.grossEarnings || 0);
      } else {
        return sortOrder === "desc"
          ? (b.actualEarnings || 0) - (a.actualEarnings || 0)
          : (a.actualEarnings || 0) - (b.actualEarnings || 0);
      }
    });

  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);
  
  // Reset page if search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, sortOrder]);

  const paginatedData = filteredAndSorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const lifetimeGross = earnings.reduce((sum, item) => sum + (item.grossEarnings || 0), 0);
  const lifetimeActual = earnings.reduce((sum, item) => sum + (item.actualEarnings || 0), 0);
  const lifetimePending = earnings.reduce((sum, item) => sum + (item.amountPending || 0), 0);

  return (
    <DashboardShell
      title="Admin Earnings & Profitability"
      description="Track your daily business profit, balancing sales against purchase costs, partner salaries, and customer debts."
      navLinks={NAV_LINKS}
    >
      {error && <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-blue-500/10 text-blue-400 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-l border-b border-blue-500/20 uppercase tracking-wider">
            Theoretical
          </div>
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Lifetime Gross Earnings</div>
          <div className={`text-4xl font-black ${lifetimeGross >= 0 ? 'text-teal-400' : 'text-rose-400'}`}>
            ₹{lifetimeGross.toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 mt-2">Sales − Purchases − Salaries</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-amber-500/10 text-amber-400 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-l border-b border-amber-500/20 uppercase tracking-wider">
            Debt
          </div>
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Lifetime Pending from Customers</div>
          <div className={`text-4xl font-black ${lifetimePending > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
            ₹{lifetimePending.toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 mt-2">Money not yet collected</p>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl p-6 shadow-[0_0_20px_rgba(16,185,129,0.1)] relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-l border-b border-emerald-500/20 uppercase tracking-wider">
            Cash In Hand
          </div>
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Lifetime Actual Earnings</div>
          <div className={`text-4xl font-black ${lifetimeActual >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ₹{lifetimeActual.toFixed(2)}
          </div>
          <p className="text-xs text-emerald-500/50 mt-2">Collected − Purchases − Salaries</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        
        {/* Controls: Search & Sort */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">🔍</span>
            <input
              type="text"
              placeholder="Search by date (YYYY-MM-DD)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          
          <div className="flex gap-2 items-center">
            <span className="text-sm text-slate-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="date">Date</option>
              <option value="grossEarnings">Gross Earnings</option>
              <option value="actualEarnings">Actual Earnings</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
              className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg px-3 py-2 transition-colors border border-slate-700"
            >
              {sortOrder === "desc" ? "↓ Desc" : "↑ Asc"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Total Sales</th>
                <th className="px-6 py-4 text-right text-rose-400/70">− Purchases</th>
                <th className="px-6 py-4 text-right text-rose-400/70">− Salaries</th>
                <th className="px-6 py-4 text-right text-teal-400/70">= Gross Earn</th>
                <th className="px-6 py-4 text-right text-amber-400/70">− Pending</th>
                <th className="px-6 py-4 text-right text-emerald-400">= Actual Earn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">Calculating your profits...</td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">No financial data available yet.</td>
                </tr>
              ) : (
                paginatedData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-white whitespace-nowrap">{item.date}</td>
                    <td className="px-6 py-4 text-right text-white">₹{(item.totalSales || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-rose-400">₹{(item.totalPurchases || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-rose-400">₹{(item.partnerSalaries || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-bold text-teal-400 bg-teal-500/5 border-l border-r border-slate-800/50">
                      ₹{(item.grossEarnings || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right text-amber-400">₹{(item.amountPending || 0).toFixed(2)}</td>
                    <td className={`px-6 py-4 text-right font-black text-lg ${item.actualEarnings >= 0 ? 'text-emerald-400 bg-emerald-500/5' : 'text-rose-400 bg-rose-500/5'}`}>
                      ₹{(item.actualEarnings || 0).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/50">
            <span className="text-sm text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-white disabled:opacity-50 hover:bg-slate-700 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-white disabled:opacity-50 hover:bg-slate-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
