import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import {
  downloadPartnerCollectionReport,
  getPartnerCollectionHistory,
  getPartnerSalariesByDate,
  getTodayDeliveryStatus,
  savePartnerSalary
} from "../../lib/api";
import { formatQuantityLabel } from "../../lib/weightOptions";
import { BookingSourceBadge } from "../../components/SourceBadges";

const localToday = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

function formatPaymentMethod(method?: string) {
  switch (method) {
    case "cash":
      return "COD (Full)";
    case "upi":
      return "UPI (Full)";
    case "partial_cash":
      return "COD (Partial)";
    case "partial_upi":
      return "UPI (Partial)";
    case "pay_later":
      return "Pay Later";
    case "none":
      return "Already Paid / None";
    default:
      return method || "—";
  }
}

function collectionKind(method?: string): "cod" | "upi" | "none" {
  if (method === "cash" || method === "partial_cash") return "cod";
  if (method === "upi" || method === "partial_upi") return "upi";
  return "none";
}

function isPartial(method?: string) {
  return method === "partial_cash" || method === "partial_upi";
}

function isFull(method?: string) {
  return method === "cash" || method === "upi";
}

type PartnerStat = {
  partnerId: string;
  name: string;
  phone?: string;
  deliveredCount: number;
  failedCount: number;
  codCollected: number;
  upiCollected: number;
  salaryAmount: number;
  partnerConfirmed: boolean;
};

export default function AdminDeliveryAmountCollection() {
  const { token } = useAuth();
  const [date, setDate] = useState(localToday);
  const [partnerId, setPartnerId] = useState("");
  const [dayStats, setDayStats] = useState<PartnerStat[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [salaryInput, setSalaryInput] = useState<number | "">("");
  const [savedSalary, setSavedSalary] = useState(0);
  const [loadingDay, setLoadingDay] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [savingSalary, setSavingSalary] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "sequence" | "customer" | "slot" | "total" | "collected" | "pending" | "status"
  >("sequence");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadDayStats = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingDay(true);
      setError("");
      const res = await getPartnerSalariesByDate(token, date);
      setDayStats(res.stats || []);
    } catch (err: any) {
      setError(err.message || "Failed to load partners for this date");
      setDayStats([]);
    } finally {
      setLoadingDay(false);
    }
  }, [token, date]);

  useEffect(() => {
    loadDayStats();
  }, [loadDayStats]);

  useEffect(() => {
    if (!partnerId) return;
    const stillValid = dayStats.some((s) => s.partnerId === partnerId);
    if (!stillValid) setPartnerId("");
  }, [dayStats, partnerId]);

  useEffect(() => {
    if (!token || !partnerId) {
      setAssignments([]);
      setHistory([]);
      setSalaryInput("");
      setSavedSalary(0);
      return;
    }

    const stat = dayStats.find((s) => s.partnerId === partnerId);
    setSavedSalary(stat?.salaryAmount || 0);
    setSalaryInput(stat?.salaryAmount || "");

    (async () => {
      try {
        setLoadingList(true);
        setError("");
        const res = await getTodayDeliveryStatus(token, { date, partnerId });
        setAssignments(res.assignments || []);
      } catch (err: any) {
        setError(err.message || "Failed to load delivery collections");
        setAssignments([]);
      } finally {
        setLoadingList(false);
      }
    })();

    (async () => {
      try {
        setLoadingHistory(true);
        const res = await getPartnerCollectionHistory(token, partnerId, 30);
        setHistory(res.history || []);
      } catch {
        setHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    })();
  }, [token, date, partnerId, dayStats]);

  useEffect(() => {
    setSearchQuery("");
    setSortBy("sequence");
    setSortOrder("asc");
    setCurrentPage(1);
  }, [date, partnerId]);

  const rows = useMemo(() => {
    return [...assignments].sort((a, b) => {
      const seq = (a.sequence || 0) - (b.sequence || 0);
      if (seq !== 0) return seq;
      return String(a.order?.deliveryTime || "").localeCompare(String(b.order?.deliveryTime || ""));
    });
  }, [assignments]);

  const getRowValues = (a: any) => {
    const order = a.order || {};
    const orderTotal = Number(order.total || 0);
    const collected = a.status === "delivered" ? Number(a.paymentCollected || 0) : 0;
    const pending =
      a.status === "delivered" ? Math.max(0, orderTotal - collected) : orderTotal;
    return { order, orderTotal, collected, pending };
  };

  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = rows.filter((a) => {
      if (!q) return true;
      const { order } = getRowValues(a);
      const items = Array.isArray(order.items) ? order.items : [];
      const itemText = items
        .map((item: any) => `${item.productName || ""} ${item.cutName || ""}`)
        .join(" ");
      const haystack = [
        order.customer?.name,
        order.customer?.phone,
        order.address?.phone,
        order.address?.line1,
        order.address?.city,
        String(order._id || ""),
        order.deliveryTime,
        a.status,
        a.paymentMethod,
        itemText
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    return [...filtered].sort((a, b) => {
      const aVal = getRowValues(a);
      const bVal = getRowValues(b);
      let cmp = 0;

      switch (sortBy) {
        case "customer":
          cmp = String(aVal.order.customer?.name || "").localeCompare(
            String(bVal.order.customer?.name || "")
          );
          break;
        case "slot":
          cmp = String(aVal.order.deliveryTime || "").localeCompare(
            String(bVal.order.deliveryTime || "")
          );
          break;
        case "total":
          cmp = aVal.orderTotal - bVal.orderTotal;
          break;
        case "collected":
          cmp = aVal.collected - bVal.collected;
          break;
        case "pending":
          cmp = aVal.pending - bVal.pending;
          break;
        case "status":
          cmp = String(a.status || "").localeCompare(String(b.status || ""));
          break;
        case "sequence":
        default:
          cmp = (a.sequence || 0) - (b.sequence || 0);
          if (cmp === 0) {
            cmp = String(aVal.order.deliveryTime || "").localeCompare(
              String(bVal.order.deliveryTime || "")
            );
          }
          break;
      }

      return sortOrder === "desc" ? -cmp : cmp;
    });
  }, [rows, searchQuery, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / itemsPerPage));
  const paginatedRows = filteredAndSorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const delivered = rows.filter((a) => a.status === "delivered");

  const totals = useMemo(() => {
    let totalOrderAmount = 0;
    let totalCollected = 0;
    let totalCod = 0;
    let totalUpi = 0;
    let totalPending = 0;

    for (const a of rows) {
      const orderTotal = Number(a.order?.total || 0);
      const collected = a.status === "delivered" ? Number(a.paymentCollected || 0) : 0;
      const pending =
        a.status === "delivered" ? Math.max(0, orderTotal - collected) : orderTotal;

      totalOrderAmount += orderTotal;
      totalCollected += collected;
      totalPending += pending;

      const kind = collectionKind(a.paymentMethod);
      if (a.status === "delivered") {
        if (kind === "cod") totalCod += collected;
        if (kind === "upi") totalUpi += collected;
      }
    }

    return {
      deliveryCount: rows.length,
      deliveredCount: delivered.length,
      totalOrderAmount,
      totalCollected,
      totalCod,
      totalUpi,
      totalPending
    };
  }, [rows, delivered.length]);

  const selectedPartner = dayStats.find((p) => p.partnerId === partnerId);
  const salaryAmount = Number(savedSalary || 0);
  const netAfterSalary = totals.totalCollected - salaryAmount;

  const handleSaveSalary = async () => {
    if (!token || !partnerId) return;
    try {
      setSavingSalary(true);
      setError("");
      setSuccess("");
      const amount = salaryInput === "" ? 0 : Number(salaryInput);
      await savePartnerSalary(token, { date, partnerId, amount });
      setSavedSalary(amount);
      setSuccess(`Salary ₹${amount.toFixed(2)} saved for ${selectedPartner?.name || "partner"} on ${date}`);
      await loadDayStats();
      const hist = await getPartnerCollectionHistory(token, partnerId, 30);
      setHistory(hist.history || []);
    } catch (err: any) {
      setError(err.message || "Failed to save salary");
    } finally {
      setSavingSalary(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!token || !partnerId) return;
    try {
      setDownloadingPdf(true);
      setError("");
      const blob = await downloadPartnerCollectionReport(token, { date, partnerId });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Collection-${date}-${selectedPartner?.name || "partner"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Failed to download PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <DashboardShell
      title="Delivery Amount Collection"
      description="Track partner collections (COD / UPI), set daily salary, and download reports."
      navLinks={ADMIN_NAV_LINKS}
    >
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">{error}</div>
      )}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">{success}</div>
      )}

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-400 text-sm mb-2">Delivery date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-teal-500"
            />
            <p className="text-xs text-slate-500 mt-1.5">Pick any past or today&apos;s date to review collections & salary.</p>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-2">Delivery partner (worked on this date)</label>
            <select
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              disabled={loadingDay}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-teal-500"
            >
              <option value="">
                {loadingDay ? "Loading partners..." : "-- Select partner --"}
              </option>
              {dayStats.map((p) => (
                <option key={p.partnerId} value={p.partnerId}>
                  {p.name}
                  {p.phone ? ` (${p.phone})` : ""}
                  {p.deliveredCount > 0 ? ` · ${p.deliveredCount} delivered` : ""}
                </option>
              ))}
            </select>
            {!loadingDay && dayStats.length === 0 && (
              <p className="text-xs text-amber-400 mt-1.5">No delivery partners assigned on {date}.</p>
            )}
          </div>
        </div>
      </div>

      {!partnerId ? (
        <div className="text-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-xl">
          Choose a date and delivery partner to view collection details.
        </div>
      ) : loadingList ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">
                {selectedPartner?.name || "Partner"} — {date}
              </h2>
              <p className="text-sm text-slate-400">
                {totals.deliveryCount} delivery{totals.deliveryCount === 1 ? "" : "ies"} assigned ·{" "}
                {totals.deliveredCount} delivered
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf || rows.length === 0}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold disabled:opacity-40"
              >
                {downloadingPdf ? "Generating..." : "Download PDF"}
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex-1">
                <label className="block text-slate-400 text-xs uppercase tracking-wider mb-1.5">
                  Partner salary for {date}
                </label>
                <div className="relative max-w-xs">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">₹</span>
                  <input
                    type="number"
                    min={0}
                    value={salaryInput}
                    onChange={(e) =>
                      setSalaryInput(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-4 py-2.5 text-white outline-none focus:border-purple-500"
                    placeholder="Enter salary amount"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveSalary}
                disabled={savingSalary || salaryInput === savedSalary}
                className="px-5 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold disabled:opacity-40"
              >
                {savingSalary ? "Saving..." : "Save Salary"}
              </button>
            </div>
            {savedSalary > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                Saved salary for this date: <span className="text-purple-300 font-semibold">₹{savedSalary.toFixed(2)}</span>
              </p>
            )}
          </div>

          {rows.length === 0 ? (
            <div className="text-center py-14 text-slate-500 border border-slate-800 rounded-xl mb-6">
              No deliveries for this partner on {date}.
            </div>
          ) : (
            <>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      🔍
                    </span>
                    <input
                      type="text"
                      placeholder="Search customer, order, phone, items, status..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-white outline-none focus:border-teal-500"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <span className="text-sm text-slate-400 shrink-0">Sort by:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => {
                        setSortBy(e.target.value as typeof sortBy);
                        setCurrentPage(1);
                      }}
                      className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2.5 outline-none focus:border-teal-500"
                    >
                      <option value="sequence">Route order</option>
                      <option value="customer">Customer name</option>
                      <option value="slot">Delivery slot</option>
                      <option value="total">Order total</option>
                      <option value="collected">Collected amount</option>
                      <option value="pending">Pending amount</option>
                      <option value="status">Status</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
                        setCurrentPage(1);
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg px-3 py-2.5 border border-slate-700 text-sm font-medium"
                    >
                      {sortOrder === "desc" ? "↓ Desc" : "↑ Asc"}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Showing {filteredAndSorted.length} of {rows.length} deliveries
                </p>
              </div>

              {filteredAndSorted.length === 0 ? (
                <div className="text-center py-14 text-slate-500 border border-slate-800 rounded-xl mb-6">
                  No deliveries match your search.
                </div>
              ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300 min-w-[920px]">
                  <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Customer & order</th>
                      <th className="px-4 py-3 font-medium">Items</th>
                      <th className="px-4 py-3 font-medium text-right">Order total</th>
                      <th className="px-4 py-3 font-medium text-right">Collected</th>
                      <th className="px-4 py-3 font-medium">Mode</th>
                      <th className="px-4 py-3 font-medium">Full / Partial</th>
                      <th className="px-4 py-3 font-medium text-right">Pending</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {paginatedRows.map((a, idx) => {
                      const order = a.order || {};
                      const orderTotal = Number(order.total || 0);
                      const collected =
                        a.status === "delivered" ? Number(a.paymentCollected || 0) : 0;
                      const pending =
                        a.status === "delivered"
                          ? Math.max(0, orderTotal - collected)
                          : orderTotal;
                      const kind = collectionKind(a.paymentMethod);
                      const items = Array.isArray(order.items) ? order.items : [];
                      const rowNum = (currentPage - 1) * itemsPerPage + idx + 1;

                      return (
                        <tr key={a._id} className="hover:bg-slate-800/20 align-top">
                          <td className="px-4 py-4 text-slate-500">{rowNum}</td>
                          <td className="px-4 py-4">
                            <div className="font-bold text-white">{order.customer?.name || "Guest"}</div>
                            <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span className="font-mono">
                                #{String(order._id || "").slice(-6).toUpperCase()}
                              </span>
                              <BookingSourceBadge source={order.bookingSource} />
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {order.deliveryTime || "—"}
                              {order.address?.phone ? ` · ${order.address.phone}` : ""}
                              {order.address?.alternatePhone
                                ? ` · Alt ${order.address.alternatePhone}`
                                : ""}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {items.length === 0 ? (
                              <span className="text-slate-500">—</span>
                            ) : (
                              <ul className="space-y-1 text-xs">
                                {items.map((item: any, i: number) => (
                                  <li key={i}>
                                    <span className="text-slate-200">{item.productName || "Item"}</span>
                                    {item.cutName ? (
                                      <span className="text-slate-500"> ({item.cutName})</span>
                                    ) : null}
                                    <span className="text-slate-500">
                                      {" "}
                                      · {formatQuantityLabel(item.quantity, item.unit)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right font-semibold text-white">
                            ₹{orderTotal.toFixed(2)}
                          </td>
                          <td className="px-4 py-4 text-right font-semibold text-teal-300">
                            {a.status === "delivered" ? `₹${collected.toFixed(2)}` : "—"}
                          </td>
                          <td className="px-4 py-4">
                            {a.status !== "delivered" ? (
                              <span className="text-slate-500">—</span>
                            ) : kind === "cod" ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                COD
                              </span>
                            ) : kind === "upi" ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30">
                                UPI
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">{formatPaymentMethod(a.paymentMethod)}</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {a.status !== "delivered" ? (
                              <span className="text-slate-500">—</span>
                            ) : isFull(a.paymentMethod) ? (
                              <span className="text-emerald-400 text-xs font-bold">Full</span>
                            ) : isPartial(a.paymentMethod) ? (
                              <span className="text-amber-400 text-xs font-bold">Partial</span>
                            ) : (
                              <span className="text-xs text-slate-400">{formatPaymentMethod(a.paymentMethod)}</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span
                              className={
                                pending > 0.009 ? "text-amber-400 font-semibold" : "text-slate-500"
                              }
                            >
                              ₹{pending.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                a.status === "delivered"
                                  ? "bg-emerald-500/15 text-emerald-300"
                                  : a.status === "failed" || a.status === "cancelled"
                                    ? "bg-rose-500/15 text-rose-300"
                                    : "bg-slate-700/40 text-slate-300"
                              }`}
                            >
                              {String(a.status || "").replace(/_/g, " ")}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
              )}

              {filteredAndSorted.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 px-1">
                  <p className="text-sm text-slate-400">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(currentPage * itemsPerPage, filteredAndSorted.length)} of{" "}
                    {filteredAndSorted.length} deliveries
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-3 py-2 text-sm text-slate-300 font-medium">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 mb-8">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">Deliveries</div>
              <div className="text-2xl font-black text-white">{totals.deliveryCount}</div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
              <div className="text-[11px] uppercase tracking-wider text-emerald-400/80 font-bold mb-1">Total COD</div>
              <div className="text-2xl font-black text-emerald-400">₹{totals.totalCod.toFixed(2)}</div>
            </div>
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4">
              <div className="text-[11px] uppercase tracking-wider text-sky-400/80 font-bold mb-1">Total UPI</div>
              <div className="text-2xl font-black text-sky-400">₹{totals.totalUpi.toFixed(2)}</div>
            </div>
            <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-4">
              <div className="text-[11px] uppercase tracking-wider text-teal-400/80 font-bold mb-1">Collected</div>
              <div className="text-2xl font-black text-teal-300">₹{totals.totalCollected.toFixed(2)}</div>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
              <div className="text-[11px] uppercase tracking-wider text-purple-400/80 font-bold mb-1">Salary</div>
              <div className="text-2xl font-black text-purple-300">₹{salaryAmount.toFixed(2)}</div>
            </div>
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
              <div className="text-[11px] uppercase tracking-wider text-indigo-400/80 font-bold mb-1">Net (Coll − Sal)</div>
              <div className="text-2xl font-black text-indigo-300">₹{netAfterSalary.toFixed(2)}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-1">Order totals</div>
              <div className="text-2xl font-black text-white">₹{totals.totalOrderAmount.toFixed(2)}</div>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <div className="text-[11px] uppercase tracking-wider text-amber-400/80 font-bold mb-1">Pending</div>
              <div className="text-2xl font-black text-amber-400">₹{totals.totalPending.toFixed(2)}</div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Partner history (last 30 days)</h3>
              <p className="text-xs text-slate-500 mt-1">
                Past collections and salary paid — click a date row to open that day.
              </p>
            </div>
            {loadingHistory ? (
              <div className="py-10 text-center text-slate-500">Loading history...</div>
            ) : history.length === 0 ? (
              <div className="py-10 text-center text-slate-500">No past delivery history for this partner.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300 min-w-[760px]">
                  <thead className="bg-slate-800/50 text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium text-right">Delivered</th>
                      <th className="px-4 py-3 font-medium text-right">COD</th>
                      <th className="px-4 py-3 font-medium text-right">UPI</th>
                      <th className="px-4 py-3 font-medium text-right">Collected</th>
                      <th className="px-4 py-3 font-medium text-right">Salary</th>
                      <th className="px-4 py-3 font-medium text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {history.map((h) => (
                      <tr
                        key={h.date}
                        className={`hover:bg-slate-800/30 cursor-pointer ${h.date === date ? "bg-teal-500/5" : ""}`}
                        onClick={() => setDate(h.date)}
                      >
                        <td className="px-4 py-3 font-medium text-white">{h.date}</td>
                        <td className="px-4 py-3 text-right">{h.deliveredCount}/{h.deliveryCount}</td>
                        <td className="px-4 py-3 text-right text-emerald-400">₹{Number(h.codCollected).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-sky-400">₹{Number(h.upiCollected).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-teal-300 font-semibold">₹{Number(h.totalCollected).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-purple-300">₹{Number(h.salaryAmount).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-indigo-300 font-semibold">₹{Number(h.netAfterSalary).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </DashboardShell>
  );
}
