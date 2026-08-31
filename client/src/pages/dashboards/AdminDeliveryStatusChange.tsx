import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import {
  adminUpdateDeliveryPayment,
  getDeliveryPartners,
  getTodayDeliveryStatus
} from "../../lib/api";
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
      return "Full Paid (Cash)";
    case "upi":
      return "Full Paid (UPI)";
    case "partial_cash":
      return "Partial (Cash)";
    case "partial_upi":
      return "Partial (UPI)";
    case "pay_later":
      return "Not Paid / Pending";
    case "none":
      return "Already Paid / None";
    default:
      return method || "—";
  }
}

const money = (n: number) => `₹${Number(n).toFixed(2)}`;

export default function AdminDeliveryStatusChange() {
  const { token } = useAuth();
  const [date, setDate] = useState(localToday);
  const [partnerId, setPartnerId] = useState("");
  const [partners, setPartners] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("pay_later");
  const [paymentCollected, setPaymentCollected] = useState<number | "">("");
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    getDeliveryPartners(token)
      .then((res) => setPartners(res.deliveryPartners || []))
      .catch(() => setPartners([]));
  }, [token]);

  const loadAssignments = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError("");
      const res = await getTodayDeliveryStatus(token, {
        date,
        partnerId: partnerId || undefined
      });
      setAssignments(res.assignments || []);
    } catch (err: any) {
      setError(err.message || "Failed to load deliveries for this date.");
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [token, date, partnerId]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const deliveredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return assignments
      .filter((a) => a.status === "delivered")
      .filter((a) => {
        if (!q) return true;
        const customer = a.order?.customer?.name || "";
        const partner = a.deliveryPartner?.name || "";
        const orderId = String(a.order?._id || "");
        return (
          customer.toLowerCase().includes(q) ||
          partner.toLowerCase().includes(q) ||
          orderId.toLowerCase().includes(q)
        );
      });
  }, [assignments, searchQuery]);

  const openEdit = (assignment: any) => {
    setEditing(assignment);
    setPaymentMethod(assignment.paymentMethod || "pay_later");
    setPaymentCollected(
      assignment.paymentCollected > 0 ? Number(assignment.paymentCollected) : ""
    );
    setAdminNote("");
    setError("");
    setSuccess("");
  };

  const applyPaymentMethod = (method: string) => {
    setPaymentMethod(method);
    const total = Number(editing?.order?.total || 0);
    if (method === "cash" || method === "upi") {
      setPaymentCollected(total);
    } else if (method === "pay_later" || method === "none") {
      setPaymentCollected(0);
    } else if (method === "partial_cash" || method === "partial_upi") {
      setPaymentCollected("");
    }
  };

  const handleSave = async () => {
    if (!editing || !token) return;
    const orderTotal = Number(editing.order?.total || 0);
    let collected = Number(paymentCollected) || 0;

    if (paymentMethod === "cash" || paymentMethod === "upi") {
      collected = orderTotal;
    } else if (paymentMethod === "pay_later" || paymentMethod === "none") {
      collected = 0;
    } else if (paymentMethod === "partial_cash" || paymentMethod === "partial_upi") {
      if (!collected || collected <= 0) {
        setError("Enter the partial amount collected.");
        return;
      }
      if (collected >= orderTotal) {
        setError("Partial amount must be less than the order total.");
        return;
      }
    }

    try {
      setSaving(true);
      setError("");
      const res = await adminUpdateDeliveryPayment(token, editing._id, {
        paymentMethod,
        paymentCollected: collected,
        adminNote: adminNote.trim() || "Corrected by admin"
      });
      setSuccess(res.message || "Payment status updated.");
      setEditing(null);
      await loadAssignments();
    } catch (err: any) {
      setError(err.message || "Failed to update payment status.");
    } finally {
      setSaving(false);
    }
  };

  const editOrderTotal = Number(editing?.order?.total || 0);
  const editPending =
    editOrderTotal -
    (paymentMethod === "cash" || paymentMethod === "upi"
      ? editOrderTotal
      : paymentMethod === "pay_later" || paymentMethod === "none"
        ? 0
        : Number(paymentCollected) || 0);

  return (
    <DashboardShell
      title="Delivery Status Change"
      description="Fix payment collection mistakes when a partner marked full paid by accident. Updates customer pending balance automatically."
      navLinks={ADMIN_NAV_LINKS}
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-300 p-4 rounded-xl">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-teal-500/10 border border-teal-500/40 text-teal-300 p-4 rounded-xl">
            {success}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Delivery date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-slate-400 mb-1">Delivery partner</label>
            <select
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
            >
              <option value="">All partners</option>
              {partners.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-slate-400 mb-1">Search customer / partner</label>
            <input
              type="text"
              placeholder="e.g. Hemalatha or Jaga"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
            />
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-slate-400">Loading deliveries...</div>
          ) : deliveredRows.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              No delivered orders found for this date / filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-950/80 text-slate-400 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Partner</th>
                    <th className="px-4 py-3 text-left">Slot</th>
                    <th className="px-4 py-3 text-right">Order total</th>
                    <th className="px-4 py-3 text-right">Collected</th>
                    <th className="px-4 py-3 text-right">Pending</th>
                    <th className="px-4 py-3 text-left">Payment status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {deliveredRows.map((a) => {
                    const total = Number(a.order?.total || 0);
                    const collected = Number(a.paymentCollected || 0);
                    const pending = Math.max(0, total - collected);
                    return (
                      <tr key={a._id} className="hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-white font-medium">
                          {a.order?.customer?.name || "—"}
                          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                            #{String(a.order?._id || "").slice(-6).toUpperCase()}
                            <BookingSourceBadge source={a.order?.bookingSource} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {a.deliveryPartner?.name || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-400">{a.order?.deliveryTime || "—"}</td>
                        <td className="px-4 py-3 text-right text-white font-semibold">
                          {money(total)}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-400">
                          {money(collected)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {pending > 0 ? (
                            <span className="text-amber-300 font-bold">{money(pending)}</span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {formatPaymentMethod(a.paymentMethod)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openEdit(a)}
                            className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/30 font-medium py-1.5 px-3 rounded-lg text-xs"
                          >
                            Change payment
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500 max-w-3xl">
          Example: Jaga marked Hemalatha&apos;s order as full paid by mistake. Pick date{" "}
          <strong className="text-slate-400">2026-08-30</strong>, find the row, click{" "}
          <strong className="text-slate-400">Change payment</strong>, set{" "}
          <strong className="text-slate-400">Not Paid / Pending</strong>. Customer pending balance
          will increase automatically.
        </p>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Fix payment collection</h3>
                <p className="text-sm text-slate-400 mt-1">
                  {editing.order?.customer?.name} · Partner: {editing.deliveryPartner?.name}
                </p>
                <p className="text-teal-300 font-bold mt-1">Order total: {money(editOrderTotal)}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">
                  Payment status
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => applyPaymentMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white"
                >
                  <option value="cash">Full Paid (Cash)</option>
                  <option value="upi">Full Paid (UPI)</option>
                  <option value="partial_cash">Partial Payment (Cash)</option>
                  <option value="partial_upi">Partial Payment (UPI)</option>
                  <option value="pay_later">Not Paid / Pending (full amount)</option>
                  <option value="none">Already Paid / None</option>
                </select>
              </div>

              {(paymentMethod === "partial_cash" || paymentMethod === "partial_upi") && (
                <div>
                  <label className="block text-xs text-amber-300 mb-1 font-bold">
                    Amount collected (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={paymentCollected}
                    onChange={(e) =>
                      setPaymentCollected(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    className="w-full bg-slate-950 border border-amber-500/40 rounded-lg px-3 py-2.5 text-white font-bold"
                  />
                </div>
              )}

              <div className="rounded-lg bg-slate-950 border border-slate-800 p-3 text-sm space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Will show as collected</span>
                  <span className="text-emerald-400 font-bold">
                    {money(
                      paymentMethod === "cash" || paymentMethod === "upi"
                        ? editOrderTotal
                        : paymentMethod === "pay_later" || paymentMethod === "none"
                          ? 0
                          : Number(paymentCollected) || 0
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Customer pending after save</span>
                  <span className="text-amber-300 font-bold">
                    {money(Math.max(0, editPending))}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Reason (optional)</label>
                <input
                  type="text"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="e.g. Partner marked full paid by mistake"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="w-full bg-teal-500 hover:bg-teal-400 text-white font-bold py-3 rounded-xl disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save payment status"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
