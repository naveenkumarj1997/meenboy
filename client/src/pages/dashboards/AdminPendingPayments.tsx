import { useState, useEffect, Fragment } from "react";
import DashboardShell from "./DashboardShell";
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

export default function AdminPendingPayments() {
  const { token } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [collectAmount, setCollectAmount] = useState<number | "">("");

  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userBreakdowns, setUserBreakdowns] = useState<Record<string, any[]>>({});
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  // Search, Sort, Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "pendingBalance">("pendingBalance");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchPendingPayments();
  }, [token]);

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/pending-payments`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch pending payments");
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCollect = async () => {
    if (!selectedUser || !collectAmount || collectAmount <= 0) return;
    try {
      setError("");
      setSuccess("");
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/${selectedUser._id}/collect-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: Number(collectAmount) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to collect payment");
      
      setSuccess(`Successfully collected ₹${collectAmount} from ${selectedUser.name}`);
      // If the row is currently expanded, close the expanded view.
      if (expandedUserId === selectedUser._id) {
        setExpandedUserId(null);
      }
      
      const collectedUserId = selectedUser._id;
      
      setSelectedUser(null);
      setCollectAmount("");
      
      // Clear the stored breakdown for this user so it's fresh next time they click "View Breakdown"
      setUserBreakdowns(prev => {
        const newBreakdowns = { ...prev };
        delete newBreakdowns[collectedUserId];
        return newBreakdowns;
      });
      
      fetchPendingPayments();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleViewBreakdown = async (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }
    
    setExpandedUserId(userId);
    
    if (userBreakdowns[userId]) return; // Already fetched

    try {
      setBreakdownLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/${userId}/pending-breakdown`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setUserBreakdowns(prev => ({ ...prev, [userId]: data.breakdown || [] }));
      }
    } catch (err) {
      console.error("Failed to fetch breakdown", err);
    } finally {
      setBreakdownLoading(false);
    }
  };

  const filteredAndSorted = [...users]
    .filter(u => {
      if (!searchQuery) return true;
      return u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             (u.phone && u.phone.includes(searchQuery));
    })
    .sort((a, b) => {
      if (sortBy === "name") {
        return sortOrder === "desc" 
          ? b.name.localeCompare(a.name)
          : a.name.localeCompare(b.name);
      } else {
        return sortOrder === "desc"
          ? (b.pendingBalance || 0) - (a.pendingBalance || 0)
          : (a.pendingBalance || 0) - (b.pendingBalance || 0);
      }
    });

  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, sortOrder]);

  const paginatedData = filteredAndSorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <DashboardShell
      title="Pending Payments"
      description="Manage and collect partial or deferred payments from customers."
      navLinks={ADMIN_NAV_LINKS}
    >
      {error && <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">{error}</div>}
      {success && <div className="mb-6 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">{success}</div>}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        
        {/* Controls: Search & Sort */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">🔍</span>
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2 outline-none focus:border-teal-500 transition-colors"
            />
          </div>
          
          <div className="flex gap-2 items-center">
            <span className="text-sm text-slate-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:border-teal-500 transition-colors"
            >
              <option value="pendingBalance">Pending Balance</option>
              <option value="name">Customer Name</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
              className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg px-3 py-2 transition-colors border border-slate-700"
            >
              {sortOrder === "desc" ? "↓ Desc" : "↑ Asc"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No customers with pending payments.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-medium">
                <tr>
                  <th className="px-6 py-4">Customer Name</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Pending Balance</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {paginatedData.map((user) => (
                  <Fragment key={user._id}>
                  <tr key={user._id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{user.name}</td>
                    <td className="px-6 py-4">{user.phone || "-"}</td>
                    <td className="px-6 py-4">{user.email}</td>
                    <td className="px-6 py-4 text-rose-400 font-bold">₹{user.pendingBalance?.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewBreakdown(user._id)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded transition-colors text-xs border border-slate-700"
                      >
                        {expandedUserId === user._id ? "Hide Breakdown" : "View Breakdown"}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setCollectAmount(user.pendingBalance);
                        }}
                        className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-lg transition-colors text-xs shadow-lg shadow-teal-500/20"
                      >
                        Collect Payment
                      </button>
                    </td>
                  </tr>
                  
                  {expandedUserId === user._id && (
                    <tr key={`${user._id}-breakdown`} className="bg-slate-900/50 border-b border-slate-800/50">
                      <td colSpan={5} className="px-6 py-4">
                        <div className="bg-slate-950 rounded-xl border border-rose-500/10 overflow-hidden max-w-2xl mx-auto">
                          <div className="px-4 py-2 bg-rose-500/5 text-rose-400 text-xs font-bold uppercase tracking-wider border-b border-rose-500/10">
                            Amount Due Breakdown for {user.name}
                          </div>
                          
                          {breakdownLoading && !userBreakdowns[user._id] ? (
                            <div className="px-4 py-4 text-center text-slate-500 text-sm">Loading breakdown...</div>
                          ) : (
                            <div className="divide-y divide-rose-500/10">
                              {userBreakdowns[user._id]?.length > 0 ? (
                                userBreakdowns[user._id].map((item: any, idx: number) => (
                                  <div key={idx} className="px-4 py-3 flex justify-between items-center hover:bg-white/5 transition-colors">
                                    <div className="text-slate-300 text-sm font-medium">
                                      Order Date: <span className="text-white">{item.date}</span>
                                    </div>
                                    <div className="text-rose-400 font-bold">
                                      ₹{item.amount.toFixed(2)}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="px-4 py-4 text-center text-slate-500 text-sm">No specific date breakdown found (all payments might be manual overrides).</div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

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

      {/* Collection Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Collect Payment</h3>
            <p className="text-slate-400 text-sm mb-6">
              Customer: <span className="text-white font-medium">{selectedUser.name}</span><br />
              Total Pending: <span className="text-rose-400 font-bold">₹{selectedUser.pendingBalance?.toFixed(2)}</span>
            </p>
            
            <div className="mb-6">
              <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">Amount Collected (₹)</label>
              <input 
                type="number" 
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-teal-500"
                value={collectAmount}
                onChange={(e) => setCollectAmount(Number(e.target.value))}
                max={selectedUser.pendingBalance}
              />
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setSelectedUser(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCollect}
                disabled={!collectAmount || collectAmount <= 0}
                className="flex-1 bg-teal-500 hover:bg-teal-400 text-white py-3 rounded-lg font-bold transition-colors disabled:opacity-50"
              >
                Confirm Collection
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

