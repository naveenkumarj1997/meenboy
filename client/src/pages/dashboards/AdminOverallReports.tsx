import { useEffect, useMemo, useState } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import {
  downloadPartnerDayReport,
  downloadVendorCategoryReport,
  getAdminOrders,
  getAllAssignments,
  getDeliveryPartners,
  getVendorPrepPreview
} from "../../lib/api";
import { triggerPdfDownload } from "../../lib/downloadPdf";

const VENDOR_CATEGORIES = [
  "Fish & Seafood",
  "Chicken",
  "Mutton",
  "Country Chicken"
] as const;

type VendorRow = {
  key: string;
  productName: string;
  cutName: string;
  quantity: number;
  unit: string;
  notes: string;
  displayNotes?: string;
  notesRowSpan?: number;
  orderId: string;
  category: string;
  customerName: string;
};

const todayLocal = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function AdminOverallReports() {
  const { token } = useAuth();
  const [partners, setPartners] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [vendorRows, setVendorRows] = useState<VendorRow[]>([]);
  const [vendorStats, setVendorStats] = useState<{
    totalOrders: number;
    manualOrders: number;
    websiteOrders: number;
  } | null>(null);
  const [vendorPreviewLoading, setVendorPreviewLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingVendor, setGeneratingVendor] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [date, setDate] = useState(todayLocal());
  const [partnerId, setPartnerId] = useState("all");
  const [vendorCategory, setVendorCategory] = useState("all");
  const [vendorDate, setVendorDate] = useState(todayLocal());

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [partRes, assignRes, orderRes] = await Promise.all([
          getDeliveryPartners(token),
          getAllAssignments(token),
          getAdminOrders(token)
        ]);
        setPartners(partRes.deliveryPartners || []);
        setAssignments(assignRes.assignments || []);
        setOrders(orderRes.orders || []);
      } catch (err: any) {
        setError(err.message || "Failed to load report data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  useEffect(() => {
    if (!token || !vendorDate) {
      setVendorRows([]);
      setVendorStats(null);
      return;
    }

    let cancelled = false;

    const loadVendorPreview = async () => {
      try {
        setVendorPreviewLoading(true);
        const res = await getVendorPrepPreview(token, {
          date: vendorDate,
          category: vendorCategory
        });
        if (cancelled) return;

        setVendorStats(res.stats);

        if (vendorCategory === "all" && res.sections) {
          const rows: VendorRow[] = [];
          res.sections.forEach((section) => {
            section.rows.forEach((row, idx) => {
              rows.push({
                key: `${section.categoryLabel}-${row.orderId}-${idx}`,
                productName: row.productName,
                cutName: row.cutName || "",
                quantity: row.quantity,
                unit: row.unit || "kg",
                notes: row.notes || "",
                displayNotes: row.displayNotes ?? row.notes ?? "",
                notesRowSpan: row.notesRowSpan ?? 1,
                orderId: String(row.orderId || ""),
                category: section.categoryLabel,
                customerName: row.customerName || "Guest"
              });
            });
          });
          setVendorRows(rows);
        } else {
          setVendorRows(
            (res.rows || []).map((row, idx) => ({
              key: `${row.orderId}-${idx}`,
              productName: row.productName,
              cutName: row.cutName || "",
              quantity: row.quantity,
              unit: row.unit || "kg",
              notes: row.notes || "",
              displayNotes: row.displayNotes ?? row.notes ?? "",
              notesRowSpan: row.notesRowSpan ?? 1,
              orderId: String(row.orderId || ""),
              category: res.categoryLabel || vendorCategory,
              customerName: row.customerName || "Guest"
            }))
          );
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to load vendor prep preview");
          setVendorRows([]);
          setVendorStats(null);
        }
      } finally {
        if (!cancelled) setVendorPreviewLoading(false);
      }
    };

    loadVendorPreview();
    return () => {
      cancelled = true;
    };
  }, [token, vendorDate, vendorCategory]);

  const partnerByOrderId = useMemo(() => {
    const map: Record<string, any> = {};
    assignments.forEach((a) => {
      const orderId = String(a.order?._id || a.order || "");
      if (orderId) map[orderId] = a.deliveryPartner || null;
    });
    return map;
  }, [assignments]);

  const isAll = partnerId === "all" || !partnerId;

  const filtered = useMemo(() => {
    if (!date) return [];

    if (isAll) {
      return orders
        .filter((o) => o.deliveryDate === date)
        .sort((a, b) => String(a.deliveryTime || "").localeCompare(String(b.deliveryTime || "")))
        .map((order) => ({
          _id: order._id,
          order,
          deliveryPartner: partnerByOrderId[String(order._id)] || null,
          status: partnerByOrderId[String(order._id)] ? "assigned" : "unassigned"
        }));
    }

    return assignments
      .filter(
        (a) =>
          a.deliveryPartner?._id === partnerId && a.order?.deliveryDate === date
      )
      .sort((a, b) =>
        String(a.order?.deliveryTime || "").localeCompare(String(b.order?.deliveryTime || ""))
      );
  }, [assignments, orders, partnerId, date, isAll, partnerByOrderId]);

  const selectedPartner = partners.find((p) => p._id === partnerId);

  const handleGeneratePdf = async () => {
    if (!token || !date) {
      setError("Please select a delivery date.");
      return;
    }
    try {
      setGenerating(true);
      setError("");
      setSuccess("");
      const blob = await downloadPartnerDayReport(token, {
        date,
        partnerId: isAll ? "all" : partnerId
      });
      const partnerName = isAll
        ? "ALL"
        : (selectedPartner?.name || "partner").replace(/\s+/g, "_");
      triggerPdfDownload(blob, `Delivery-${date}-${partnerName}.pdf`);
      setSuccess(
        isAll
          ? `PDF generated for ALL orders on ${date}.`
          : `PDF generated for ${selectedPartner?.name || "partner"} on ${date}.`
      );
    } catch (err: any) {
      setError(err.message || "Failed to generate PDF report");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateVendorPdf = async () => {
    if (!token || !vendorDate) {
      setError("Please select a vendor prep date.");
      return;
    }
    try {
      setGeneratingVendor(true);
      setError("");
      setSuccess("");
      const blob = await downloadVendorCategoryReport(token, {
        date: vendorDate,
        category: vendorCategory
      });
      const catSlug = vendorCategory === "all" ? "ALL" : vendorCategory.replace(/\s+/g, "_");
      triggerPdfDownload(blob, `VendorPrep-${vendorDate}-${catSlug}.pdf`);
      setSuccess(
        vendorCategory === "all"
          ? `Vendor prep PDF generated for ALL categories on ${vendorDate}.`
          : `Vendor prep PDF generated for ${vendorCategory} on ${vendorDate}.`
      );
    } catch (err: any) {
      setError(err.message || "Failed to generate vendor prep PDF");
    } finally {
      setGeneratingVendor(false);
    }
  };

  return (
    <DashboardShell
      title="Overall Reports"
      description="Delivery partner PDFs and vendor prep lists by category."
      navLinks={ADMIN_NAV_LINKS}
    >
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          {success}
        </div>
      )}

      {/* ── Delivery Partner Report ── */}
      <section className="mb-10">
        <h3 className="text-xl font-bold text-white mb-1">Delivery Partner Report</h3>
        <p className="text-sm text-slate-400 mb-4">
          Generate a delivery checklist PDF for partners on a selected date.
        </p>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Delivery Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-teal-500 [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-2">Delivery Partner</label>
              <select
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-teal-500"
              >
                <option value="all">ALL</option>
                {partners.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleGeneratePdf}
              disabled={!date || generating || loading}
              className="w-full md:w-auto bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-6 rounded-lg transition-colors"
            >
              {generating ? "Generating PDF..." : "Generate Delivery PDF"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-800">
              <h4 className="text-lg font-bold text-white">
                Preview — {isAll ? "ALL Partners" : selectedPartner?.name || "Partner"}
              </h4>
              <p className="text-sm text-slate-400">
                {date} · {filtered.length} order{filtered.length === 1 ? "" : "s"}
              </p>
            </div>

            {filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No orders found for the selected date
                {isAll ? "" : " and partner"}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300 min-w-[800px]">
                  <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Order</th>
                      {isAll && <th className="px-4 py-3 font-medium">Partner</th>}
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Phone</th>
                      <th className="px-4 py-3 font-medium">Items</th>
                      <th className="px-4 py-3 font-medium">Slot</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filtered.map((a, idx) => {
                      const order = a.order || {};
                      const customer = order.customer || {};
                      const address = order.address || {};
                      const partnerName = a.deliveryPartner?.name || "Unassigned";
                      const mapUrl = String(order.mapUrl || customer.mapUrl || "").trim();
                      return (
                        <tr key={a._id || order._id || idx} className="hover:bg-slate-800/20">
                          <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                          <td className="px-4 py-3 font-mono text-white">
                            #{String(order._id || "").slice(-6).toUpperCase()}
                          </td>
                          {isAll && (
                            <td className="px-4 py-3 text-teal-300">{partnerName}</td>
                          )}
                          <td className="px-4 py-3">
                            <div className="font-medium text-white">{customer.name || "Guest"}</div>
                            <div className="text-xs text-slate-400 max-w-[200px]">
                              {[address.line1, address.line2, address.city, address.postalCode]
                                .filter(Boolean)
                                .join(", ")}
                            </div>
                          </td>
                          <td className="px-4 py-3">{address.phone || customer.phone || "-"}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1 max-w-[240px]">
                              {(order.items || []).map((item: any, i: number) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded border border-slate-700 bg-slate-800/60 w-fit"
                                >
                                  {item.quantity}
                                  {item.unit || "kg"} {item.productName}
                                  {item.cutName ? ` (${item.cutName})` : ""}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs">{order.deliveryTime || "-"}</td>
                          <td className="px-4 py-3 font-semibold text-white">
                            ₹{Number(order.total || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 capitalize text-xs">
                            {(a.status || order.status || "-").replace(/_/g, " ")}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {mapUrl ? (
                              <a
                                href={mapUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-teal-400 hover:underline"
                              >
                                Open Map
                              </a>
                            ) : (
                              <span className="text-slate-500">No link</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Vendor Prep Lists ── */}
      <section>
        <h3 className="text-xl font-bold text-white mb-1">Vendor Prep Lists</h3>
        <p className="text-sm text-slate-400 mb-4">
          Send category PDFs to vendors so they can cut and prepare before the delivery day.
          Includes website orders and manual bookings. Fish and Seafood are combined for one
          vendor.
        </p>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Prep / Delivery Date</label>
              <input
                type="date"
                value={vendorDate}
                onChange={(e) => setVendorDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-teal-500 [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-2">Category (Shop)</label>
              <select
                value={vendorCategory}
                onChange={(e) => setVendorCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-teal-500"
              >
                <option value="all">ALL Categories</option>
                {VENDOR_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleGenerateVendorPdf}
              disabled={!vendorDate || generatingVendor || loading}
              className="w-full md:w-auto bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold py-2.5 px-6 rounded-lg transition-colors"
            >
              {generatingVendor ? "Generating PDF..." : "Generate Vendor PDF"}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {VENDOR_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setVendorCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  vendorCategory === cat
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "border-slate-700 text-slate-400 hover:border-slate-500"
                }`}
              >
                {cat}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setVendorCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                vendorCategory === "all"
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                  : "border-slate-700 text-slate-400 hover:border-slate-500"
              }`}
            >
              ALL
            </button>
          </div>
        </div>

        {!loading && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-slate-800">
              <h4 className="text-lg font-bold text-white">
                Vendor Preview —{" "}
                {vendorCategory === "all" ? "ALL Categories" : vendorCategory}
              </h4>
              <p className="text-sm text-slate-400">
                {vendorDate} · {vendorRows.length} item{vendorRows.length === 1 ? "" : "s"}
                {vendorStats
                  ? ` · ${vendorStats.totalOrders} order${vendorStats.totalOrders === 1 ? "" : "s"} (${vendorStats.manualOrders} manual, ${vendorStats.websiteOrders} website)`
                  : ""}
              </p>
            </div>

            {vendorPreviewLoading ? (
              <div className="p-8 text-center text-slate-400">Loading vendor prep list...</div>
            ) : vendorRows.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No items for this category on the selected date.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300 min-w-[720px]">
                  <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3 font-medium">#</th>
                      {vendorCategory === "all" && (
                        <th className="px-4 py-3 font-medium">Category</th>
                      )}
                      <th className="px-4 py-3 font-medium">Product</th>
                      <th className="px-4 py-3 font-medium">Cut</th>
                      <th className="px-4 py-3 font-medium">Qty</th>
                      <th className="px-4 py-3 font-medium">Special Notes</th>
                      <th className="px-4 py-3 font-medium">Order</th>
                      <th className="px-4 py-3 font-medium">Customer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {vendorRows.map((row, idx) => (
                      <tr key={row.key} className="hover:bg-slate-800/20">
                        <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                        {vendorCategory === "all" && (
                          <td className="px-4 py-3 text-amber-300 text-xs font-semibold">
                            {row.category}
                          </td>
                        )}
                        <td className="px-4 py-3 text-white font-medium">{row.productName}</td>
                        <td className="px-4 py-3">{row.cutName || "-"}</td>
                        <td className="px-4 py-3 font-semibold text-white">
                          {row.quantity}
                          {row.unit}
                        </td>
                        {row.notesRowSpan !== 0 && (
                          <td
                            className="px-4 py-3 align-top"
                            rowSpan={row.notesRowSpan && row.notesRowSpan > 1 ? row.notesRowSpan : undefined}
                          >
                            {(row.displayNotes ?? row.notes) ? (
                              <span className="text-amber-300 font-medium">
                                {row.displayNotes ?? row.notes}
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3 font-mono text-xs">
                          #{row.orderId.slice(-6).toUpperCase()}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">{row.customerName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
