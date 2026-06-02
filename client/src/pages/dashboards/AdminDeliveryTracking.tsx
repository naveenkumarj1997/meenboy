import { useState, useEffect } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import {
  getAdminOrders,
  getDeliveryPartners,
  getAllAssignments,
  getDeliveryStats,
  assignDeliveryPartner,
  getCatalog
} from "../../lib/api";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from "recharts";

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

const COLORS = ["#14b8a6", "#f59e0b", "#f43f5e", "#6366f1", "#8b5cf6"];

const getCategoryColor = (category: string) => {
  switch (category) {
    case "Chicken": return "text-rose-400 bg-rose-400/10 border-rose-400/20";
    case "Country Chicken": return "text-orange-400 bg-orange-400/10 border-orange-400/20";
    case "Mutton": return "text-purple-400 bg-purple-400/10 border-purple-400/20";
    case "Seafood": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    case "Fish": return "text-teal-400 bg-teal-400/10 border-teal-400/20";
    default: return "text-slate-400 bg-slate-400/10 border-slate-400/20";
  }
};

export default function AdminDeliveryTracking() {
  const { token } = useAuth();
  
  const [orders, setOrders] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedPartner, setSelectedPartner] = useState<Record<string, string>>({});

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "updatedAt", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [productCategoryMap, setProductCategoryMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) return;
    
    // Initial fetch
    fetchAllData();

    // Auto-refresh every 15 seconds
    const interval = setInterval(() => {
      fetchAllData(true);
    }, 15000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortConfig, selectedDate]);

  const fetchAllData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError("");
      
      const [ordRes, partRes, assignRes, statRes, catRes] = await Promise.all([
        getAdminOrders(token!),
        getDeliveryPartners(token!),
        getAllAssignments(token!),
        getDeliveryStats(token!),
        getCatalog()
      ]);
      
      setOrders(ordRes.orders);
      setPartners(partRes.deliveryPartners);
      setAssignments(assignRes.assignments);
      setStats(statRes.stats);
      
      const catMap: Record<string, string> = {};
      catRes.data.products.forEach((p: any) => {
        catMap[p._id] = p.category;
      });
      setProductCategoryMap(catMap);
      
    } catch (err: any) {
      if (!silent) setError(err.message || "Failed to load dashboard data");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleAssign = async (orderId: string) => {
    const partnerId = selectedPartner[orderId];
    if (!partnerId) {
      setError("Please select a delivery partner first.");
      return;
    }
    
    try {
      setError("");
      setSuccess("");
      await assignDeliveryPartner(token!, orderId, { deliveryPartnerId: partnerId });
      setSuccess("Delivery partner assigned successfully!");
      fetchAllData(); // Refresh to update lists and stats
    } catch (err: any) {
      setError(err.message || "Failed to assign partner");
    }
  };

  if (loading) {
    return (
      <DashboardShell title="Order Management" description="Loading tracking and analytics..." navLinks={ADMIN_NAV_LINKS}>
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  // Derive unassigned orders
  const assignedOrderIds = new Set(assignments.map(a => String(a.order._id || a.order)));
  const unassignedOrders = orders.filter(o => 
    ["pending", "confirmed", "preparing"].includes(o.status) && !assignedOrderIds.has(String(o._id))
  );

  // Chart data formatting
  const pieData = stats ? [
    { name: "Completed", value: stats.completed },
    { name: "In Progress", value: stats.inProgress },
    { name: "Failed", value: stats.failed }
  ].filter(d => d.value > 0) : [];

  const barData = stats ? [
    { name: "Completed", count: stats.completed, fill: "#14b8a6" },
    { name: "In Progress", count: stats.inProgress, fill: "#f59e0b" },
    { name: "Failed", count: stats.failed, fill: "#f43f5e" },
  ] : [];

  return (
    <DashboardShell
      title="Order Management"
      description="Track deliveries, assign partners, and view analytics."
      navLinks={ADMIN_NAV_LINKS}
    >
      {error && <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">{error}</div>}
      {success && <div className="mb-6 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">{success}</div>}

      {/* Analytics Section */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="col-span-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center items-center">
            <h3 className="text-slate-400 text-sm font-medium mb-2">Overall Completion</h3>
            <div className="text-5xl font-black text-teal-400 mb-2">{stats.completionPercentage}%</div>
            <p className="text-slate-500 text-xs">Total Assignments: {stats.total}</p>
          </div>
          
          <div className="col-span-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 h-64">
            <h3 className="text-slate-400 text-sm font-medium mb-4 text-center">Status Distribution</h3>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                  {pieData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="col-span-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 h-64">
             <h3 className="text-slate-400 text-sm font-medium mb-4 text-center">Volume</h3>
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={barData}>
                 <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                 <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }} cursor={{fill: '#1e293b'}} />
                 <Bar dataKey="count" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Assignment Section */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Assign Delivery Partners</h2>
        {unassignedOrders.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
            No pending orders require assignment right now.
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-4 font-medium">Order ID</th>
                  <th className="px-4 py-4 font-medium">Customer Details</th>
                  <th className="px-4 py-4 font-medium">Items</th>
                  <th className="px-4 py-4 font-medium">Delivery Slot</th>
                  <th className="px-4 py-4 font-medium min-w-[150px]">Assign Partner</th>
                  <th className="px-4 py-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {unassignedOrders.map(order => (
                  <tr key={order._id} className="hover:bg-slate-800/20">
                    <td className="px-4 py-4 font-mono text-white">#{order._id.slice(-6).toUpperCase()}</td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-white">{order.customer?.name || "Guest"}</div>
                      <div className="text-xs text-slate-400">{order.address?.city}, {order.address?.postalCode}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {order.items.map((item: any, idx: number) => (
                          <span 
                            key={idx} 
                            className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded border ${getCategoryColor(productCategoryMap[item.product] || "")}`}
                          >
                            {item.quantity}x {item.productName}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <div>{order.deliveryDate}</div>
                      <div className="text-slate-400">{order.deliveryTime}</div>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-teal-500 w-full"
                        value={selectedPartner[order._id] || ""}
                        onChange={(e) => setSelectedPartner(prev => ({ ...prev, [order._id]: e.target.value }))}
                      >
                        <option value="" disabled>Select Partner</option>
                        {partners.map(p => (
                          <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleAssign(order._id)}
                        className="bg-indigo-500 hover:bg-indigo-400 text-white font-medium py-1.5 px-4 rounded-lg transition-colors text-xs"
                      >
                        Assign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tracking Section */}
      <div>
        {(() => {
          const filteredAssignments = assignments.filter(a => {
            if (selectedDate && a.order?.deliveryDate !== selectedDate) return false;
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            const orderIdStr = String(a.order?._id || a.order).slice(-6).toLowerCase();
            const partnerName = (a.deliveryPartner?.name || 'Unknown').toLowerCase();
            const statusStr = a.status.toLowerCase();
            return orderIdStr.includes(q) || partnerName.includes(q) || statusStr.includes(q);
          });

          filteredAssignments.sort((a, b) => {
            if (sortConfig.key === "order") {
              const orderA = String(a.order?._id || a.order);
              const orderB = String(b.order?._id || b.order);
              return sortConfig.direction === "asc" ? orderA.localeCompare(orderB) : orderB.localeCompare(orderA);
            } else if (sortConfig.key === "partner") {
              const partnerA = a.deliveryPartner?.name || 'Unknown';
              const partnerB = b.deliveryPartner?.name || 'Unknown';
              return sortConfig.direction === "asc" ? partnerA.localeCompare(partnerB) : partnerB.localeCompare(partnerA);
            } else {
              // updatedAt
              return sortConfig.direction === "asc"
                ? new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
                : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            }
          });

          const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage) || 1;
          const currentAssignments = filteredAssignments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

          return (
            <>
              <h2 className="text-xl font-bold text-white mb-4">Active Tracking</h2>
              
              <div className="flex flex-col md:flex-row gap-4 mb-4 items-start md:items-center justify-between">
                <div className="flex gap-2 w-full md:w-auto flex-col md:flex-row">
                  <input
                    type="date"
                    className="w-full md:w-auto bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-teal-500 text-sm [color-scheme:dark]"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                  />
                  <button 
                    onClick={() => setSelectedDate("")}
                    className="px-3 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700 transition-colors whitespace-nowrap"
                    title="Clear Date Filter"
                  >
                    Clear Date
                  </button>
                  <input
                    type="text"
                    placeholder="Search order ID, partner, status..."
                    className="w-full md:w-72 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-teal-500 text-sm"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-4 items-center">
                  <span className="text-slate-400 text-sm">Sort by:</span>
                  <select 
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-teal-500 text-sm"
                    value={`${sortConfig.key}-${sortConfig.direction}`}
                    onChange={(e) => {
                      const [key, direction] = e.target.value.split("-");
                      setSortConfig({ key, direction });
                    }}
                  >
                    <option value="updatedAt-desc">Recent Updates</option>
                    <option value="updatedAt-asc">Oldest Updates</option>
                    <option value="partner-asc">Partner (A-Z)</option>
                    <option value="order-asc">Order ID (A-Z)</option>
                  </select>
                </div>
              </div>

              {assignments.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
                  No delivery assignments exist.
                </div>
              ) : filteredAssignments.length === 0 ? (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
                  No assignments match your search.
                </div>
              ) : (
                <>
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Order ID</th>
                  <th className="px-6 py-4 font-medium">Customer Details</th>
                  <th className="px-6 py-4 font-medium">Items</th>
                  <th className="px-6 py-4 font-medium">Delivery Slot</th>
                  <th className="px-6 py-4 font-medium">Partner</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Updated At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {currentAssignments.map(a => (
                  <tr key={a._id} className="hover:bg-slate-800/20">
                    <td className="px-6 py-4 font-mono text-white">#{String(a.order?._id || a.order).slice(-6).toUpperCase()}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{a.order?.customer?.name || "Guest"}</div>
                      <div className="text-xs text-slate-400">{a.order?.address?.city}, {a.order?.address?.postalCode}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2 max-w-[200px]">
                        {a.order?.items?.map((item: any, idx: number) => (
                          <span 
                            key={idx} 
                            className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded border ${getCategoryColor(productCategoryMap[item.product] || "")}`}
                          >
                            {item.quantity}x {item.productName}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div>{a.order?.deliveryDate}</div>
                      <div className="text-slate-400">{a.order?.deliveryTime}</div>
                    </td>
                    <td className="px-6 py-4 font-medium">{a.deliveryPartner?.name || 'Unknown'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs uppercase tracking-wider font-bold ${
                        a.status === 'delivered' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' :
                        a.status === 'en_route' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        a.status === 'picked_up' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                        a.status === 'failed' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {a.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(a.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-slate-400">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAssignments.length)} of {filteredAssignments.length} tracking records
            </div>
            <div className="flex gap-2 items-center">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="px-3 py-1.5 bg-slate-800 text-white rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
              >
                Prev
              </button>
              <span className="px-3 py-1 text-sm text-slate-300">Page {currentPage} of {totalPages}</span>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-3 py-1.5 bg-slate-800 text-white rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
      </>
        );
      })()}
      </div>
    </DashboardShell>
  );
}
