import { useState, useEffect } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import {
  getAdminOrders,
  getDeliveryPartners,
  getAllAssignments,
  getDeliveryStats,
  assignDeliveryPartner,
  getCatalog,
  updateOrderStatus,
  updateAdminOrder,
  getCategoryOrdersReport,
  downloadCategoryOrdersReport,
  CATEGORY_ORDER_GROUPS
} from "../../lib/api";
import { triggerPdfDownload } from "../../lib/downloadPdf";
import { WEIGHT_OPTIONS, DEFAULT_WEIGHT_KG, snapToWeightOption, formatQuantityLabel } from "../../lib/weightOptions";
import { BookingSourceBadge } from "../../components/SourceBadges";
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
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";

/** Items + cutting/cleaning notes for admin / partner prep */
function OrderItemsAndNotes({
  items,
  customerNotes,
  categoryMap,
  getCategoryColor,
  compact = false
}: {
  items?: any[];
  customerNotes?: string;
  categoryMap?: Record<string, string>;
  getCategoryColor?: (cat: string) => string;
  compact?: boolean;
}) {
  const notes = String(customerNotes || "").trim();
  const itemNotes = (items || [])
    .map((i) => String(i.notes || "").trim())
    .filter(Boolean);
  // Prefer order-level notes; fall back to unique item notes
  const prepNotes =
    notes ||
    [...new Set(itemNotes)].join(" · ");

  return (
    <div className={`space-y-1.5 ${compact ? "max-w-[260px]" : ""}`}>
      {(items || []).map((item: any, idx: number) => (
        <div key={idx} className="leading-snug">
          <span
            className={
              getCategoryColor
                ? `inline-block px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded border ${getCategoryColor(
                    categoryMap?.[item.product] || ""
                  )}`
                : "text-xs text-slate-200"
            }
          >
            {formatQuantityLabel(item.quantity, item.unit)} · {item.productName}
            {item.cutName ? ` (${item.cutName})` : ""}
          </span>
          {item.notes?.trim() && item.notes.trim() !== notes && (
            <div className="text-[10px] text-amber-300/90 mt-0.5 pl-0.5">Note: {item.notes}</div>
          )}
        </div>
      ))}
      {prepNotes && (
        <div className="text-[10px] sm:text-[11px] text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg px-2 py-1.5 mt-1">
          <span className="font-bold uppercase tracking-wider text-amber-300/90">Cutting / cleaning: </span>
          {prepNotes}
        </div>
      )}
    </div>
  );
}

const COLORS = ["#14b8a6", "#f59e0b", "#f43f5e", "#6366f1", "#8b5cf6"];

const DELIVERY_TIMES = [
  "06:00 AM - 07:00 AM",
  "07:00 AM - 08:00 AM",
  "08:00 AM - 09:00 AM",
  "09:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM"
];

const isKgUnit = (unit?: string) => !unit || unit.toLowerCase() === "kg";

const todayLocal = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const partnerIdFromAssignment = (assignments: any[], orderId: string) => {
  const assignment = assignments.find((a) => String(a.order?._id || a.order) === String(orderId));
  return String(assignment?.deliveryPartner?._id || assignment?.deliveryPartner || "");
};

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

  const [assignSearch, setAssignSearch] = useState("");
  const [assignSortConfig, setAssignSortConfig] = useState({ key: "deliveryDate", direction: "asc" });
  const [assignPage, setAssignPage] = useState(1);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "updatedAt", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [productCategoryMap, setProductCategoryMap] = useState<Record<string, string>>({});
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [ordersSearch, setOrdersSearch] = useState("");
  const [ordersPage, setOrdersPage] = useState(1);
  const [addProductId, setAddProductId] = useState("");

  const [categoryListDate, setCategoryListDate] = useState(todayLocal());
  const [categoryListGroup, setCategoryListGroup] = useState<string>("fish_seafood");
  const [categoryListData, setCategoryListData] = useState<any | null>(null);
  const [categoryListLoading, setCategoryListLoading] = useState(false);
  const [categoryPdfGenerating, setCategoryPdfGenerating] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [categorySortConfig, setCategorySortConfig] = useState({ key: "deliveryTime", direction: "asc" });
  const [categoryPage, setCategoryPage] = useState(1);

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

  useEffect(() => {
    setAssignPage(1);
  }, [assignSearch, assignSortConfig]);

  useEffect(() => {
    setCategoryPage(1);
  }, [categorySearch, categorySortConfig, categoryListDate, categoryListGroup]);

  useEffect(() => {
    if (!token || !categoryListDate || !categoryListGroup) {
      setCategoryListData(null);
      return;
    }

    let cancelled = false;

    const loadCategoryOrders = async () => {
      try {
        setCategoryListLoading(true);
        const data = await getCategoryOrdersReport(token, {
          date: categoryListDate,
          group: categoryListGroup
        });
        if (!cancelled) setCategoryListData(data);
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to load category orders");
          setCategoryListData(null);
        }
      } finally {
        if (!cancelled) setCategoryListLoading(false);
      }
    };

    loadCategoryOrders();
    return () => {
      cancelled = true;
    };
  }, [token, categoryListDate, categoryListGroup]);

  const handleDownloadCategoryPdf = async () => {
    if (!token || !categoryListDate || !categoryListGroup) return;
    try {
      setCategoryPdfGenerating(true);
      setError("");
      const blob = await downloadCategoryOrdersReport(token, {
        date: categoryListDate,
        group: categoryListGroup
      });
      const label =
        CATEGORY_ORDER_GROUPS.find((g) => g.id === categoryListGroup)?.label || categoryListGroup;
      const slug = label.replace(/[^a-zA-Z0-9]+/g, "_");
      triggerPdfDownload(blob, `CategoryOrders-${categoryListDate}-${slug}.pdf`);
      setSuccess(`PDF downloaded for ${label} on ${categoryListDate}.`);
    } catch (err: any) {
      setError(err.message || "Failed to download category orders PDF");
    } finally {
      setCategoryPdfGenerating(false);
    }
  };

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
      setCatalogProducts(catRes.data.products.filter((p: any) => p.isActive !== false));
      
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

  const openEdit = (order: any) => {
    if (!order || order.status === "cancelled") return;
    const assignedPartnerId = String(
      order.deliveryPartner?._id || order.deliveryPartner || partnerIdFromAssignment(assignments, order._id) || ""
    );
    setEditingOrder({
      _id: order._id,
      status: order.status,
      deliveryDate: order.deliveryDate || "",
      deliveryTime: order.deliveryTime || DELIVERY_TIMES[0],
      mapUrl: order.mapUrl || "",
      deliveryFee: order.deliveryFee || 0,
      deliveryPartnerId: assignedPartnerId,
      address: {
        line1: order.address?.line1 || "",
        line2: order.address?.line2 || "",
        city: order.address?.city || "Madurai",
        state: order.address?.state || "Tamil Nadu",
        postalCode: order.address?.postalCode || "",
        phone: order.address?.phone || ""
      },
      items: (order.items || []).map((item: any) => {
        const catalog = catalogProducts.find((p) => String(p._id) === String(item.product));
        const unit = item.unit || catalog?.unit || "kg";
        const unitPrice = Number(item.unitPrice ?? item.unitPrice ?? 0);
        const quantity = isKgUnit(unit) ? snapToWeightOption(Number(item.quantity)) : Number(item.quantity);
        return {
          product: item.product,
          productName: item.productName,
          productImage: item.productImage,
          quantity,
          unit,
          cutName: item.cutName || "",
          notes: item.notes || "",
          unitPrice,
          totalPrice: quantity * unitPrice
        };
      })
    });
    setAddProductId("");
  };

  const handleCancelOrder = async (order: any) => {
    if (!order || order.status === "cancelled" || order.status === "delivered") return;
    const ok = window.confirm(
      `Cancel order #${String(order._id).slice(-6).toUpperCase()}? The order will stay in records and will not be deleted.`
    );
    if (!ok) return;
    try {
      setError("");
      setSuccess("");
      await updateOrderStatus(token!, order._id, "cancelled");
      setSuccess("Order cancelled. Data is kept for records.");
      setEditingOrder(null);
      fetchAllData();
    } catch (err: any) {
      setError(err.message || "Failed to cancel order");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    if (!editingOrder.items?.length) {
      setError("Order must have at least one item.");
      return;
    }
    try {
      setEditSaving(true);
      setError("");
      setSuccess("");
      await updateAdminOrder(token!, editingOrder._id, {
        items: editingOrder.items,
        address: editingOrder.address,
        deliveryDate: editingOrder.deliveryDate,
        deliveryTime: editingOrder.deliveryTime,
        mapUrl: editingOrder.mapUrl,
        deliveryFee: editingOrder.deliveryFee
      });
      const currentPartnerId = partnerIdFromAssignment(assignments, editingOrder._id);
      if (editingOrder.deliveryPartnerId && editingOrder.deliveryPartnerId !== currentPartnerId) {
        await assignDeliveryPartner(token!, editingOrder._id, {
          deliveryPartnerId: editingOrder.deliveryPartnerId
        });
      }
      setSuccess("Order updated successfully.");
      setEditingOrder(null);
      fetchAllData();
    } catch (err: any) {
      setError(err.message || "Failed to update order");
    } finally {
      setEditSaving(false);
    }
  };

  const updateEditItem = (idx: number, patch: Record<string, any>) => {
    setEditingOrder((prev: any) => {
      if (!prev) return prev;
      const items = prev.items.map((item: any, i: number) => {
        if (i !== idx) return item;
        const next = { ...item, ...patch };
        next.totalPrice = Number(next.quantity) * Number(next.unitPrice ?? next.unitPrice);
        return next;
      });
      return { ...prev, items };
    });
  };

  const removeEditItem = (idx: number) => {
    setEditingOrder((prev: any) => prev ? { ...prev, items: prev.items.filter((_: any, i: number) => i !== idx) } : prev);
  };

  const addCatalogProduct = () => {
    const product = catalogProducts.find((p) => p._id === addProductId);
    if (!product || !editingOrder) return;
    const unit = product.unit || "kg";
    const quantity = isKgUnit(unit) ? DEFAULT_WEIGHT_KG : 1;
    const unitPrice = Number(product.minPrice || product.price || 0);
    setEditingOrder({
      ...editingOrder,
      items: [
        ...editingOrder.items,
        {
          product: product._id,
          productName: product.name,
          productImage: product.image,
          quantity,
          unit,
          cutName: "",
          notes: "",
          unitPrice,
          totalPrice: quantity * unitPrice
        }
      ]
    });
    setAddProductId("");
  };

  const ActionButtons = ({ order }: { order: any }) => {
    if (!order) return null;
    const cancelled = order.status === "cancelled";
    const delivered = order.status === "delivered";
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={cancelled}
          onClick={() => openEdit(order)}
          className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/30 font-medium py-1.5 px-3 rounded-lg text-xs disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Edit
        </button>
        <button
          type="button"
          disabled={cancelled || delivered}
          onClick={() => handleCancelOrder(order)}
          className="bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-medium py-1.5 px-3 rounded-lg text-xs disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    );
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

  const filteredUnassignedOrders = unassignedOrders.filter((order) => {
    if (!assignSearch) return true;
    const q = assignSearch.toLowerCase();
    const orderId = String(order._id).slice(-6).toLowerCase();
    const name = (order.customer?.name || "").toLowerCase();
    const city = (order.address?.city || "").toLowerCase();
    const pin = (order.address?.postalCode || "").toLowerCase();
    const date = (order.deliveryDate || "").toLowerCase();
    const phone = (order.address?.phone || order.customer?.phone || "").toLowerCase();
    return (
      orderId.includes(q) ||
      name.includes(q) ||
      city.includes(q) ||
      pin.includes(q) ||
      date.includes(q) ||
      phone.includes(q)
    );
  });

  filteredUnassignedOrders.sort((a, b) => {
    const dir = assignSortConfig.direction === "asc" ? 1 : -1;
    if (assignSortConfig.key === "customer") {
      const nameA = (a.customer?.name || "").toLowerCase();
      const nameB = (b.customer?.name || "").toLowerCase();
      return nameA.localeCompare(nameB) * dir;
    }
    if (assignSortConfig.key === "order") {
      return String(a._id).localeCompare(String(b._id)) * dir;
    }
    if (assignSortConfig.key === "deliveryTime") {
      return String(a.deliveryTime || "").localeCompare(String(b.deliveryTime || "")) * dir;
    }
    if (assignSortConfig.key === "createdAt") {
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
    }
    // deliveryDate default
    const dateCmp = String(a.deliveryDate || "").localeCompare(String(b.deliveryDate || ""));
    if (dateCmp !== 0) return dateCmp * dir;
    return String(a.deliveryTime || "").localeCompare(String(b.deliveryTime || "")) * dir;
  });

  const assignTotalPages = Math.ceil(filteredUnassignedOrders.length / itemsPerPage) || 1;
  const safeAssignPage = Math.min(assignPage, assignTotalPages);
  const assignPageOrders = filteredUnassignedOrders.slice(
    (safeAssignPage - 1) * itemsPerPage,
    safeAssignPage * itemsPerPage
  );

  const categoryRows = categoryListData?.rows || [];
  const filteredCategoryRows = categoryRows.filter((row: any) => {
    if (!categorySearch) return true;
    const q = categorySearch.toLowerCase();
    return (
      String(row.orderId).slice(-6).toLowerCase().includes(q) ||
      String(row.customerName || "").toLowerCase().includes(q) ||
      String(row.phone || "").toLowerCase().includes(q) ||
      String(row.address || "").toLowerCase().includes(q) ||
      String(row.productName || "").toLowerCase().includes(q) ||
      String(row.cutName || "").toLowerCase().includes(q) ||
      String(row.partnerName || "").toLowerCase().includes(q) ||
      String(row.status || "").toLowerCase().includes(q) ||
      String(row.productCategory || "").toLowerCase().includes(q) ||
      String(row.itemNotes || row.customerNotes || "").toLowerCase().includes(q)
    );
  });

  filteredCategoryRows.sort((a: any, b: any) => {
    const dir = categorySortConfig.direction === "asc" ? 1 : -1;
    if (categorySortConfig.key === "customer") {
      return String(a.customerName || "").localeCompare(String(b.customerName || "")) * dir;
    }
    if (categorySortConfig.key === "order") {
      return String(a.orderId).localeCompare(String(b.orderId)) * dir;
    }
    if (categorySortConfig.key === "product") {
      return String(a.productName || "").localeCompare(String(b.productName || "")) * dir;
    }
    if (categorySortConfig.key === "status") {
      return String(a.status || "").localeCompare(String(b.status || "")) * dir;
    }
    if (categorySortConfig.key === "partner") {
      return String(a.partnerName || "").localeCompare(String(b.partnerName || "")) * dir;
    }
    if (categorySortConfig.key === "total") {
      return (Number(a.orderTotal || 0) - Number(b.orderTotal || 0)) * dir;
    }
    if (categorySortConfig.key === "category") {
      return String(a.productCategory || "").localeCompare(String(b.productCategory || "")) * dir;
    }
    return String(a.deliveryTime || "").localeCompare(String(b.deliveryTime || "")) * dir;
  });

  const categoryTotalPages = Math.ceil(filteredCategoryRows.length / itemsPerPage) || 1;
  const safeCategoryPage = Math.min(categoryPage, categoryTotalPages);
  const categoryPageRows = filteredCategoryRows.slice(
    (safeCategoryPage - 1) * itemsPerPage,
    safeCategoryPage * itemsPerPage
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
          <>
            <div className="flex flex-col md:flex-row gap-4 mb-4 items-start md:items-center justify-between">
              <input
                type="text"
                placeholder="Search order ID, customer, phone, city, pincode, date..."
                className="w-full md:w-96 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-teal-500 text-sm"
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
              />
              <div className="flex gap-3 items-center w-full md:w-auto">
                <span className="text-slate-400 text-sm shrink-0">Sort by:</span>
                <select
                  className="flex-1 md:flex-none bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-teal-500 text-sm"
                  value={`${assignSortConfig.key}-${assignSortConfig.direction}`}
                  onChange={(e) => {
                    const [key, direction] = e.target.value.split("-");
                    setAssignSortConfig({ key, direction });
                  }}
                >
                  <option value="deliveryDate-asc">Delivery date (earliest)</option>
                  <option value="deliveryDate-desc">Delivery date (latest)</option>
                  <option value="deliveryTime-asc">Delivery slot (early)</option>
                  <option value="deliveryTime-desc">Delivery slot (late)</option>
                  <option value="customer-asc">Customer (A–Z)</option>
                  <option value="customer-desc">Customer (Z–A)</option>
                  <option value="order-asc">Order ID</option>
                  <option value="order-desc">Order ID (reverse)</option>
                  <option value="createdAt-desc">Newest first</option>
                  <option value="createdAt-asc">Oldest first</option>
                </select>
              </div>
            </div>

            {filteredUnassignedOrders.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
                No matching orders. Try a different search.
              </div>
            ) : (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300 min-w-[720px]">
                    <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-4 font-medium">Order ID</th>
                        <th className="px-4 py-4 font-medium">Customer Details</th>
                        <th className="px-4 py-4 font-medium">Items</th>
                        <th className="px-4 py-4 font-medium">Delivery Slot</th>
                        <th className="px-4 py-4 font-medium">Assign Partner</th>
                        <th className="px-4 py-4 font-medium">Action</th>
                        <th className="px-4 py-4 font-medium">Edit / Cancel</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {assignPageOrders.map((order) => (
                        <tr key={order._id} className="hover:bg-slate-800/20">
                          <td className="px-4 py-4 font-mono text-white">
                            <div>#{order._id.slice(-6).toUpperCase()}</div>
                            <div className="mt-1.5">
                              <BookingSourceBadge source={order.bookingSource} />
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-medium text-white">{order.customer?.name || "Guest"}</div>
                            <div className="text-xs text-slate-400">{order.address?.city}, {order.address?.postalCode}</div>
                          </td>
                          <td className="px-4 py-4">
                            <OrderItemsAndNotes
                              items={order.items}
                              customerNotes={order.customerNotes}
                              categoryMap={productCategoryMap}
                              getCategoryColor={getCategoryColor}
                              compact
                            />
                          </td>
                          <td className="px-4 py-4 text-xs">
                            <div>{order.deliveryDate}</div>
                            <div className="text-slate-400">{order.deliveryTime}</div>
                          </td>
                          <td className="px-4 py-4">
                            <select
                              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-teal-500 w-full"
                              value={selectedPartner[order._id] || ""}
                              onChange={(e) => setSelectedPartner((prev) => ({ ...prev, [order._id]: e.target.value }))}
                            >
                              <option value="" disabled>Select Partner</option>
                              {partners.map((p) => (
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
                          <td className="px-4 py-4">
                            <ActionButtons order={order} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {filteredUnassignedOrders.length > 0 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-slate-400">
                  Showing {(safeAssignPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(safeAssignPage * itemsPerPage, filteredUnassignedOrders.length)} of{" "}
                  {filteredUnassignedOrders.length} unassigned order
                  {filteredUnassignedOrders.length === 1 ? "" : "s"}
                </div>
                <div className="flex gap-2 items-center">
                  <button
                    disabled={safeAssignPage === 1}
                    onClick={() => setAssignPage((p) => p - 1)}
                    className="px-3 py-1.5 bg-slate-800 text-white rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                  >
                    Prev
                  </button>
                  <span className="px-3 py-1 text-sm text-slate-300">
                    Page {safeAssignPage} of {assignTotalPages}
                  </span>
                  <button
                    disabled={safeAssignPage === assignTotalPages}
                    onClick={() => setAssignPage((p) => p + 1)}
                    className="px-3 py-1.5 bg-slate-800 text-white rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
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
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300 min-w-[900px]">
              <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Order ID</th>
                  <th className="px-6 py-4 font-medium">Customer Details</th>
                  <th className="px-6 py-4 font-medium">Items</th>
                  <th className="px-6 py-4 font-medium">Delivery Slot</th>
                  <th className="px-6 py-4 font-medium">Financials</th>
                  <th className="px-6 py-4 font-medium">Partner</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Updated At</th>
                  <th className="px-6 py-4 font-medium">Edit / Cancel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {currentAssignments.map(a => (
                  <tr key={a._id} className="hover:bg-slate-800/20">
                    <td className="px-6 py-4 font-mono text-white">
                      <div>#{String(a.order?._id || a.order).slice(-6).toUpperCase()}</div>
                      <div className="mt-1.5">
                        <BookingSourceBadge source={a.order?.bookingSource} />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{a.order?.customer?.name || "Guest"}</div>
                      <div className="text-xs text-slate-400">{a.order?.address?.city}, {a.order?.address?.postalCode}</div>
                    </td>
                    <td className="px-6 py-4">
                      <OrderItemsAndNotes
                        items={a.order?.items}
                        customerNotes={a.order?.customerNotes}
                        categoryMap={productCategoryMap}
                        getCategoryColor={getCategoryColor}
                        compact
                      />
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div>{a.order?.deliveryDate}</div>
                      <div className="text-slate-400">{a.order?.deliveryTime}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white/80">Total: ₹{a.order?.total?.toFixed(2) || '0.00'}</div>
                      <div className="text-teal-400 text-xs">Paid: ₹{(a.paymentCollected || 0).toFixed(2)}</div>
                      {((a.order?.total || 0) - (a.paymentCollected || 0)) > 0 && (
                        <div className="text-rose-400 text-xs mt-0.5">Pending: ₹{((a.order?.total || 0) - (a.paymentCollected || 0)).toFixed(2)}</div>
                      )}
                      <div className="text-blue-300 text-[10px] uppercase tracking-widest mt-1 border border-blue-500/20 bg-blue-500/10 rounded px-1.5 py-0.5 inline-block">
                        {(a.paymentMethod || a.order?.paymentStatus || 'pending').replace(/_/g, ' ')}
                      </div>
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
                    <td className="px-6 py-4">
                      <ActionButtons order={a.order} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      <div className="mt-10">
        <h2 className="text-xl font-bold text-white mb-1">Orders by Category</h2>
        <p className="text-sm text-slate-400 mb-4">
          Internal list for your team — pick a delivery date and category to view full order details and download PDF.
        </p>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6 mb-4">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-end justify-between">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Delivery date</label>
              <input
                type="date"
                value={categoryListDate}
                onChange={(e) => setCategoryListDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-teal-500 [color-scheme:dark]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_ORDER_GROUPS.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setCategoryListGroup(group.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    categoryListGroup === group.id
                      ? "bg-teal-500/20 border-teal-500/40 text-teal-300"
                      : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
                  }`}
                >
                  {group.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleDownloadCategoryPdf}
              disabled={categoryPdfGenerating || categoryListLoading || !categoryListData?.rows?.length}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold py-2.5 px-5 rounded-lg transition-colors"
            >
              {categoryPdfGenerating ? "Generating PDF..." : "Download PDF"}
            </button>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-800">
            <h3 className="text-lg font-bold text-white">
              {categoryListData?.groupLabel || "Category orders"}
            </h3>
            <p className="text-sm text-slate-400">
              {categoryListDate}
              {categoryListData?.stats
                ? ` · ${categoryListData.stats.orderCount} order${categoryListData.stats.orderCount === 1 ? "" : "s"} · ${categoryListData.stats.itemCount} line item${categoryListData.stats.itemCount === 1 ? "" : "s"}`
                : ""}
              {categoryRows.length > 0 && filteredCategoryRows.length !== categoryRows.length
                ? ` · ${filteredCategoryRows.length} shown after filter`
                : ""}
            </p>
          </div>

          {!categoryListLoading && categoryListData?.rows?.length > 0 && (
            <div className="flex flex-col md:flex-row gap-4 px-4 sm:px-6 pb-4 border-b border-slate-800 items-start md:items-center justify-between">
              <input
                type="text"
                placeholder="Search order, customer, phone, product, partner, status..."
                className="w-full md:w-96 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-teal-500 text-sm"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
              />
              <div className="flex gap-3 items-center w-full md:w-auto">
                <span className="text-slate-400 text-sm shrink-0">Sort by:</span>
                <select
                  className="flex-1 md:flex-none bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-teal-500 text-sm"
                  value={`${categorySortConfig.key}-${categorySortConfig.direction}`}
                  onChange={(e) => {
                    const [key, direction] = e.target.value.split("-");
                    setCategorySortConfig({ key, direction });
                  }}
                >
                  <option value="deliveryTime-asc">Delivery slot (early)</option>
                  <option value="deliveryTime-desc">Delivery slot (late)</option>
                  <option value="customer-asc">Customer (A–Z)</option>
                  <option value="customer-desc">Customer (Z–A)</option>
                  <option value="product-asc">Product (A–Z)</option>
                  <option value="product-desc">Product (Z–A)</option>
                  <option value="order-asc">Order ID</option>
                  <option value="order-desc">Order ID (reverse)</option>
                  <option value="partner-asc">Partner (A–Z)</option>
                  <option value="partner-desc">Partner (Z–A)</option>
                  <option value="status-asc">Status</option>
                  <option value="status-desc">Status (reverse)</option>
                  <option value="total-desc">Total (high to low)</option>
                  <option value="total-asc">Total (low to high)</option>
                  <option value="category-asc">Product category</option>
                </select>
              </div>
            </div>
          )}

          {categoryListLoading ? (
            <div className="p-8 text-center text-slate-400">Loading category orders...</div>
          ) : !categoryListData?.rows?.length ? (
            <div className="p-8 text-center text-slate-400">
              No orders for this category on the selected date.
            </div>
          ) : filteredCategoryRows.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No matching rows. Try a different search.
            </div>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300 min-w-[1200px]">
                <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-3 font-medium">#</th>
                    <th className="px-3 py-3 font-medium">Order</th>
                    <th className="px-3 py-3 font-medium">Source</th>
                    <th className="px-3 py-3 font-medium">Customer</th>
                    <th className="px-3 py-3 font-medium">Phone</th>
                    <th className="px-3 py-3 font-medium">Address</th>
                    <th className="px-3 py-3 font-medium">Slot</th>
                    <th className="px-3 py-3 font-medium">Category</th>
                    <th className="px-3 py-3 font-medium">Product</th>
                    <th className="px-3 py-3 font-medium">Cut</th>
                    <th className="px-3 py-3 font-medium">Qty</th>
                    <th className="px-3 py-3 font-medium">Notes</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Partner</th>
                    <th className="px-3 py-3 font-medium">Total</th>
                    <th className="px-3 py-3 font-medium">Map</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {categoryPageRows.map((row: any, idx: number) => (
                    <tr key={`${row.orderId}-${idx}`} className="hover:bg-slate-800/20">
                      <td className="px-3 py-3 text-slate-500">
                        {(safeCategoryPage - 1) * itemsPerPage + idx + 1}
                      </td>
                      <td className="px-3 py-3 font-mono text-white">
                        #{String(row.orderId).slice(-6).toUpperCase()}
                      </td>
                      <td className="px-3 py-3">
                        <BookingSourceBadge source={row.bookingSource} />
                      </td>
                      <td className="px-3 py-3 text-white font-medium">{row.customerName}</td>
                      <td className="px-3 py-3">{row.phone || "-"}</td>
                      <td className="px-3 py-3 text-xs max-w-[200px]">{row.address || "-"}</td>
                      <td className="px-3 py-3 text-xs">{row.deliveryTime || "-"}</td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] uppercase font-bold rounded border ${getCategoryColor(row.productCategory)}`}
                        >
                          {row.productCategory}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-white">{row.productName}</td>
                      <td className="px-3 py-3">{row.cutName || "-"}</td>
                      <td className="px-3 py-3 font-semibold text-white">
                        {formatQuantityLabel(row.quantity, row.unit)}
                      </td>
                      <td className="px-3 py-3 text-xs text-amber-300 max-w-[160px]">
                        {row.itemNotes || row.customerNotes || "-"}
                      </td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 border border-slate-700">
                          {String(row.status || "").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs">{row.partnerName || "Unassigned"}</td>
                      <td className="px-3 py-3 font-semibold text-teal-400">
                        ₹{Number(row.orderTotal || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {row.mapUrl ? (
                          <a
                            href={row.mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-400 hover:text-teal-300 underline"
                          >
                            Open
                          </a>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-t border-slate-800">
              <div className="text-sm text-slate-400">
                Showing {(safeCategoryPage - 1) * itemsPerPage + 1} to{" "}
                {Math.min(safeCategoryPage * itemsPerPage, filteredCategoryRows.length)} of{" "}
                {filteredCategoryRows.length} line item
                {filteredCategoryRows.length === 1 ? "" : "s"}
              </div>
              <div className="flex gap-2 items-center">
                <button
                  disabled={safeCategoryPage === 1}
                  onClick={() => setCategoryPage((p) => p - 1)}
                  className="px-3 py-1.5 bg-slate-800 text-white rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                >
                  Prev
                </button>
                <span className="px-3 py-1 text-sm text-slate-300">
                  Page {safeCategoryPage} of {categoryTotalPages}
                </span>
                <button
                  disabled={safeCategoryPage === categoryTotalPages}
                  onClick={() => setCategoryPage((p) => p + 1)}
                  className="px-3 py-1.5 bg-slate-800 text-white rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
            </>
          )}
        </div>
      </div>

      {(() => {
        const filteredOrders = orders.filter((o) => {
          if (!ordersSearch) return true;
          const q = ordersSearch.toLowerCase();
          const id = String(o._id).slice(-8).toLowerCase();
          const name = (o.customer?.name || "").toLowerCase();
          const status = (o.status || "").toLowerCase();
          const date = (o.deliveryDate || "").toLowerCase();
          return id.includes(q) || name.includes(q) || status.includes(q) || date.includes(q);
        });
        const totalOrderPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
        const pageOrders = filteredOrders.slice((ordersPage - 1) * itemsPerPage, ordersPage * itemsPerPage);
        return (
          <div className="mt-10">
            <h2 className="text-xl font-bold text-white mb-2">All Orders</h2>
            <p className="text-sm text-slate-400 mb-4">
              Edit or cancel from here. Cancelled orders stay in records and are not deleted.
            </p>
            <input
              type="text"
              placeholder="Search order ID, customer, status, date..."
              className="w-full md:w-80 mb-4 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-teal-500 text-sm"
              value={ordersSearch}
              onChange={(e) => {
                setOrdersSearch(e.target.value);
                setOrdersPage(1);
              }}
            />
            {pageOrders.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
                No orders found.
              </div>
            ) : (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300 min-w-[900px]">
                    <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-4 font-medium">Order</th>
                        <th className="px-4 py-4 font-medium">Customer</th>
                        <th className="px-4 py-4 font-medium">Items</th>
                        <th className="px-4 py-4 font-medium">Slot</th>
                        <th className="px-4 py-4 font-medium">Total</th>
                        <th className="px-4 py-4 font-medium">Status</th>
                        <th className="px-4 py-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {pageOrders.map((order) => (
                        <tr key={order._id} className="hover:bg-slate-800/20">
                          <td className="px-4 py-4 font-mono text-white">
                            <div>#{String(order._id).slice(-6).toUpperCase()}</div>
                            <div className="mt-1.5">
                              <BookingSourceBadge source={order.bookingSource} />
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-medium text-white">{order.customer?.name || "Guest"}</div>
                            <div className="text-xs text-slate-400">{order.address?.city}, {order.address?.postalCode}</div>
                          </td>
                          <td className="px-4 py-4">
                            <OrderItemsAndNotes
                              items={order.items}
                              customerNotes={order.customerNotes}
                              categoryMap={productCategoryMap}
                              getCategoryColor={getCategoryColor}
                              compact
                            />
                          </td>
                          <td className="px-4 py-4 text-xs">
                            <div>{order.deliveryDate}</div>
                            <div className="text-slate-400">{order.deliveryTime}</div>
                          </td>
                          <td className="px-4 py-4 font-semibold">₹{Number(order.total || 0).toFixed(2)}</td>
                          <td className="px-4 py-4">
                            <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold ${
                              order.status === "cancelled" ? "bg-rose-500/10 text-rose-300 border border-rose-500/20" :
                              order.status === "delivered" ? "bg-teal-500/10 text-teal-400 border border-teal-500/20" :
                              "bg-slate-800 text-slate-300 border border-slate-700"
                            }`}>
                              {String(order.status || "").replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <ActionButtons order={order} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {totalOrderPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-slate-400">
                  Showing {((ordersPage - 1) * itemsPerPage) + 1} to {Math.min(ordersPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length}
                </div>
                <div className="flex gap-2">
                  <button disabled={ordersPage === 1} onClick={() => setOrdersPage((p) => p - 1)} className="px-3 py-1.5 bg-slate-800 text-white rounded text-sm disabled:opacity-30">Prev</button>
                  <span className="px-3 py-1 text-sm text-slate-300">Page {ordersPage} of {totalOrderPages}</span>
                  <button disabled={ordersPage === totalOrderPages} onClick={() => setOrdersPage((p) => p + 1)} className="px-3 py-1.5 bg-slate-800 text-white rounded text-sm disabled:opacity-30">Next</button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="bg-slate-950 border border-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Edit order #{String(editingOrder._id).slice(-6).toUpperCase()}</h3>
                <p className="text-xs text-slate-400 mt-1">Changes apply immediately. The original order record is kept.</p>
              </div>
              <button type="button" onClick={() => setEditingOrder(null)} className="text-slate-400 hover:text-white">Close</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <input
                type="date"
                value={editingOrder.deliveryDate}
                onChange={(e) => setEditingOrder({ ...editingOrder, deliveryDate: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm [color-scheme:dark]"
              />
              <select
                value={editingOrder.deliveryTime}
                onChange={(e) => setEditingOrder({ ...editingOrder, deliveryTime: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              >
                {DELIVERY_TIMES.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
                {!DELIVERY_TIMES.includes(editingOrder.deliveryTime) && editingOrder.deliveryTime && (
                  <option value={editingOrder.deliveryTime}>{editingOrder.deliveryTime}</option>
                )}
              </select>
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Delivery partner</label>
                <select
                  value={editingOrder.deliveryPartnerId || ""}
                  onChange={(e) => setEditingOrder({ ...editingOrder, deliveryPartnerId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="">Select / change partner</option>
                  {partners.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <input
                placeholder="Address line 1"
                value={editingOrder.address.line1}
                onChange={(e) => setEditingOrder({ ...editingOrder, address: { ...editingOrder.address, line1: e.target.value } })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm sm:col-span-2"
              />
              <input
                placeholder="Area / line 2"
                value={editingOrder.address.line2}
                onChange={(e) => setEditingOrder({ ...editingOrder, address: { ...editingOrder.address, line2: e.target.value } })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              />
              <input
                placeholder="Phone"
                value={editingOrder.address.phone}
                onChange={(e) => setEditingOrder({ ...editingOrder, address: { ...editingOrder.address, phone: e.target.value } })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              />
              <input
                placeholder="City"
                value={editingOrder.address.city}
                onChange={(e) => setEditingOrder({ ...editingOrder, address: { ...editingOrder.address, city: e.target.value } })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              />
              <input
                placeholder="Pincode"
                value={editingOrder.address.postalCode}
                onChange={(e) => setEditingOrder({ ...editingOrder, address: { ...editingOrder.address, postalCode: e.target.value } })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              />
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Google Maps location link</label>
                <input
                  type="url"
                  placeholder="https://maps.google.com/..."
                  value={editingOrder.mapUrl || ""}
                  onChange={(e) => setEditingOrder({ ...editingOrder, mapUrl: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Delivery fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 0 for free delivery"
                  value={editingOrder.deliveryFee}
                  onChange={(e) => setEditingOrder({ ...editingOrder, deliveryFee: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
            </div>

            <h4 className="text-sm font-semibold text-white mb-2">Items</h4>
            <div className="space-y-2 mb-4">
              {editingOrder.items.map((item: any, idx: number) => {
                const kgItem = isKgUnit(item.unit);
                const qtyInOptions = WEIGHT_OPTIONS.some((opt) => opt.value === Number(item.quantity));
                return (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-900/60 border border-slate-800 rounded-lg p-2">
                  <div className="col-span-12 sm:col-span-4 text-sm text-white">
                    {item.productName}
                    <div className="text-[10px] text-slate-500 uppercase">{item.unit || "kg"}</div>
                  </div>
                  {kgItem ? (
                    <select
                      value={Number(item.quantity)}
                      onChange={(e) => updateEditItem(idx, { quantity: Number(e.target.value) })}
                      className="col-span-8 sm:col-span-3 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
                    >
                      {WEIGHT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                      {!qtyInOptions && Number(item.quantity) > 0 && (
                        <option value={item.quantity}>{item.quantity} kg</option>
                      )}
                    </select>
                  ) : (
                    <div className="col-span-8 sm:col-span-3 flex items-center bg-slate-950 border border-slate-700 rounded">
                      <button
                        type="button"
                        onClick={() => updateEditItem(idx, { quantity: Math.max(1, Number(item.quantity) - 1) })}
                        className="w-8 h-8 text-slate-300 hover:text-white"
                      >
                        -
                      </button>
                      <span className="flex-1 text-center text-white text-sm font-semibold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateEditItem(idx, { quantity: Number(item.quantity) + 1 })}
                        className="w-8 h-8 text-slate-300 hover:text-white"
                      >
                        +
                      </button>
                    </div>
                  )}
                  <input
                    type="number"
                    min={0}
                    value={item.unitPrice}
                    onChange={(e) => updateEditItem(idx, { unitPrice: Number(e.target.value) })}
                    className="col-span-4 sm:col-span-2 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-sm"
                  />
                  <div className="col-span-8 sm:col-span-2 text-xs text-slate-300">₹{Number(item.totalPrice || 0).toFixed(2)}</div>
                  <button type="button" onClick={() => removeEditItem(idx)} className="col-span-4 sm:col-span-1 text-rose-300 text-xs">Remove</button>
                  <input
                    placeholder="Notes"
                    value={item.notes}
                    onChange={(e) => updateEditItem(idx, { notes: e.target.value })}
                    className="col-span-12 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                  />
                </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mb-6">
              <select
                value={addProductId}
                onChange={(e) => setAddProductId(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="">Add product...</option>
                {catalogProducts.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
              <button type="button" onClick={addCatalogProduct} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm">Add item</button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <button type="button" onClick={() => handleCancelOrder(editingOrder)} className="px-4 py-2 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-sm">Cancel this order</button>
              <button type="button" disabled={editSaving} onClick={handleSaveEdit} className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-white font-semibold text-sm disabled:opacity-50">
                {editSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

