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
  { label: "Invoices", href: "/dashboard/admin/invoices" },
  { label: "Order Management", href: "/dashboard/admin/deliveries" },
  { label: "Today Delivery Status", href: "/dashboard/admin/today-delivery-status" },
  { label: "Partner Report", href: "/dashboard/admin/partner-report" },
  { label: "Overall Reports", href: "/dashboard/admin/overall-reports" },
  { label: "Pending Payments", href: "/dashboard/admin/pending-payments" },
  { label: "Collected Payments", href: "/dashboard/admin/collected-payments" },
  { label: "Delivery Amount Collection", href: "/dashboard/admin/delivery-amount-collection" },
  { label: "Purchases", href: "/dashboard/admin/purchases" },
  { label: "Settlements", href: "/dashboard/admin/settlements" },
  { label: "Partner Salary", href: "/dashboard/admin/partner-salary" },
  { label: "Admin Earnings", href: "/dashboard/admin/earnings" },
  { label: "Users", href: "/dashboard/admin/users" },
  { label: "Money Management", href: "/dashboard/admin/money-management" },
  { label: "Manual Ledger", href: "/dashboard/admin/finance" },
  { label: "Availability", href: "/dashboard/admin/availability" },
  { label: "Walk-in", href: "/dashboard/admin/walk-in" },
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
  const [collecting, setCollecting] = useState(false);

  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userBreakdowns, setUserBreakdowns] = useState<Record<string, any>>({});
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
    if (!selectedUser || collecting) return;
    const amount = Number(collectAmount);
    const pending = Number(selectedUser.pendingBalance) || 0;

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid amount to collect");
      return;
    }
    if (amount > pending + 0.001) {
      setError(`Cannot collect ₹${amount.toFixed(2)}. Pending is only ₹${pending.toFixed(2)}`);
      return;
    }

    try {
      setCollecting(true);
      setError("");
      setSuccess("");
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/${selectedUser._id}/collect-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: Math.round(amount * 100) / 100 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to collect payment");

      const remaining = Number(data.remainingPending ?? data.user?.pendingBalance ?? 0);
      setSuccess(
        remaining > 0
          ? `Collected ₹${amount.toFixed(2)} from ${selectedUser.name}. Remaining pending: ₹${remaining.toFixed(2)}`
          : `Collected ₹${amount.toFixed(2)} from ${selectedUser.name}. Pending cleared.`
      );

      if (expandedUserId === selectedUser._id) {
        setExpandedUserId(null);
      }

      const collectedUserId = selectedUser._id;

      setSelectedUser(null);
      setCollectAmount("");

      setUserBreakdowns(prev => {
        const newBreakdowns = { ...prev };
        delete newBreakdowns[collectedUserId];
        return newBreakdowns;
      });

      fetchPendingPayments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCollecting(false);
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
        setUserBreakdowns((prev) => ({
          ...prev,
          [userId]: {
            breakdown: data.breakdown || [],
            adminCollections: data.adminCollections || [],
            totalGeneratedDebt: data.totalGeneratedDebt || 0,
            totalAdminCollected: data.totalAdminCollected || 0,
            totalPending: data.totalPending || 0
          }
        }));
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

  const renderBreakdown = (user: any) => {
    const detail = userBreakdowns[user._id];
    const rows = detail?.breakdown || [];
    const collections = detail?.adminCollections || [];

    return (
      <div className="bg-slate-950 rounded-xl border border-rose-500/10 overflow-hidden w-full max-w-4xl mx-auto">
        <div className="px-3 sm:px-4 py-2 bg-rose-500/5 text-rose-400 text-xs font-bold uppercase tracking-wider border-b border-rose-500/10">
          Pending calculation for {user.name}
        </div>

        {breakdownLoading && !detail ? (
          <div className="px-4 py-4 text-center text-slate-500 text-sm">Loading breakdown...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2 px-3 sm:px-4 py-3 border-b border-slate-800">
              <div className="flex sm:flex-col items-center justify-between sm:justify-center sm:text-center gap-2 rounded-lg bg-slate-900/50 px-3 py-2 sm:bg-transparent sm:px-0 sm:py-0">
                <div className="text-[10px] uppercase text-slate-500">Unpaid at delivery</div>
                <div className="text-amber-300 font-bold text-sm sm:text-base">
                  ₹{Number(detail?.totalGeneratedDebt || 0).toFixed(2)}
                </div>
              </div>
              <div className="flex sm:flex-col items-center justify-between sm:justify-center sm:text-center gap-2 rounded-lg bg-slate-900/50 px-3 py-2 sm:bg-transparent sm:px-0 sm:py-0">
                <div className="text-[10px] uppercase text-slate-500">Admin collected later</div>
                <div className="text-teal-300 font-bold text-sm sm:text-base">
                  ₹{Number(detail?.totalAdminCollected || 0).toFixed(2)}
                </div>
              </div>
              <div className="flex sm:flex-col items-center justify-between sm:justify-center sm:text-center gap-2 rounded-lg bg-slate-900/50 px-3 py-2 sm:bg-transparent sm:px-0 sm:py-0">
                <div className="text-[10px] uppercase text-slate-500">Still pending</div>
                <div className="text-rose-400 font-bold text-sm sm:text-base">
                  ₹{Number(detail?.totalPending ?? user.pendingBalance ?? 0).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="divide-y divide-rose-500/10">
              {rows.length > 0 ? (
                <>
                  {/* Desktop header */}
                  <div className="hidden md:grid px-4 py-2 grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-slate-500 font-bold bg-slate-900/40">
                    <div className="col-span-2">Order ID</div>
                    <div className="col-span-2">Date</div>
                    <div className="col-span-2">At delivery</div>
                    <div className="col-span-2">Original due</div>
                    <div className="col-span-2">Admin collected</div>
                    <div className="col-span-2 text-right">Still pending</div>
                  </div>

                  {rows.map((item: any, idx: number) => {
                    const originalDue = Number(
                      item.originalDebt ??
                        Number(item.orderTotal || 0) - Number(item.collectedAtDelivery || 0)
                    );
                    return (
                      <div key={item.orderId || idx}>
                        {/* Mobile stacked card */}
                        <div className="md:hidden px-3 py-3 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-mono font-bold text-white text-sm">
                                #{String(item.orderId || "").slice(-8).toUpperCase()}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {item.date || "-"}
                                {item.paymentMethod
                                  ? ` · ${String(item.paymentMethod).replace(/_/g, " ")}`
                                  : ""}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-[10px] uppercase text-slate-500">Still pending</div>
                              <div className="text-rose-400 font-bold">
                                ₹{Number(item.amount || 0).toFixed(2)}
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-lg bg-slate-900/60 px-2 py-2">
                              <div className="text-[9px] uppercase text-slate-500 leading-tight">
                                At delivery
                              </div>
                              <div className="text-slate-300 text-xs font-semibold mt-1">
                                ₹{Number(item.collectedAtDelivery || 0).toFixed(0)}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                of ₹{Number(item.orderTotal || 0).toFixed(0)}
                              </div>
                            </div>
                            <div className="rounded-lg bg-slate-900/60 px-2 py-2">
                              <div className="text-[9px] uppercase text-slate-500 leading-tight">
                                Original due
                              </div>
                              <div className="text-amber-300 text-xs font-semibold mt-1">
                                ₹{originalDue.toFixed(0)}
                              </div>
                            </div>
                            <div className="rounded-lg bg-slate-900/60 px-2 py-2">
                              <div className="text-[9px] uppercase text-slate-500 leading-tight">
                                Admin collected
                              </div>
                              <div className="text-teal-300 text-xs font-semibold mt-1">
                                ₹{Number(item.adminCollected || 0).toFixed(0)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Desktop row */}
                        <div className="hidden md:grid px-4 py-3 grid-cols-12 gap-2 items-start hover:bg-white/5 transition-colors text-sm">
                          <div className="col-span-2 font-mono font-bold text-white">
                            #{String(item.orderId || "").slice(-8).toUpperCase()}
                            <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                              {item.paymentMethod
                                ? String(item.paymentMethod).replace(/_/g, " ")
                                : ""}
                            </div>
                          </div>
                          <div className="col-span-2 text-slate-300 text-xs">{item.date || "-"}</div>
                          <div className="col-span-2 text-slate-400 text-xs">
                            ₹{Number(item.collectedAtDelivery || 0).toFixed(2)}
                            <div className="text-[10px] text-slate-500">
                              of ₹{Number(item.orderTotal || 0).toFixed(2)}
                            </div>
                          </div>
                          <div className="col-span-2 text-amber-300 font-semibold">
                            ₹{originalDue.toFixed(2)}
                          </div>
                          <div className="col-span-2 text-teal-300 font-semibold">
                            ₹{Number(item.adminCollected || 0).toFixed(2)}
                          </div>
                          <div className="col-span-2 text-right text-rose-400 font-bold">
                            ₹{Number(item.amount || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="px-4 py-4 text-center text-slate-500 text-sm">
                  No order-level unpaid amount found.
                </div>
              )}
            </div>

            {collections.length > 0 && (
              <div className="border-t border-slate-800">
                <div className="px-3 sm:px-4 py-2 bg-teal-500/5 text-teal-300 text-xs font-bold uppercase tracking-wider">
                  Admin collection history
                </div>
                <div className="divide-y divide-slate-800/80">
                  {collections.map((c: any, idx: number) => (
                    <div
                      key={idx}
                      className="px-3 sm:px-4 py-2.5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-sm"
                    >
                      <div className="text-slate-400 min-w-0">
                        <span className="break-words">
                          {c.collectedAt ? new Date(c.collectedAt).toLocaleString() : "-"}
                        </span>
                        <span className="text-slate-500"> · by {c.adminName || "Admin"}</span>
                      </div>
                      <div className="text-teal-300 font-bold shrink-0">
                        ₹{Number(c.amount || 0).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

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
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row justify-between gap-3 sm:gap-4">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">🔍</span>
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg pl-10 pr-4 py-2.5 text-sm outline-none focus:border-teal-500 transition-colors"
            />
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-slate-400 shrink-0">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="flex-1 min-w-[140px] sm:flex-none bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-500 transition-colors"
            >
              <option value="pendingBalance">Pending Balance</option>
              <option value="name">Customer Name</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
              className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg px-3 py-2 text-sm transition-colors border border-slate-700"
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
          <>
            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-slate-800">
              {paginatedData.map((user) => (
                <div key={user._id} className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-white truncate">{user.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5 break-all">{user.phone || "-"}</div>
                      {user.email && (
                        <div className="text-xs text-slate-500 mt-0.5 truncate">{user.email}</div>
                      )}
                    </div>
                    <div className="text-rose-400 font-bold text-base shrink-0">
                      ₹{user.pendingBalance?.toFixed(2)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleViewBreakdown(user._id)}
                      className="w-full px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors text-sm border border-slate-700"
                    >
                      {expandedUserId === user._id ? "Hide Breakdown" : "View Breakdown"}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setCollectAmount(user.pendingBalance);
                      }}
                      className="w-full px-3 py-2.5 bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-lg transition-colors text-sm shadow-lg shadow-teal-500/20"
                    >
                      Collect Payment
                    </button>
                  </div>
                  {expandedUserId === user._id && (
                    <div className="mt-3">
                      {renderBreakdown(user)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
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
                      <tr className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-white">{user.name}</td>
                        <td className="px-6 py-4">{user.phone || "-"}</td>
                        <td className="px-6 py-4">{user.email}</td>
                        <td className="px-6 py-4 text-rose-400 font-bold">₹{user.pendingBalance?.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-2">
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
                          </div>
                        </td>
                      </tr>

                      {expandedUserId === user._id && (
                        <tr className="bg-slate-900/50 border-b border-slate-800/50">
                          <td colSpan={5} className="px-4 lg:px-6 py-4">
                            {renderBreakdown(user)}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 sm:p-4 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/50">
            <span className="text-sm text-slate-400 text-center sm:text-left">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex-1 sm:flex-none px-3 py-2 rounded-lg bg-slate-800 text-white disabled:opacity-50 hover:bg-slate-700 transition-colors text-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex-1 sm:flex-none px-3 py-2 rounded-lg bg-slate-800 text-white disabled:opacity-50 hover:bg-slate-700 transition-colors text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Collection Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Collect Payment</h3>
            <p className="text-slate-400 text-sm mb-6">
              Customer: <span className="text-white font-medium">{selectedUser.name}</span><br />
              Total Pending: <span className="text-rose-400 font-bold">₹{selectedUser.pendingBalance?.toFixed(2)}</span>
            </p>
            
            <div className="mb-6">
              <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">Amount Collected (₹)</label>
              <input 
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                max={selectedUser.pendingBalance}
                disabled={collecting}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-base outline-none focus:border-teal-500 disabled:opacity-60"
                value={collectAmount}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    setCollectAmount("");
                    return;
                  }
                  setCollectAmount(Number(v));
                }}
              />
              <p className="text-[11px] text-slate-500 mt-2">
                Enter partial or full amount. Remaining pending stays on the list (e.g. 550 − 300 = 250).
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
              <button 
                type="button"
                onClick={() => {
                  if (collecting) return;
                  setSelectedUser(null);
                }}
                disabled={collecting}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleCollect}
                disabled={collecting || !collectAmount || Number(collectAmount) <= 0}
                className="flex-1 bg-teal-500 hover:bg-teal-400 text-white py-3 rounded-lg font-bold transition-colors disabled:opacity-50"
              >
                {collecting ? "Saving..." : "Confirm Collection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

