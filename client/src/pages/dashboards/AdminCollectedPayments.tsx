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

export default function AdminCollectedPayments() {
  const { token } = useAuth();
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "customer">("date");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (token) fetchCollections();
  }, [token]);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      setError("");
      
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/collected-payments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error("Failed to fetch collected payments");
      }
      
      const data = await res.json();
      setCollections(data.collections || []);
    } catch (err: any) {
      setError(err.message || "Failed to load collected payments");
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSorted = [...collections]
    .filter(c => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (c.customer?.name && c.customer.name.toLowerCase().includes(q)) ||
        (c.customer?.phone && c.customer.phone.toLowerCase().includes(q)) ||
        (c.admin?.name && c.admin.name.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        return sortOrder === "desc"
          ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === "amount") {
        return sortOrder === "desc"
          ? (b.amount || 0) - (a.amount || 0)
          : (a.amount || 0) - (b.amount || 0);
      } else {
        const nameA = a.customer?.name || "";
        const nameB = b.customer?.name || "";
        return sortOrder === "desc"
          ? nameB.localeCompare(nameA)
          : nameA.localeCompare(nameB);
      }
    });

  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage) || 1;
  const currentItems = filteredAndSorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalAmountCollected = filteredAndSorted.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <DashboardShell
      title="Collected Payments Log"
      description="View the history of all manual payment collections from customers."
      navLinks={NAV_LINKS}
    >
      {error && <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center">
          <div className="text-slate-400 text-sm mb-1 uppercase tracking-wider font-medium">Total Displayed Collections</div>
          <div className="text-4xl font-black text-white">₹{totalAmountCollected.toFixed(2)}</div>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center gap-4">
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">🔍</span>
            <input
              type="text"
              placeholder="Search customer or admin..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-3 text-white outline-none focus:border-teal-500 transition-colors"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="flex gap-2 items-center">
            <span className="text-sm text-slate-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any);
                setCurrentPage(1);
              }}
              className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:border-teal-500 transition-colors"
            >
              <option value="date">Date</option>
              <option value="amount">Amount</option>
              <option value="customer">Customer Name</option>
            </select>
            <button
              onClick={() => {
                setSortOrder(prev => prev === "desc" ? "asc" : "desc");
                setCurrentPage(1);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg px-3 py-2 transition-colors border border-slate-700"
            >
              {sortOrder === "desc" ? "↓ Desc" : "↑ Asc"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 border-b border-slate-800 uppercase text-xs font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">Collected By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading && filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Loading collection logs...</td>
                </tr>
              ) : filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No collection records found.</td>
                </tr>
              ) : (
                currentItems.map((record) => (
                  <tr key={record._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">
                        {new Date(record.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(record.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{record.customer?.name || "Unknown"}</div>
                      <div className="text-xs text-slate-400">📞 {record.customer?.phone || "No Phone"}</div>
                      <div className="text-xs text-slate-500">{record.customer?.email}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-black text-teal-400 text-lg">
                        ₹{record.amount.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                        <span className="text-xs">👤</span>
                        <span className="font-bold text-xs">{record.admin?.name || "Unknown Admin"}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && filteredAndSorted.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
          <div className="text-sm text-slate-400">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSorted.length)} of {filteredAndSorted.length} records
          </div>
          <div className="flex gap-2 items-center">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors font-medium"
            >
              Prev
            </button>
            <span className="px-4 py-2 text-sm text-slate-300 font-medium">Page {currentPage} of {totalPages}</span>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

