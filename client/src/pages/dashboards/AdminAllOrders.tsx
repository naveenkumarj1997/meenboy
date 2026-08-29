import { useEffect, useMemo, useState } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { getAllOrdersReport, downloadAllOrdersReport, type AllOrdersReportOrder } from "../../lib/api";
import { triggerPdfDownload } from "../../lib/downloadPdf";
import { formatQuantityLabel } from "../../lib/weightOptions";
import { BookingSourceBadge } from "../../components/SourceBadges";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";

const ITEMS_PER_PAGE = 5;

const todayLocal = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCategoryColor = (cat: string) => {
  switch (cat) {
    case "Chicken":
      return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    case "Country Chicken":
      return "text-orange-400 bg-orange-400/10 border-orange-400/20";
    case "Mutton":
      return "text-purple-400 bg-purple-400/10 border-purple-400/20";
    case "Seafood":
      return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    case "Fish":
      return "text-teal-400 bg-teal-400/10 border-teal-400/20";
    default:
      return "text-slate-400 bg-slate-400/10 border-slate-400/20";
  }
};

const formatPaymentMethod = (method?: string) => {
  switch (method) {
    case "cash":
      return "Cash (Full)";
    case "upi":
      return "UPI (Full)";
    case "partial_cash":
      return "Partial Cash";
    case "partial_upi":
      return "Partial UPI";
    case "pay_later":
      return "Pay Later";
    case "none":
      return "Already Paid / None";
    default:
      return method || "-";
  }
};

export default function AdminAllOrders() {
  const { token } = useAuth();
  const [listDate, setListDate] = useState(todayLocal());
  const [reportData, setReportData] = useState<{
    date: string;
    stats: { orderCount: number; itemCount: number };
    orders: AllOrdersReportOrder[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "deliveryTime", direction: "asc" });
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [search, sortConfig, listDate]);

  useEffect(() => {
    if (!token || !listDate) {
      setReportData(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getAllOrdersReport(token, { date: listDate });
        if (!cancelled) setReportData(data);
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to load orders");
          setReportData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [token, listDate]);

  const handleDownloadPdf = async () => {
    if (!token || !listDate) return;
    try {
      setPdfGenerating(true);
      setError("");
      const blob = await downloadAllOrdersReport(token, { date: listDate });
      triggerPdfDownload(blob, `AllOrders-${listDate}.pdf`);
    } catch (err: any) {
      setError(err.message || "Failed to download PDF");
    } finally {
      setPdfGenerating(false);
    }
  };

  const orders = reportData?.orders || [];

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;

    return orders.filter((order) => {
      const itemText = (order.items || [])
        .map(
          (item) =>
            `${item.productName} ${item.cutName || ""} ${item.notes || ""} ${item.productCategory}`
        )
        .join(" ");
      const blob = [
        order.orderId,
        order.customerName,
        order.phone,
        order.email,
        order.address,
        order.deliveryTime,
        order.status,
        order.bookingSource,
        order.partnerName,
        order.partnerPhone,
        order.assignmentStatus,
        order.customerNotes,
        order.paymentStatus,
        itemText
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [orders, search]);

  const sortedOrders = useMemo(() => {
    const dir = sortConfig.direction === "asc" ? 1 : -1;
    const list = [...filteredOrders];

    list.sort((a, b) => {
      if (sortConfig.key === "customer") {
        return a.customerName.localeCompare(b.customerName) * dir;
      }
      if (sortConfig.key === "order") {
        return String(a.orderId).localeCompare(String(b.orderId)) * dir;
      }
      if (sortConfig.key === "status") {
        return String(a.status).localeCompare(String(b.status)) * dir;
      }
      if (sortConfig.key === "partner") {
        return a.partnerName.localeCompare(b.partnerName) * dir;
      }
      if (sortConfig.key === "total") {
        return (Number(a.total) - Number(b.total)) * dir;
      }
      if (sortConfig.key === "createdAt") {
        return (
          (new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()) * dir
        );
      }
      return String(a.deliveryTime || "").localeCompare(String(b.deliveryTime || "")) * dir;
    });

    return list;
  }, [filteredOrders, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageOrders = sortedOrders.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  return (
    <DashboardShell
      title="ALL Orders"
      description="View every order for a chosen delivery date with full customer, item, and delivery details."
      navLinks={ADMIN_NAV_LINKS}
    >
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
          {error}
        </div>
      )}

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-end justify-between">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Delivery date</label>
              <input
                type="date"
                value={listDate}
                onChange={(e) => setListDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-teal-500 [color-scheme:dark]"
              />
            </div>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={pdfGenerating || loading || !orders.length}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold py-2.5 px-5 rounded-lg transition-colors"
            >
              {pdfGenerating ? "Generating PDF..." : "Download PDF"}
            </button>
          </div>
          <div className="text-sm text-slate-400">
            {reportData?.stats
              ? `${reportData.stats.orderCount} order${reportData.stats.orderCount === 1 ? "" : "s"} · ${reportData.stats.itemCount} line item${reportData.stats.itemCount === 1 ? "" : "s"}`
              : "Pick a date to load orders"}
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white">Orders for {listDate}</h2>
          <p className="text-sm text-slate-400">
            Full order details — customer, address, items, notes, partner, and payment info.
            {orders.length > 0 && filteredOrders.length !== orders.length
              ? ` · ${filteredOrders.length} shown after filter`
              : ""}
          </p>
        </div>

        {!loading && orders.length > 0 && (
          <div className="flex flex-col md:flex-row gap-4 px-4 sm:px-6 py-4 border-b border-slate-800 items-start md:items-center justify-between">
            <input
              type="text"
              placeholder="Search order, customer, phone, product, partner, status..."
              className="w-full md:w-96 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-teal-500 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex gap-3 items-center w-full md:w-auto">
              <span className="text-slate-400 text-sm shrink-0">Sort by:</span>
              <select
                className="flex-1 md:flex-none bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-teal-500 text-sm"
                value={`${sortConfig.key}-${sortConfig.direction}`}
                onChange={(e) => {
                  const [key, direction] = e.target.value.split("-");
                  setSortConfig({ key, direction });
                }}
              >
                <option value="deliveryTime-asc">Delivery slot (early)</option>
                <option value="deliveryTime-desc">Delivery slot (late)</option>
                <option value="customer-asc">Customer (A–Z)</option>
                <option value="customer-desc">Customer (Z–A)</option>
                <option value="order-asc">Order ID</option>
                <option value="order-desc">Order ID (reverse)</option>
                <option value="partner-asc">Partner (A–Z)</option>
                <option value="partner-desc">Partner (Z–A)</option>
                <option value="status-asc">Status</option>
                <option value="status-desc">Status (reverse)</option>
                <option value="total-desc">Total (high to low)</option>
                <option value="total-asc">Total (low to high)</option>
                <option value="createdAt-desc">Booked (newest)</option>
                <option value="createdAt-asc">Booked (oldest)</option>
              </select>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading orders...</div>
        ) : !orders.length ? (
          <div className="p-8 text-center text-slate-400">No orders for this delivery date.</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No matching orders. Try a different search.
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-800/60">
              {pageOrders.map((order, idx) => (
                <div key={order.orderId} className="p-4 sm:p-6 hover:bg-slate-800/20">
                  <div className="flex flex-col lg:flex-row gap-4 lg:items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-slate-500 text-sm">
                          #{(safePage - 1) * ITEMS_PER_PAGE + idx + 1}
                        </span>
                        <span className="font-mono font-bold text-white">
                          Order #{String(order.orderId).slice(-6).toUpperCase()}
                        </span>
                        <BookingSourceBadge source={order.bookingSource} />
                        <span
                          className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 border border-slate-700"
                        >
                          {String(order.status || "").replace(/_/g, " ")}
                        </span>
                      </div>
                      <div className="text-xl font-bold text-white">{order.customerName}</div>
                      <div className="text-sm text-slate-400 mt-1">
                        {order.email ? `${order.email} · ` : ""}
                        {order.phone || "No phone"}
                      </div>
                      <div className="text-sm text-slate-300 mt-2">{order.address}</div>
                      {order.mapUrl && (
                        <a
                          href={order.mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-400 text-sm hover:underline mt-2 inline-block"
                        >
                          Open in Google Maps
                        </a>
                      )}
                    </div>
                    <div className="shrink-0 bg-slate-950 border border-slate-800 rounded-xl p-4 min-w-[200px]">
                      <div className="text-xs text-slate-500 mb-1">Delivery slot</div>
                      <div className="text-white font-semibold">{order.deliveryTime || "-"}</div>
                      <div className="text-xs text-slate-500 mt-3 mb-1">Delivery partner</div>
                      <div className="text-white">{order.partnerName}</div>
                      {order.partnerPhone && (
                        <div className="text-teal-400 text-sm mt-0.5">{order.partnerPhone}</div>
                      )}
                      {order.assignmentStatus && (
                        <div className="text-xs text-slate-400 mt-1 capitalize">
                          Route: {order.assignmentStatus.replace(/_/g, " ")}
                        </div>
                      )}
                      <div className="border-t border-slate-800 mt-3 pt-3 space-y-1 text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Subtotal</span>
                          <span className="text-white">₹{Number(order.subtotal || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-400">Delivery fee</span>
                          <span className="text-white">₹{Number(order.deliveryFee || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between gap-4 font-bold">
                          <span className="text-slate-300">Total</span>
                          <span className="text-teal-400">₹{Number(order.total || 0).toFixed(2)}</span>
                        </div>
                        {Number(order.paymentCollected || 0) > 0 && (
                          <div className="flex justify-between gap-4 text-xs pt-1">
                            <span className="text-slate-500">Collected</span>
                            <span className="text-emerald-400">
                              ₹{Number(order.paymentCollected || 0).toFixed(2)} (
                              {formatPaymentMethod(order.paymentMethod)})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                      Order items
                    </div>
                    {(order.items || []).map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`inline-block px-2 py-0.5 text-[10px] uppercase font-bold rounded border ${getCategoryColor(item.productCategory)}`}
                            >
                              {item.productCategory}
                            </span>
                            <span className="font-semibold text-white">{item.productName}</span>
                            {item.cutName && (
                              <span className="text-teal-300 text-sm">· {item.cutName}</span>
                            )}
                          </div>
                          <div className="text-sm text-slate-400 mt-1">
                            Qty: {formatQuantityLabel(item.quantity, item.unit)} · ₹
                            {Number(item.unitPrice || 0).toFixed(2)} / unit · Line ₹
                            {Number(item.totalPrice || 0).toFixed(2)}
                          </div>
                          {item.notes?.trim() && (
                            <div className="text-xs text-amber-300 mt-1">Note: {item.notes}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {String(order.customerNotes || "").trim() && (
                    <div className="mt-3 text-sm text-amber-100 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
                      <span className="font-bold uppercase tracking-wider text-amber-300 text-xs">
                        Cutting / cleaning notes:{" "}
                      </span>
                      {order.customerNotes}
                    </div>
                  )}

                  {order.createdAt && (
                    <div className="text-xs text-slate-500 mt-3">
                      Booked: {new Date(order.createdAt).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-t border-slate-800">
              <div className="text-sm text-slate-400">
                Showing {(safePage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                {Math.min(safePage * ITEMS_PER_PAGE, sortedOrders.length)} of{" "}
                {sortedOrders.length} order{sortedOrders.length === 1 ? "" : "s"}
              </div>
              <div className="flex gap-2 items-center">
                <button
                  disabled={safePage === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 bg-slate-800 text-white rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                >
                  Prev
                </button>
                <span className="px-3 py-1 text-sm text-slate-300">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  disabled={safePage === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 bg-slate-800 text-white rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
