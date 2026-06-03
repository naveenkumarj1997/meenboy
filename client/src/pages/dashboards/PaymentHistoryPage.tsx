import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getMyPayments } from "../../lib/api";
import DashboardShell from "./DashboardShell";

const PaymentHistoryPage = () => {
  const { token, user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [pendingBreakdown, setPendingBreakdown] = useState<any[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"transactions" | "orders">("orders");

  // Search, sort, pagination (for both)
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      const data = await getMyPayments(token!);
      setPayments(data.payments || []);

      if ((user as any)?.pendingBalance > 0) {
        const breakdownRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/me/pending-breakdown`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (breakdownRes.ok) {
          const breakdownData = await breakdownRes.json();
          setPendingBreakdown(breakdownData.breakdown || []);
        }
      }

      const statusesRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/me/order-payment-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (statusesRes.ok) {
        const statusesData = await statusesRes.json();
        setOrderStatuses(statusesData.orderStatuses || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch payments");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchPayments();
  }, [token]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "authorized": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
      case "captured": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
      case "failed": return "text-red-400 bg-red-400/10 border-red-400/20";
      case "refunded": return "text-purple-400 bg-purple-400/10 border-purple-400/20";
      default: return "text-white/70 bg-white/5 border-white/10";
    }
  };

  const formatMethod = (provider: string) => {
    if (provider === "cash_on_delivery") return "Cash on Delivery";
    if (provider === "admin_collection") return "Admin Collected (Pending Dues)";
    if (provider === "upi") return "UPI";
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  };

const CUSTOMER_NAV_LINKS = [
  { label: "Orders", href: "/dashboard" },
  { label: "Payments", href: "/dashboard/payments" },
  { label: "Delivery Status", href: "/dashboard/deliveries" }
];

  const sourceData = activeTab === "transactions" ? payments : orderStatuses;

  const filteredAndSorted = [...sourceData]
    .filter((item: any) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      
      if (activeTab === "transactions") {
        return (
          item._id.toLowerCase().includes(q) ||
          item.status.toLowerCase().includes(q) ||
          formatMethod(item.provider).toLowerCase().includes(q) ||
          new Date(item.createdAt).toLocaleDateString().includes(q)
        );
      } else {
        return (
          item.orderId.toLowerCase().includes(q) ||
          item.status.toLowerCase().includes(q) ||
          item.date.toLowerCase().includes(q)
        );
      }
    })
    .sort((a: any, b: any) => {
      if (sortBy === "date") {
        const dateA = activeTab === "transactions" ? new Date(a.createdAt).getTime() : new Date(a.date).getTime();
        const dateB = activeTab === "transactions" ? new Date(b.createdAt).getTime() : new Date(b.date).getTime();
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      } else if (sortBy === "amount") {
        const amtA = activeTab === "transactions" ? a.amount : a.total;
        const amtB = activeTab === "transactions" ? b.amount : b.total;
        return sortOrder === "desc" ? (amtB || 0) - (amtA || 0) : (amtA || 0) - (amtB || 0);
      } else {
        return sortOrder === "desc"
          ? b.status.localeCompare(a.status)
          : a.status.localeCompare(b.status);
      }
    });

  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage) || 1;
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, sortOrder, activeTab]);

  const paginatedData = filteredAndSorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (isLoading) {
    return (
      <DashboardShell title="Payment History" description={`Manage payments for ${user?.name}`} navLinks={CUSTOMER_NAV_LINKS}>
        <div className="flex justify-center items-center h-64">
          <div className="w-10 h-10 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Payment History" description={`View your transaction history, ${user?.name}`} navLinks={CUSTOMER_NAV_LINKS}>

      {(user as any)?.pendingBalance > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 mb-8 shadow-[0_0_20px_rgba(244,63,94,0.1)]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-rose-400 flex items-center gap-2">
                ⚠️ Pending Payment Due
              </h3>
              <p className="text-rose-400/80 text-sm mt-1 max-w-md">
                You have an outstanding balance from previous "Pay Later" or partial payment orders. Please settle this amount soon.
              </p>
            </div>
            <div className="mt-4 sm:mt-0 bg-slate-950 p-4 rounded-xl border border-rose-500/20 text-center sm:text-right shrink-0">
              <div className="text-xs text-rose-400/60 uppercase tracking-widest font-bold mb-1">Total Pending</div>
              <div className="text-3xl font-black text-rose-500">₹{(user as any).pendingBalance.toFixed(2)}</div>
            </div>
          </div>
          
          {pendingBreakdown.length > 0 && (
            <div className="bg-slate-950 rounded-xl border border-rose-500/10 overflow-hidden">
              <div className="px-4 py-3 bg-rose-500/5 text-rose-400 text-xs font-bold uppercase tracking-wider border-b border-rose-500/10">
                Amount Due Breakdown
              </div>
              <div className="divide-y divide-rose-500/10">
                {pendingBreakdown.map((item, idx) => (
                  <div key={idx} className="px-4 py-3 flex justify-between items-center hover:bg-white/5 transition-colors">
                    <div className="text-slate-300 text-sm font-medium">
                      Order Date: <span className="text-white">{item.date}</span>
                    </div>
                    <div className="text-rose-400 font-bold">
                      ₹{item.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-8">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === "orders" 
              ? "bg-teal-500 text-white shadow-lg shadow-teal-500/20" 
              : "bg-slate-900 border border-white/10 text-white/50 hover:text-white/80 hover:bg-slate-800"
          }`}
        >
          Order Payments
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={`px-6 py-3 rounded-xl font-bold transition-all ${
            activeTab === "transactions" 
              ? "bg-teal-500 text-white shadow-lg shadow-teal-500/20" 
              : "bg-slate-900 border border-white/10 text-white/50 hover:text-white/80 hover:bg-slate-800"
          }`}
        >
          Transaction Logs
        </button>
      </div>

      {sourceData.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
          <div className="text-6xl mb-4 opacity-50">{activeTab === "transactions" ? "💳" : "🛒"}</div>
          <h3 className="text-xl font-bold text-white mb-2">No data yet</h3>
          <p className="text-white/50 mb-6">You haven't made any {activeTab === "transactions" ? "transactions" : "orders"} with us.</p>
          <Link
            to="/products"
            className="inline-flex bg-teal-500 hover:bg-teal-400 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-teal-500/20 transition-all"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-auto flex-1 max-w-sm">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/50">🔍</span>
              <input
                type="text"
                placeholder={activeTab === "transactions" ? "Search by Transaction ID, Method..." : "Search by Order ID, Date..."}
                className="w-full bg-cyan-950/30 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white outline-none focus:border-teal-500 transition-colors text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
              
              <div className="flex gap-2 w-full md:w-auto items-center">
                <span className="text-sm text-white/50 hidden md:inline-block">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="flex-1 md:w-auto bg-cyan-950/30 border border-white/10 text-white rounded-lg px-3 py-2.5 outline-none focus:border-teal-500 transition-colors text-sm"
                >
                  <option value="date">Date</option>
                  <option value="amount">Amount</option>
                  <option value="status">Status</option>
                </select>
                <button
                  onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
                  className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-3 py-2.5 transition-colors border border-white/10 text-sm"
                >
                  {sortOrder === "desc" ? "↓ Desc" : "↑ Asc"}
                </button>
              </div>
            </div>

          {paginatedData.length === 0 ? (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
              <div className="text-4xl mb-4 opacity-50">🔍</div>
              <h3 className="text-xl font-bold text-white mb-2">No matches found</h3>
              <p className="text-white/50">Try adjusting your search query or filters.</p>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                {activeTab === "transactions" ? (
                  <table className="w-full text-left text-sm text-white/70">
                    <thead className="bg-cyan-950/80 text-white uppercase font-bold text-xs">
                      <tr>
                        <th className="px-6 py-4">Transaction ID</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Method</th>
                        <th className="px-6 py-4">Order Total</th>
                        <th className="px-6 py-4">Amount Paid</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {paginatedData.map((payment) => (
                        <tr key={payment._id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-mono text-white">
                            {payment._id.slice(-8).toUpperCase()}
                            <div className="text-[10px] text-white/40 mt-1">Order: {payment.order?._id?.slice(-8).toUpperCase() || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 font-medium text-white">
                            {formatMethod(payment.provider)}
                          </td>
                          <td className="px-6 py-4 font-bold text-white/80">
                            {payment.provider === "admin_collection" ? (
                              <span className="text-white/30 italic">N/A (Pending Due Settlement)</span>
                            ) : (
                              payment.order?.total ? `₹${payment.order.total.toFixed(2)}` : '-'
                            )}
                          </td>
                          <td className="px-6 py-4 font-bold text-teal-400">
                            ₹{payment.amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${getStatusColor(payment.status)}`}>
                              {payment.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left text-sm text-white/70">
                    <thead className="bg-cyan-950/80 text-white uppercase font-bold text-xs">
                      <tr>
                        <th className="px-6 py-4">Order ID</th>
                        <th className="px-6 py-4">Delivery Date</th>
                        <th className="px-6 py-4">Order Total</th>
                        <th className="px-6 py-4 text-teal-400/80">Amount Paid</th>
                        <th className="px-6 py-4 text-rose-400/80">Amount Due</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {paginatedData.map((order) => (
                        <tr key={order.orderId} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-mono text-white">
                            {order.orderId.slice(-8).toUpperCase()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {order.date}
                          </td>
                          <td className="px-6 py-4 font-bold text-white/80">
                            ₹{order.total.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 font-bold text-teal-400">
                            ₹{order.amountPaid.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 font-bold text-rose-400">
                            ₹{order.amountDue.toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${
                              order.status === "Paid" ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" :
                              order.status === "Partially Paid" ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" :
                              order.status === "Unpaid" ? "text-rose-400 bg-rose-400/10 border-rose-400/20" :
                              "text-blue-400 bg-blue-400/10 border-blue-400/20"
                            }`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-white/5 gap-4">
                  <div className="text-sm text-white/50">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSorted.length)} of {filteredAndSorted.length} {activeTab === "transactions" ? "payments" : "orders"}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-lg bg-white/10 text-white disabled:opacity-30 hover:bg-white/20 transition-colors font-medium text-sm"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-lg bg-white/10 text-white disabled:opacity-30 hover:bg-white/20 transition-colors font-medium text-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </DashboardShell>
  );
};

export default PaymentHistoryPage;
