import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getMyOrders, downloadInvoice, getCatalog } from "../../lib/api";
import DashboardShell from "./DashboardShell";

const CustomerDashboard = () => {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [productImageMap, setProductImageMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (token) {
      fetchOrders();
      fetchCatalogForImages();
    }
  }, [token]);

  const fetchCatalogForImages = async () => {
    try {
      const res = await getCatalog();
      const map: Record<string, string> = {};
      res.data.products.forEach((p: any) => {
        map[p._id] = p.image?.startsWith('/uploads') ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${p.image}` : p.image;
      });
      setProductImageMap(map);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const data = await getMyOrders(token!);
      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch orders");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "confirmed": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
      case "preparing": return "text-purple-400 bg-purple-400/10 border-purple-400/20";
      case "out_for_delivery": return "text-orange-400 bg-orange-400/10 border-orange-400/20";
      case "delivered": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
      case "cancelled": return "text-red-400 bg-red-400/10 border-red-400/20";
      default: return "text-white/70 bg-white/5 border-white/10";
    }
  };

  // Helper to find image from static products if available
  const getProductImage = (productId: string) => {
    return productImageMap[productId] || "https://placehold.co/150x150/0e7490/e0f2fe?text=Seafood";
  };

  const activeOrders = orders.filter(o => !["delivered", "cancelled"].includes(o.status));

  const handleDownloadInvoice = async (orderId: string) => {
    try {
      setDownloadingId(orderId);
      const blob = await downloadInvoice(token!, orderId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${orderId.slice(-8).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      setError(err.message || "Failed to download invoice");
    } finally {
      setDownloadingId(null);
    }
  };

const CUSTOMER_NAV_LINKS = [
  { label: "Orders", href: "/dashboard" },
  { label: "Payments", href: "/dashboard/payments" },
  { label: "Delivery Status", href: "/dashboard/deliveries" }
];

  if (isLoading) {
    return (
      <DashboardShell title="Customer Dashboard" description={`Welcome back, ${user?.name}`} navLinks={CUSTOMER_NAV_LINKS}>
        <div className="flex justify-center items-center h-64">
          <div className="w-10 h-10 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Customer Dashboard" description={`Welcome back, ${user?.name}`} navLinks={CUSTOMER_NAV_LINKS}>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-8">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="text-white/50 text-sm font-medium mb-2">Total Orders</div>
          <div className="text-3xl font-black text-white">{orders.length}</div>
        </div>
        <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl p-6">
          <div className="text-teal-400/80 text-sm font-medium mb-2">Active Orders</div>
          <div className="text-3xl font-black text-teal-400">{activeOrders.length}</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Order History</h2>
        <Link to="/products" className="text-teal-400 hover:text-teal-300 transition-colors text-sm font-medium bg-teal-400/10 px-4 py-2 rounded-lg">
          Browse Products
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
          <div className="text-6xl mb-4 opacity-50">🛒</div>
          <h3 className="text-xl font-bold text-white mb-2">No orders yet</h3>
          <p className="text-white/50 mb-6">You haven't placed any seafood orders with us.</p>
          <Link
            to="/products"
            className="inline-flex bg-teal-500 hover:bg-teal-400 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-teal-500/20 transition-all"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order._id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              {/* Order Header */}
              <div className="bg-cyan-950/50 p-4 md:p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-white/50 text-sm">Order #{order._id.slice(-8).toUpperCase()}</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${getStatusColor(order.status)}`}>
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="text-white/70 text-sm">
                    Placed on {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-left md:text-right flex flex-col md:items-end gap-2">
                  <div>
                    <div className="text-white font-bold text-xl">₹{order.total.toFixed(2)}</div>
                    <div className="text-teal-400/80 text-sm font-medium">
                      Delivery: {order.deliveryDate} ({order.deliveryTime})
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadInvoice(order._id)}
                    disabled={downloadingId === order._id}
                    className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    {downloadingId === order._id ? (
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"></span>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                    Invoice
                  </button>
                </div>
              </div>

              {/* Order Items */}
              <div className="p-4 md:p-6 space-y-4">
                {order.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-cyan-900/50 rounded-lg overflow-hidden shrink-0">
                      <img 
                        src={item.productImage || getProductImage(item.product)} 
                        alt={item.productName || "Product"} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">
                        {item.productName || 'Seafood Item'}
                      </div>
                      <div className="text-sm text-white/50">
                        Qty: {item.quantity} {item.cutName && `• Cut: ${item.cutName}`}
                      </div>
                      {item.notes && (
                        <div className="text-xs text-teal-400/70 italic mt-0.5 truncate">
                          Note: {item.notes}
                        </div>
                      )}
                    </div>
                    <div className="text-white font-bold shrink-0">
                      ₹{item.totalPrice.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
};

export default CustomerDashboard;
