import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import {
  adminDeleteDeliveryTrip,
  adminEndDeliveryTrip,
  adminGetDeliveryTripsDay,
  adminReopenDeliveryTrip,
  adminSetDeliveryStatus,
  adminStartDeliveryTrip,
  adminUpdateDeliveryTrip,
  getTodayDeliveryStatus,
  type AdminTripPartnerRow,
  type DeliveryTripPayload
} from "../../lib/api";

const istToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

const money = (n: number) => `₹${Number(n || 0).toFixed(2)}`;

const timeOf = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "—";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Full Paid (Cash)",
  upi: "Full Paid (UPI)",
  partial_cash: "Partial (Cash)",
  partial_upi: "Partial (UPI)",
  pay_later: "Not Paid / Pending",
  none: "Already Paid / None"
};

const STATUS_LABELS: Record<string, string> = {
  assigned: "Assigned",
  picked_up: "Picked up",
  en_route: "On the way",
  delivered: "Delivered",
  failed: "Failed",
  cancelled: "Cancelled"
};

const statusTone = (status: string) => {
  switch (status) {
    case "delivered":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "failed":
      return "bg-rose-500/15 text-rose-300 border-rose-500/30";
    case "en_route":
    case "picked_up":
      return "bg-blue-500/15 text-blue-300 border-blue-500/30";
    case "cancelled":
      return "bg-slate-700/40 text-slate-400 border-slate-600";
    default:
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  }
};

const tripTone = (status: string) =>
  status === "active"
    ? "bg-teal-500/15 text-teal-300 border-teal-500/40"
    : status === "auto_ended"
      ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
      : "bg-slate-800 text-slate-300 border-slate-700";

type TripAction =
  | { kind: "start"; partner: AdminTripPartnerRow["partner"]; nextNumber: number }
  | { kind: "end" | "reopen" | "delete"; partnerName: string; trip: DeliveryTripPayload };

export default function AdminDeliveryTripsControl() {
  const { token } = useAuth();
  const [date, setDate] = useState(istToday);
  const [rows, setRows] = useState<AdminTripPartnerRow[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [maxTrips, setMaxTrips] = useState(3);
  const [isToday, setIsToday] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [tripAction, setTripAction] = useState<TripAction | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [busy, setBusy] = useState(false);

  const [kmTrip, setKmTrip] = useState<DeliveryTripPayload | null>(null);
  const [kmValue, setKmValue] = useState<number | "">("");
  const [kmNote, setKmNote] = useState("");

  const [editing, setEditing] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState<"assigned" | "en_route" | "delivered" | "failed">(
    "delivered"
  );
  const [payMethod, setPayMethod] = useState("pay_later");
  const [partialAmount, setPartialAmount] = useState<number | "">("");
  const [statusNote, setStatusNote] = useState("");

  const load = useCallback(
    async (silent = false) => {
      if (!token) return;
      try {
        if (!silent) setLoading(true);
        const [tripsRes, statusRes] = await Promise.all([
          adminGetDeliveryTripsDay(token, date),
          getTodayDeliveryStatus(token, { date })
        ]);
        setRows(tripsRes.partners || []);
        setMaxTrips(tripsRes.maxTrips || 3);
        setIsToday(Boolean(tripsRes.isToday));
        setAssignments(statusRes.assignments || []);
        if (!silent) setError("");
      } catch (err: any) {
        if (!silent) setError(err.message || "Failed to load delivery trips.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [token, date]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isToday) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") load(true);
    }, 20000);
    return () => window.clearInterval(id);
  }, [isToday, load]);

  const assignmentsByPartner = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const a of assignments) {
      const pId = String(a.deliveryPartner?._id || a.deliveryPartner || "");
      if (!pId) continue;
      if (!map[pId]) map[pId] = [];
      map[pId].push(a);
    }
    return map;
  }, [assignments]);

  const visibleRows = useMemo(() => {
    const list = partnerFilter === "all" ? rows : rows.filter((r) => r.partner._id === partnerFilter);
    return [...list].sort((a, b) => {
      if (a.hasActiveTrip !== b.hasActiveTrip) return a.hasActiveTrip ? -1 : 1;
      const aCount = assignmentsByPartner[a.partner._id]?.length || 0;
      const bCount = assignmentsByPartner[b.partner._id]?.length || 0;
      if (aCount !== bCount) return bCount - aCount;
      return a.partner.name.localeCompare(b.partner.name);
    });
  }, [rows, partnerFilter, assignmentsByPartner]);

  const totals = useMemo(() => {
    const running = rows.filter((r) => r.hasActiveTrip).length;
    const tripsCount = rows.reduce((s, r) => s + r.tripsUsed, 0);
    const km = rows.reduce((s, r) => s + Number(r.totalKm || 0), 0);
    return { running, tripsCount, km };
  }, [rows]);

  const flash = (msg: string) => {
    setSuccess(msg);
    setError("");
    window.setTimeout(() => setSuccess((cur) => (cur === msg ? "" : cur)), 5000);
  };

  const runTripAction = async () => {
    if (!token || !tripAction) return;
    try {
      setBusy(true);
      const note = actionNote.trim() || undefined;
      let message = "";
      if (tripAction.kind === "start") {
        message = (await adminStartDeliveryTrip(token, tripAction.partner._id, note)).message;
      } else if (tripAction.kind === "end") {
        message = (await adminEndDeliveryTrip(token, tripAction.trip.id, note)).message;
      } else if (tripAction.kind === "reopen") {
        message = (await adminReopenDeliveryTrip(token, tripAction.trip.id, note)).message;
      } else {
        message = (await adminDeleteDeliveryTrip(token, tripAction.trip.id)).message;
      }
      setTripAction(null);
      setActionNote("");
      flash(message);
      await load(true);
    } catch (err: any) {
      setError(err.message || "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const openKm = (trip: DeliveryTripPayload) => {
    setKmTrip(trip);
    setKmValue(Number(trip.totalKm || 0));
    setKmNote("");
  };

  const saveKm = async (reset = false) => {
    if (!token || !kmTrip) return;
    try {
      setBusy(true);
      const res = await adminUpdateDeliveryTrip(
        token,
        kmTrip.id,
        reset
          ? { resetKm: true, note: kmNote.trim() || undefined }
          : { totalKm: Number(kmValue) || 0, note: kmNote.trim() || undefined }
      );
      setKmTrip(null);
      flash(res.message);
      await load(true);
    } catch (err: any) {
      setError(err.message || "Could not update km.");
    } finally {
      setBusy(false);
    }
  };

  const openStatusEdit = (a: any) => {
    setEditing(a);
    const current = a.status === "picked_up" ? "en_route" : a.status;
    setNewStatus(
      ["assigned", "en_route", "delivered", "failed"].includes(current) ? current : "delivered"
    );
    setPayMethod(a.paymentMethod && a.paymentMethod !== "none" ? a.paymentMethod : "pay_later");
    setPartialAmount(
      a.paymentMethod?.startsWith("partial") && a.paymentCollected > 0
        ? Number(a.paymentCollected)
        : ""
    );
    setStatusNote("");
    setError("");
  };

  const editTotal = Number(editing?.order?.total || 0);
  const editCollected =
    newStatus !== "delivered"
      ? 0
      : payMethod === "cash" || payMethod === "upi"
        ? editTotal
        : payMethod === "partial_cash" || payMethod === "partial_upi"
          ? Number(partialAmount) || 0
          : 0;

  const saveStatus = async () => {
    if (!token || !editing) return;
    if (newStatus === "failed" && !statusNote.trim()) {
      setError("Enter a reason for failed delivery.");
      return;
    }
    if (newStatus === "delivered" && payMethod.startsWith("partial")) {
      const amt = Number(partialAmount) || 0;
      if (amt <= 0 || amt >= editTotal) {
        setError("Partial amount must be more than 0 and less than the order total.");
        return;
      }
    }
    try {
      setBusy(true);
      const res = await adminSetDeliveryStatus(token, editing._id, {
        status: newStatus,
        ...(newStatus === "delivered"
          ? { paymentMethod: payMethod, paymentCollected: editCollected }
          : {}),
        adminNote: statusNote.trim() || undefined
      });
      setEditing(null);
      flash(res.message);
      await load(true);
    } catch (err: any) {
      setError(err.message || "Could not update delivery.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardShell
      title="Delivery Trips Control"
      description="Start or end a partner's trip, fix trip km, and correct delivery status or payment when a partner has an issue."
      navLinks={ADMIN_NAV_LINKS}
    >
      <div className="space-y-5">
        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-300 p-3 sm:p-4 rounded-xl text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-teal-500/10 border border-teal-500/40 text-teal-300 p-3 sm:p-4 rounded-xl text-sm">
            {success}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:flex gap-3 sm:items-end">
            <div className="min-w-0">
              <label className="block text-xs text-slate-400 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value || istToday())}
                className="w-full min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 sm:py-2 text-white text-base sm:text-sm"
              />
            </div>
            <div className="min-w-0 sm:min-w-[200px]">
              <label className="block text-xs text-slate-400 mb-1">Partner</label>
              <select
                value={partnerFilter}
                onChange={(e) => setPartnerFilter(e.target.value)}
                className="w-full min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 sm:py-2 text-white text-base sm:text-sm"
              >
                <option value="all">All partners</option>
                {rows.map((r) => (
                  <option key={r.partner._id} value={r.partner._id}>
                    {r.partner.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={() => load()}
            className="w-full sm:w-auto sm:ml-auto px-4 py-2.5 sm:py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700"
          >
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3">
            <div className="text-[11px] text-slate-400 uppercase tracking-wide">Running now</div>
            <div className="text-xl sm:text-2xl font-black text-teal-300">{totals.running}</div>
          </div>
          <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3">
            <div className="text-[11px] text-slate-400 uppercase tracking-wide">Trips</div>
            <div className="text-xl sm:text-2xl font-black text-white">{totals.tripsCount}</div>
          </div>
          <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3">
            <div className="text-[11px] text-slate-400 uppercase tracking-wide">Total km</div>
            <div className="text-xl sm:text-2xl font-black text-amber-300">
              {totals.km.toFixed(1)}
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Each partner can do up to {maxTrips} trips a day. Running trips close automatically at
          10:00 PM IST. {isToday ? "This page refreshes every 20 seconds." : "Past date: you can fix km and deliveries, but not start trips."}
        </p>

        {loading ? (
          <div className="p-10 text-center text-slate-400">Loading…</div>
        ) : visibleRows.length === 0 ? (
          <div className="p-10 text-center text-slate-400 bg-slate-900/50 border border-slate-800 rounded-2xl">
            No delivery partners found.
          </div>
        ) : (
          <div className="space-y-4">
            {visibleRows.map((row) => {
              const pId = row.partner._id;
              const deliveries = [...(assignmentsByPartner[pId] || [])].sort(
                (a, b) => (a.sequence || 0) - (b.sequence || 0)
              );
              const pendingCount = deliveries.filter(
                (a) => !["delivered", "failed", "cancelled"].includes(a.status)
              ).length;
              const activeTrip = row.trips.find((t) => t.status === "active");
              const canStart = isToday && !activeTrip && row.tripsUsed < maxTrips;
              const showDeliveries = expanded[pId] ?? deliveries.length > 0;

              return (
                <div
                  key={pId}
                  className={`rounded-2xl border p-3 sm:p-5 min-w-0 ${
                    activeTrip
                      ? "border-teal-500/40 bg-teal-500/5"
                      : "border-slate-800 bg-slate-900/50"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base sm:text-lg font-bold text-white truncate max-w-full">
                          {row.partner.name}
                        </h3>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                          {row.tripsUsed}/{maxTrips} trips
                        </span>
                        {activeTrip ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-200 font-semibold">
                            Trip {activeTrip.tripNumber} running
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {row.partner.phone || "—"} · {Number(row.totalKm || 0).toFixed(2)} km ·{" "}
                        {deliveries.length} deliveries ({pendingCount} pending)
                      </div>
                      {activeTrip?.lastLocationLabel ? (
                        <div className="text-xs text-slate-500 mt-1 truncate">
                          Last seen: {activeTrip.lastLocationLabel} at{" "}
                          {timeOf(activeTrip.lastCapturedAt)}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto shrink-0">
                      {activeTrip ? (
                        <button
                          type="button"
                          onClick={() =>
                            setTripAction({
                              kind: "end",
                              partnerName: row.partner.name,
                              trip: activeTrip
                            })
                          }
                          className="flex-1 sm:flex-none px-4 py-3 sm:py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm"
                        >
                          End trip {activeTrip.tripNumber}
                        </button>
                      ) : null}
                      {canStart ? (
                        <button
                          type="button"
                          onClick={() =>
                            setTripAction({
                              kind: "start",
                              partner: row.partner,
                              nextNumber: row.tripsUsed + 1
                            })
                          }
                          className="flex-1 sm:flex-none px-4 py-3 sm:py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-bold text-sm"
                        >
                          Start trip {row.tripsUsed + 1}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {row.trips.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      {row.trips.map((t) => (
                        <div
                          key={t.id}
                          className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-4 min-w-0"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <span className="text-sm font-bold text-white">Trip {t.tripNumber}</span>
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full border ${tripTone(t.status)}`}
                            >
                              {t.status === "auto_ended" ? "auto ended (10 PM)" : t.status}
                            </span>
                            <span className="text-xs text-slate-400">
                              {timeOf(t.startedAt)} → {t.status === "active" ? "now" : timeOf(t.endedAt)}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 md:flex-1 min-w-0">
                            <span className="text-amber-300 font-semibold">
                              {Number(t.totalKm || 0).toFixed(2)} km
                            </span>
                            {t.manualKm ? " (set by admin)" : ` · ${t.pointCount} GPS pts`}
                            {t.startedBy === "admin" ? " · started by admin" : ""}
                            {t.endedBy === "admin" ? " · ended by admin" : ""}
                            {t.adminNotes ? (
                              <div className="text-[11px] text-slate-500 mt-0.5 break-words">
                                {t.adminNotes}
                              </div>
                            ) : null}
                          </div>
                          <div className="grid grid-cols-3 md:flex gap-1.5 [&>button]:py-2 md:[&>button]:py-1 [&>button]:text-center">
                            {t.status === "active" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setTripAction({ kind: "end", partnerName: row.partner.name, trip: t })
                                }
                                className="px-2.5 py-1 rounded-lg text-xs bg-amber-500/15 border border-amber-500/30 text-amber-200"
                              >
                                End
                              </button>
                            ) : isToday && !activeTrip ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setTripAction({ kind: "reopen", partnerName: row.partner.name, trip: t })
                                }
                                className="px-2.5 py-1 rounded-lg text-xs bg-teal-500/15 border border-teal-500/30 text-teal-200"
                              >
                                Reopen
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => openKm(t)}
                              className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-200"
                            >
                              Edit km
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setTripAction({ kind: "delete", partnerName: row.partner.name, trip: t })
                              }
                              className="px-2.5 py-1 rounded-lg text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-500">No trips on this date.</p>
                  )}

                  {deliveries.length > 0 ? (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => setExpanded((prev) => ({ ...prev, [pId]: !showDeliveries }))}
                        className="text-sm sm:text-xs font-semibold text-slate-300 hover:text-white py-1"
                      >
                        {showDeliveries ? "▾" : "▸"} Deliveries ({deliveries.length})
                      </button>
                      {showDeliveries ? (
                        <div className="mt-2 divide-y divide-slate-800 rounded-xl border border-slate-800 overflow-hidden">
                          {deliveries.map((a, idx) => {
                            const total = Number(a.order?.total || 0);
                            const collected = Number(a.paymentCollected || 0);
                            const pending =
                              a.status === "delivered" ? Math.max(0, total - collected) : total;
                            return (
                              <div
                                key={a._id}
                                className="p-3 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                              >
                                <div className="min-w-0 sm:flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs text-slate-500">#{a.sequence || idx + 1}</span>
                                    <span className="text-sm font-semibold text-white truncate">
                                      {a.order?.customer?.name || "Customer"}
                                    </span>
                                    <span
                                      className={`text-[11px] px-2 py-0.5 rounded-full border ${statusTone(a.status)}`}
                                    >
                                      {STATUS_LABELS[a.status] || a.status}
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-400 mt-0.5 break-words">
                                    {a.order?.deliveryTime || "—"} · Total {money(total)}
                                    {a.status === "delivered" ? (
                                      <>
                                        {" "}
                                        · Collected{" "}
                                        <span className="text-emerald-400">{money(collected)}</span> ·{" "}
                                        {PAYMENT_LABELS[a.paymentMethod] || a.paymentMethod}
                                        {pending > 0 ? (
                                          <span className="text-amber-300"> · Due {money(pending)}</span>
                                        ) : null}
                                      </>
                                    ) : null}
                                  </div>
                                </div>
                                {a.status !== "cancelled" ? (
                                  <button
                                    type="button"
                                    onClick={() => openStatusEdit(a)}
                                    className="w-full sm:w-auto shrink-0 px-3 py-2.5 sm:py-1.5 rounded-lg text-sm sm:text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200"
                                  >
                                    Change status / payment
                                  </button>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {tripAction && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl max-h-[92vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white">
              {tripAction.kind === "start"
                ? `Start trip ${tripAction.nextNumber} for ${tripAction.partner.name}?`
                : tripAction.kind === "end"
                  ? `End trip ${tripAction.trip.tripNumber} for ${tripAction.partnerName}?`
                  : tripAction.kind === "reopen"
                    ? `Reopen trip ${tripAction.trip.tripNumber} for ${tripAction.partnerName}?`
                    : `Delete trip ${tripAction.trip.tripNumber} for ${tripAction.partnerName}?`}
            </h3>
            <p className="text-sm text-slate-400 mt-2">
              {tripAction.kind === "start"
                ? "Use this when the partner cannot start from their phone. GPS km will record once their app is open."
                : tripAction.kind === "end"
                  ? "The trip stops recording GPS. The partner can start the next trip if slots remain."
                  : tripAction.kind === "reopen"
                    ? "Use this if the partner ended the trip by mistake. GPS recording resumes."
                    : "Removes this trip and its km. Use only for trips started by mistake — the partner gets that trip slot back."}
            </p>
            {tripAction.kind !== "delete" ? (
              <input
                type="text"
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="Reason (optional), e.g. phone battery dead"
                className="mt-4 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-base sm:text-sm"
              />
            ) : null}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setTripAction(null);
                  setActionNote("");
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={runTripAction}
                className={`flex-1 py-2.5 rounded-xl font-bold disabled:opacity-50 ${
                  tripAction.kind === "delete"
                    ? "bg-rose-500 hover:bg-rose-400 text-white"
                    : tripAction.kind === "end"
                      ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                      : "bg-teal-500 hover:bg-teal-400 text-white"
                }`}
              >
                {busy ? "…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {kmTrip && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-bold text-white">Edit km — Trip {kmTrip.tripNumber}</h3>
              <button type="button" onClick={() => setKmTrip(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              For GPS problems. Petrol allowance uses this km.
            </p>
            <label className="block text-xs text-slate-400 mt-4 mb-1">Total km</label>
            <input
              type="number"
              min={0}
              step="0.1"
              value={kmValue}
              onChange={(e) => setKmValue(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white font-bold"
            />
            <input
              type="text"
              value={kmNote}
              onChange={(e) => setKmNote(e.target.value)}
              placeholder="Reason (optional)"
              className="mt-3 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-base sm:text-sm"
            />
            <div className="mt-5 flex flex-col sm:flex-row gap-2">
              {kmTrip.manualKm ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => saveKm(true)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-semibold disabled:opacity-50"
                >
                  Reset to GPS km
                </button>
              ) : null}
              <button
                type="button"
                disabled={busy || kmValue === ""}
                onClick={() => saveKm(false)}
                className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-bold disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save km"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Change delivery</h3>
                <p className="text-sm text-slate-400 mt-1">
                  {editing.order?.customer?.name} · Partner: {editing.deliveryPartner?.name}
                </p>
                <p className="text-teal-300 font-bold mt-1">Order total: {money(editTotal)}</p>
              </div>
              <button type="button" onClick={() => setEditing(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            {error ? (
              <div className="mb-3 bg-red-500/10 border border-red-500/40 text-red-300 p-2.5 rounded-lg text-sm">
                {error}
              </div>
            ) : null}

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["assigned", "en_route", "delivered", "failed"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNewStatus(s)}
                      className={`py-2.5 sm:py-2 rounded-lg text-sm font-semibold border ${
                        newStatus === s
                          ? statusTone(s)
                          : "bg-slate-950 border-slate-700 text-slate-400"
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {newStatus === "delivered" ? (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">
                      Payment
                    </label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white"
                    >
                      {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {payMethod.startsWith("partial") ? (
                    <div>
                      <label className="block text-xs text-amber-300 mb-1 font-bold">
                        Amount collected (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={partialAmount}
                        onChange={(e) =>
                          setPartialAmount(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        className="w-full bg-slate-950 border border-amber-500/40 rounded-lg px-3 py-2.5 text-white font-bold"
                      />
                    </div>
                  ) : null}
                  <div className="rounded-lg bg-slate-950 border border-slate-800 p-3 text-sm space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Collected by partner</span>
                      <span className="text-emerald-400 font-bold">{money(editCollected)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Customer pending for this order</span>
                      <span className="text-amber-300 font-bold">
                        {money(Math.max(0, editTotal - editCollected))}
                      </span>
                    </div>
                  </div>
                </>
              ) : editing.status === "delivered" ? (
                <p className="text-xs text-amber-300/90">
                  Moving away from Delivered clears the collected amount and removes this order&apos;s
                  due from the customer&apos;s pending balance.
                </p>
              ) : null}

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Reason {newStatus === "failed" ? "(required)" : "(optional)"}
                </label>
                <input
                  type="text"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="e.g. Partner phone switched off, updated by admin"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-base sm:text-sm"
                />
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={saveStatus}
                className="w-full bg-teal-500 hover:bg-teal-400 text-white font-bold py-3 rounded-xl disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
