import { useEffect, useMemo, useRef, useState } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import { getTodayDeliveryStatus } from "../../lib/api";

function localTodayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatAddress(address?: any, short = false) {
  if (!address) return "-";
  if (short) {
    const line = [address.line1, address.area || address.line2].filter(Boolean).join(", ");
    return line || address.city || "-";
  }
  const parts = [address.line1, address.line2, address.city, address.postalCode].filter(Boolean);
  return parts.join(", ") || "-";
}

function formatPaymentMethod(method?: string) {
  switch (method) {
    case "cash":
      return "Full Cash";
    case "upi":
      return "Full UPI";
    case "partial_cash":
      return "Partial Cash";
    case "partial_upi":
      return "Partial UPI";
    case "pay_later":
      return "Pay Later";
    case "none":
      return "Paid/None";
    default:
      return method || "-";
  }
}

function stopTone(status: string) {
  switch (status) {
    case "delivered":
      return {
        dot: "bg-emerald-400",
        chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
        label: "Done"
      };
    case "en_route":
      return {
        dot: "bg-blue-400 animate-pulse",
        chip: "bg-blue-500/20 text-blue-200 border-blue-500/30",
        label: "En route"
      };
    case "picked_up":
      return {
        dot: "bg-sky-400 animate-pulse",
        chip: "bg-sky-500/20 text-sky-200 border-sky-500/30",
        label: "Picked up"
      };
    case "failed":
      return {
        dot: "bg-rose-400",
        chip: "bg-rose-500/15 text-rose-300 border-rose-500/25",
        label: "Failed"
      };
    case "cancelled":
      return {
        dot: "bg-rose-500",
        chip: "bg-rose-500/15 text-rose-300 border-rose-500/25",
        label: "Cancel"
      };
    default:
      return {
        dot: "bg-amber-400",
        chip: "bg-amber-500/15 text-amber-200 border-amber-500/25",
        label: "Queued"
      };
  }
}

function rankStyle(rank: number) {
  if (rank === 1) return "from-amber-300 to-yellow-500 text-amber-950 shadow-amber-500/30";
  if (rank === 2) return "from-slate-200 to-slate-400 text-slate-900 shadow-slate-400/20";
  if (rank === 3) return "from-orange-300 to-amber-600 text-orange-950 shadow-orange-500/20";
  return "from-slate-700 to-slate-800 text-slate-200";
}

function rankLabel(rank: number) {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `#${rank}`;
}

type RaceLane = {
  partnerId: string;
  partner: any;
  deliveries: any[];
  total: number;
  delivered: number;
  remaining: number;
  failed: number;
  ongoing: number;
  progress: number;
  currentStop: any | null;
  nextStop: any | null;
  rank: number;
};

export default function AdminTodayDeliveryStatus() {
  const { token } = useAuth();
  const [date] = useState(localTodayStr());
  const [assignments, setAssignments] = useState<any[]>([]);
  const [partnerSummaries, setPartnerSummaries] = useState<any[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    assigned: 0,
    ongoing: 0,
    delivered: 0,
    failed: 0,
    cancelled: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [focusedPartnerId, setFocusedPartnerId] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const fetchStatus = async (silent = false) => {
    if (!token) return;
    try {
      if (!silent) setLoading(true);
      setError("");
      const res = await getTodayDeliveryStatus(token, {
        date,
        partnerId: "all"
      });
      setAssignments(res.assignments || []);
      setPartnerSummaries(res.partnerSummaries || []);
      setCounts(
        res.counts || {
          total: 0,
          assigned: 0,
          ongoing: 0,
          delivered: 0,
          failed: 0,
          cancelled: 0
        }
      );
      setLastUpdated(new Date());
    } catch (err: any) {
      if (!silent) setError(err.message || "Failed to load delivery status");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchStatus(false);
    const interval = setInterval(() => fetchStatus(true), 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, date]);

  const raceLanes: RaceLane[] = useMemo(() => {
    const byPartner: Record<string, any[]> = {};
    assignments.forEach((a) => {
      const id = String(a.deliveryPartner?._id || a.deliveryPartner || "unknown");
      if (!byPartner[id]) byPartner[id] = [];
      byPartner[id].push(a);
    });

    Object.values(byPartner).forEach((list) => {
      list.sort((a, b) => {
        const seq = (a.sequence || 0) - (b.sequence || 0);
        if (seq !== 0) return seq;
        return String(a.order?.deliveryTime || "").localeCompare(String(b.order?.deliveryTime || ""));
      });
    });

    const summaryById = new Map(
      partnerSummaries.map((s) => [String(s.partner?._id || ""), s])
    );

    const lanes = Object.entries(byPartner).map(([partnerId, deliveries]) => {
      const summary = summaryById.get(partnerId);
      const partner = summary?.partner || deliveries[0]?.deliveryPartner || null;
      const delivered = deliveries.filter((a) => a.status === "delivered").length;
      const failed = deliveries.filter((a) => a.status === "failed" || a.status === "cancelled").length;
      const ongoing = deliveries.filter((a) => a.status === "en_route" || a.status === "picked_up").length;
      const remaining = deliveries.filter(
        (a) => !["delivered", "failed", "cancelled"].includes(a.status)
      ).length;
      const total = deliveries.length;
      const progress = total === 0 ? 0 : Math.round((delivered / total) * 100);

      const current =
        deliveries.find((a) => a.status === "en_route" || a.status === "picked_up") || null;
      const next =
        deliveries.find(
          (a) =>
            !["delivered", "failed", "cancelled"].includes(a.status) &&
            (!current || String(a._id) !== String(current._id))
        ) || null;

      return {
        partnerId,
        partner,
        deliveries,
        total,
        delivered,
        remaining,
        failed,
        ongoing,
        progress,
        currentStop: current,
        nextStop: next,
        rank: 0
      };
    });

    lanes.sort((a, b) => {
      if (b.progress !== a.progress) return b.progress - a.progress;
      if (b.delivered !== a.delivered) return b.delivered - a.delivered;
      if (a.remaining !== b.remaining) return a.remaining - b.remaining;
      return String(a.partner?.name || "").localeCompare(String(b.partner?.name || ""));
    });

    return lanes.map((lane, idx) => ({ ...lane, rank: idx + 1 }));
  }, [assignments, partnerSummaries]);

  const focusedLane = focusedPartnerId
    ? raceLanes.find((l) => l.partnerId === focusedPartnerId) || null
    : null;

  const scrollByLane = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 300, behavior: "smooth" });
  };

  return (
    <DashboardShell
      title="Today Delivery Race"
      description="Compare partners side by side — who is 1st, 2nd, 3rd on today's route."
      navLinks={ADMIN_NAV_LINKS}
    >
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Compact top bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            {date}
          </span>
          {lastUpdated && (
            <span className="text-slate-500">Live · {lastUpdated.toLocaleTimeString()}</span>
          )}
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Total {counts.total}</span>
          <span className="text-amber-300">Queued {counts.assigned}</span>
          <span className="text-blue-300">On road {counts.ongoing}</span>
          <span className="text-emerald-300">Done {counts.delivered}</span>
          <span className="text-rose-300">Fail {counts.failed + counts.cancelled}</span>
        </div>
        <button
          type="button"
          onClick={() => fetchStatus(false)}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs border border-slate-700"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
        </div>
      ) : raceLanes.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
          No deliveries assigned for today.
        </div>
      ) : (
        <>
          {/* Podium strip */}
          <div className="mb-3 flex flex-wrap gap-2 items-center">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mr-1">
              Leaderboard
            </span>
            {raceLanes.slice(0, 3).map((lane) => (
              <button
                key={lane.partnerId}
                type="button"
                onClick={() => {
                  setFocusedPartnerId(lane.partnerId);
                  const idx = raceLanes.findIndex((l) => l.partnerId === lane.partnerId);
                  scrollerRef.current?.scrollTo({ left: Math.max(0, idx * 280 - 40), behavior: "smooth" });
                }}
                className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-bold bg-gradient-to-r ${rankStyle(lane.rank)} shadow`}
              >
                {rankLabel(lane.rank)} {lane.partner?.name?.split(" ")[0] || "Partner"} · {lane.progress}%
              </button>
            ))}
          </div>

          {/* Race track scroller controls */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-white">
              Partner race lanes
              <span className="ml-2 text-slate-500 font-normal text-xs">swipe / scroll sideways to compare</span>
            </h2>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => scrollByLane(-1)}
                className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-white hover:bg-slate-700"
                aria-label="Scroll left"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => scrollByLane(1)}
                className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-white hover:bg-slate-700"
                aria-label="Scroll right"
              >
                ›
              </button>
            </div>
          </div>

          {/* Horizontal race lanes */}
          <div
            ref={scrollerRef}
            className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scroll-smooth [-ms-overflow-style:none] [scrollbar-width:thin]"
          >
            {raceLanes.map((lane) => {
              const isFocused = focusedPartnerId === lane.partnerId;
              const currentId = lane.currentStop ? String(lane.currentStop._id) : "";
              const nextId = lane.nextStop ? String(lane.nextStop._id) : "";

              return (
                <div
                  key={lane.partnerId}
                  onClick={() => setFocusedPartnerId(lane.partnerId)}
                  className={`snap-start shrink-0 w-[260px] sm:w-[280px] rounded-2xl border bg-slate-950/80 cursor-pointer transition-all ${
                    isFocused
                      ? "border-teal-400 shadow-[0_0_24px_rgba(45,212,191,0.2)]"
                      : "border-slate-800 hover:border-slate-600"
                  }`}
                >
                  {/* Lane header */}
                  <div className="p-3 border-b border-slate-800/80">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center justify-center min-w-[2.25rem] px-1.5 py-0.5 rounded-md text-[11px] font-black bg-gradient-to-r ${rankStyle(lane.rank)} shadow`}
                          >
                            {rankLabel(lane.rank)}
                          </span>
                          <span className="text-white font-bold text-sm truncate">
                            {lane.partner?.name || "Partner"}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 truncate">
                          {lane.partner?.phone || "-"}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-black text-teal-300 leading-none">{lane.progress}%</div>
                        <div className="text-[10px] text-slate-500">
                          {lane.delivered}/{lane.total}
                        </div>
                      </div>
                    </div>

                    {/* Progress race bar */}
                    <div className="relative h-2.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700/60">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-teal-500 via-emerald-400 to-lime-300 transition-all duration-700"
                        style={{ width: `${lane.progress}%` }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-teal-400 shadow transition-all duration-700"
                        style={{ left: `calc(${Math.min(lane.progress, 98)}% - 6px)` }}
                        title="Race marker"
                      />
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1 text-[10px] font-semibold">
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300">{lane.ongoing} on road</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">{lane.remaining} left</span>
                      {lane.failed > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300">{lane.failed} fail</span>
                      )}
                    </div>
                  </div>

                  {/* Now / Next compact */}
                  <div className="grid grid-cols-2 gap-px bg-slate-800/60">
                    <div className="bg-slate-950 p-2.5">
                      <div className="text-[9px] uppercase tracking-wider text-blue-300 font-bold mb-1">Now</div>
                      {lane.currentStop ? (
                        <>
                          <div className="text-xs text-white font-semibold truncate">
                            {lane.currentStop.order?.customer?.name || "Customer"}
                          </div>
                          <div className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                            {formatAddress(lane.currentStop.order?.address, true)}
                          </div>
                        </>
                      ) : (
                        <div className="text-[10px] text-slate-600">Waiting / between stops</div>
                      )}
                    </div>
                    <div className="bg-slate-950 p-2.5">
                      <div className="text-[9px] uppercase tracking-wider text-teal-300 font-bold mb-1">Next</div>
                      {lane.nextStop ? (
                        <>
                          <div className="text-xs text-white font-semibold truncate">
                            {lane.nextStop.order?.customer?.name || "Customer"}
                          </div>
                          <div className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                            {formatAddress(lane.nextStop.order?.address, true)}
                          </div>
                        </>
                      ) : (
                        <div className="text-[10px] text-slate-600">Finish line</div>
                      )}
                    </div>
                  </div>

                  {/* Compact stop checklist */}
                  <div className="p-2 max-h-[280px] overflow-y-auto space-y-1">
                    {lane.deliveries.map((a, index) => {
                      const tone = stopTone(a.status);
                      const isNow = String(a._id) === currentId;
                      const isNext = String(a._id) === nextId;
                      const order = a.order || {};

                      return (
                        <div
                          key={a._id}
                          className={`rounded-lg border px-2 py-1.5 ${
                            isNow
                              ? "border-blue-400/50 bg-blue-500/10"
                              : isNext
                                ? "border-teal-500/40 bg-teal-500/5"
                                : "border-slate-800/80 bg-slate-900/40"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${tone.dot}`} />
                            <span className="text-[10px] font-bold text-slate-500 w-4">{index + 1}</span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] text-white font-medium truncate">
                                  {order.customer?.name || `#${String(order._id || "").slice(-4)}`}
                                </span>
                                {isNow && (
                                  <span className="text-[8px] font-black uppercase px-1 rounded bg-blue-500 text-white animate-pulse">
                                    now
                                  </span>
                                )}
                                {isNext && !isNow && (
                                  <span className="text-[8px] font-black uppercase px-1 rounded bg-teal-500 text-teal-950">
                                    next
                                  </span>
                                )}
                              </div>
                              <div className="text-[9px] text-slate-500 truncate">
                                {order.deliveryTime || "-"} · #{String(order._id || "").slice(-4).toUpperCase()}
                              </div>
                            </div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${tone.chip}`}>
                              {tone.label}
                            </span>
                          </div>
                          {a.status === "delivered" && (
                            <div className="mt-1 pl-6 text-[9px] text-emerald-400/90">
                              {formatPaymentMethod(a.paymentMethod)} · ₹{Number(a.paymentCollected || 0).toFixed(0)}
                              {a.updatedAt ? ` · ${new Date(a.updatedAt).toLocaleTimeString()}` : ""}
                            </div>
                          )}
                          {(a.status === "failed" || a.status === "cancelled") && a.notes && (
                            <div className="mt-1 pl-6 text-[9px] text-rose-300/90 line-clamp-1">
                              {a.notes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Focused partner detail strip */}
          {focusedLane && (
            <div className="mt-4 rounded-xl border border-teal-500/20 bg-teal-500/5 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="text-sm text-white font-bold">
                  <span className={`inline-block mr-2 px-2 py-0.5 rounded text-[11px] font-black bg-gradient-to-r ${rankStyle(focusedLane.rank)}`}>
                    {rankLabel(focusedLane.rank)}
                  </span>
                  {focusedLane.partner?.name} — route detail
                </div>
                <button
                  type="button"
                  onClick={() => setFocusedPartnerId(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Clear focus
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-slate-950/70 border border-slate-800 p-2.5">
                  <div className="text-blue-300 font-bold uppercase tracking-wider text-[10px] mb-1">Currently going to</div>
                  {focusedLane.currentStop ? (
                    <>
                      <div className="text-white font-semibold">
                        {focusedLane.currentStop.order?.customer?.name || "Customer"}
                      </div>
                      <div className="text-slate-400 mt-0.5">
                        {formatAddress(focusedLane.currentStop.order?.address)}
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-500">Not marked en route right now</div>
                  )}
                </div>
                <div className="rounded-lg bg-slate-950/70 border border-slate-800 p-2.5">
                  <div className="text-teal-300 font-bold uppercase tracking-wider text-[10px] mb-1">Next stop</div>
                  {focusedLane.nextStop ? (
                    <>
                      <div className="text-white font-semibold">
                        {focusedLane.nextStop.order?.customer?.name || "Customer"}
                      </div>
                      <div className="text-slate-400 mt-0.5">
                        {formatAddress(focusedLane.nextStop.order?.address)}
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-500">No remaining stops — finish line</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardShell>
  );
}
