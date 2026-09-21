import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import { adminReorderAssignments, getAdminProducts, getTodayDeliveryStatus } from "../../lib/api";

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

function getCategoryColor(category: string) {
  switch (category) {
    case "Chicken":
      return "text-rose-300 bg-rose-500/15 border-rose-500/30";
    case "Country Chicken":
      return "text-orange-300 bg-orange-500/15 border-orange-500/30";
    case "Mutton":
      return "text-purple-300 bg-purple-500/15 border-purple-500/30";
    case "Seafood":
      return "text-blue-300 bg-blue-500/15 border-blue-500/30";
    case "Fish":
      return "text-teal-300 bg-teal-500/15 border-teal-500/30";
    default:
      return "text-slate-300 bg-slate-500/15 border-slate-500/30";
  }
}

function categoriesForOrder(order: any, categoryMap: Record<string, string>) {
  const set = new Set<string>();
  for (const item of order?.items || []) {
    const fromItem = String(item.category || "").trim();
    const fromMap = categoryMap[String(item.product || "")] || "";
    const cat = fromItem || fromMap;
    if (cat) set.add(cat);
  }
  const preferred = ["Fish", "Seafood", "Chicken", "Country Chicken", "Mutton"];
  const list = [...set];
  list.sort((a, b) => {
    const ia = preferred.indexOf(a);
    const ib = preferred.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return list;
}

type PartnerLane = {
  partnerId: string;
  partner: any;
  deliveries: any[];
};

function OrderCard({
  assignment,
  index,
  partnerId,
  total,
  categoryMap,
  onDragStart,
  onDragOver,
  onDrop,
  onMove,
  isDragging,
  isDropTarget,
  disabled
}: {
  assignment: any;
  index: number;
  partnerId: string;
  total: number;
  categoryMap: Record<string, string>;
  onDragStart: (partnerId: string, index: number) => void;
  onDragOver: (e: DragEvent, partnerId: string, index: number) => void;
  onDrop: (partnerId: string, index: number) => void;
  onMove: (partnerId: string, index: number, direction: "up" | "down") => void;
  isDragging: boolean;
  isDropTarget: boolean;
  disabled?: boolean;
}) {
  const tone = stopTone(assignment.status || "assigned");
  const order = assignment.order || {};
  const customerName =
    order.customer?.name ||
    order.customerName ||
    (order._id ? `#${String(order._id).slice(-4)}` : "Customer");
  const categories = categoriesForOrder(order, categoryMap);

  return (
    <div
      draggable={!disabled}
      onDragStart={() => !disabled && onDragStart(partnerId, index)}
      onDragOver={(e) => !disabled && onDragOver(e, partnerId, index)}
      onDrop={() => !disabled && onDrop(partnerId, index)}
      className={`rounded-xl border bg-slate-950/70 px-3 py-2.5 cursor-grab active:cursor-grabbing touch-manipulation transition-colors ${
        isDragging
          ? "opacity-50 border-teal-400/40"
          : isDropTarget
            ? "border-teal-400/60 bg-teal-500/5"
            : "border-slate-700/70 hover:border-slate-600"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="mt-0.5 shrink-0 rounded-md border border-slate-700 bg-slate-900 px-1.5 py-2 text-slate-400"
          aria-hidden
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 4a1 1 0 110 2 1 1 0 010-2zm6 0a1 1 0 110 2 1 1 0 010-2zM7 9a1 1 0 110 2 1 1 0 010-2zm6 0a1 1 0 110 2 1 1 0 010-2zm-6 5a1 1 0 110 2 1 1 0 010-2zm6 0a1 1 0 110 2 1 1 0 010-2z" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-slate-500 tabular-nums w-5">{index + 1}</span>
            <span className={`w-2 h-2 rounded-full shrink-0 ${tone.dot}`} />
            <span className="text-sm font-semibold text-white truncate">{customerName}</span>
            <span
              className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded border ${tone.chip}`}
            >
              {tone.label}
            </span>
          </div>
          {categories.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {categories.map((cat) => (
                <span
                  key={cat}
                  className={`inline-block px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wide rounded border ${getCategoryColor(cat)}`}
                >
                  {cat}
                </span>
              ))}
            </div>
          ) : (
            <div className="mt-1 text-[10px] text-slate-600">No category</div>
          )}
          <div className="mt-1 text-[11px] text-slate-400 truncate">
            Slot {order.deliveryTime || "—"} · #{String(order._id || "").slice(-4) || "----"}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500 truncate">
            {formatAddress(order.address, true)}
          </div>
          {order.customer?.phone || order.customerPhone ? (
            <div className="mt-0.5 text-[11px] text-slate-500">
              {order.customer?.phone || order.customerPhone}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 flex flex-col gap-1">
          <button
            type="button"
            disabled={disabled || index === 0}
            onClick={() => onMove(partnerId, index, "up")}
            className="p-1 rounded border border-slate-700 text-slate-400 hover:text-teal-300 disabled:opacity-30"
            aria-label="Move up"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            disabled={disabled || index >= total - 1}
            onClick={() => onMove(partnerId, index, "down")}
            className="p-1 rounded border border-slate-700 text-slate-400 hover:text-teal-300 disabled:opacity-30"
            aria-label="Move down"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function PartnerOrderColumn({
  lane,
  categoryMap,
  onReorder,
  savingPartnerId
}: {
  lane: PartnerLane;
  categoryMap: Record<string, string>;
  onReorder: (partnerId: string, nextDeliveries: any[]) => Promise<void>;
  savingPartnerId: string | null;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const isSaving = savingPartnerId === lane.partnerId;
  const partnerName = lane.partner?.name || "Unknown partner";
  const phone = lane.partner?.phone || "";

  const handleDragStart = (_partnerId: string, index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: DragEvent, _partnerId: string, index: number) => {
    e.preventDefault();
    if (overIndex !== index) setOverIndex(index);
  };

  const handleDrop = async (_partnerId: string, dropIndex: number) => {
    if (dragIndex == null || dragIndex === dropIndex) {
      setDragIndex(null);
      setOverIndex(null);
      return;
    }
    const next = [...lane.deliveries];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, moved);
    const withSeq = next.map((d, i) => ({ ...d, sequence: i }));
    setDragIndex(null);
    setOverIndex(null);
    await onReorder(lane.partnerId, withSeq);
  };

  const handleMove = async (_partnerId: string, index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= lane.deliveries.length) return;
    const next = [...lane.deliveries];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    await onReorder(
      lane.partnerId,
      next.map((d, i) => ({ ...d, sequence: i }))
    );
  };

  return (
    <div className="shrink-0 w-[300px] sm:w-[320px] rounded-2xl border border-slate-800 bg-slate-900/80 flex flex-col max-h-[min(78vh,820px)]">
      <div className="shrink-0 px-4 py-3 border-b border-slate-800">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate">{partnerName}</h3>
            {phone ? <p className="text-[11px] text-slate-500 truncate">{phone}</p> : null}
          </div>
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
            {lane.deliveries.length} stop{lane.deliveries.length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="mt-2 text-[10px] text-slate-500">
          Drag cards (or use ↑↓) to set route order
          {isSaving ? <span className="text-teal-400"> · Saving…</span> : null}
        </p>
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-2"
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setOverIndex(null)}
        onDrop={() => {
          setDragIndex(null);
          setOverIndex(null);
        }}
      >
        {lane.deliveries.length === 0 ? (
          <div className="text-center text-xs text-slate-500 py-8">No deliveries assigned</div>
        ) : (
          lane.deliveries.map((assignment, index) => (
            <OrderCard
              key={String(assignment._id)}
              assignment={assignment}
              index={index}
              partnerId={lane.partnerId}
              total={lane.deliveries.length}
              categoryMap={categoryMap}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onMove={handleMove}
              isDragging={dragIndex === index}
              isDropTarget={overIndex === index && dragIndex !== index}
              disabled={isSaving}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function AdminManageDeliveryOrderList() {
  const { token } = useAuth();
  const [date, setDate] = useState(localTodayStr());
  const [assignments, setAssignments] = useState<any[]>([]);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savingPartnerId, setSavingPartnerId] = useState<string | null>(null);

  const fetchList = useCallback(
    async (silent = false) => {
      if (!token) return;
      try {
        if (!silent) setLoading(true);
        setError("");
        const [res, catalogRes] = await Promise.all([
          getTodayDeliveryStatus(token, {
            date,
            partnerId: "all"
          }),
          getAdminProducts(token).catch(() => null)
        ]);
        setAssignments(res.assignments || []);
        const catMap: Record<string, string> = {};
        const products = catalogRes?.data?.products || [];
        products.forEach((p: any) => {
          if (p?._id) catMap[String(p._id)] = String(p.category || "");
        });
        if (Object.keys(catMap).length) setCategoryMap(catMap);
      } catch (err: any) {
        if (!silent) setError(err.message || "Failed to load delivery order list");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [token, date]
  );

  useEffect(() => {
    fetchList(false);
  }, [fetchList]);

  const lanes: PartnerLane[] = useMemo(() => {
    const byPartner: Record<string, any[]> = {};
    const partnerMeta: Record<string, any> = {};

    assignments.forEach((a) => {
      const id = String(a.deliveryPartner?._id || a.deliveryPartner || "unknown");
      if (!byPartner[id]) byPartner[id] = [];
      byPartner[id].push(a);
      if (!partnerMeta[id]) partnerMeta[id] = a.deliveryPartner || { name: "Unknown" };
    });

    Object.values(byPartner).forEach((list) => {
      list.sort((a, b) => {
        const seq = (a.sequence || 0) - (b.sequence || 0);
        if (seq !== 0) return seq;
        return String(a.order?.deliveryTime || "").localeCompare(String(b.order?.deliveryTime || ""));
      });
    });

    return Object.keys(byPartner)
      .map((partnerId) => ({
        partnerId,
        partner: partnerMeta[partnerId],
        deliveries: byPartner[partnerId]
      }))
      .sort((a, b) =>
        String(a.partner?.name || "").localeCompare(String(b.partner?.name || ""), undefined, {
          sensitivity: "base"
        })
      );
  }, [assignments]);

  const handleReorder = async (partnerId: string, nextDeliveries: any[]) => {
    if (!token) return;

    const partnerName =
      nextDeliveries[0]?.deliveryPartner?.name ||
      lanes.find((l) => l.partnerId === partnerId)?.partner?.name ||
      "partner";

    setAssignments((prev) => {
      const others = prev.filter(
        (a) => String(a.deliveryPartner?._id || a.deliveryPartner || "unknown") !== partnerId
      );
      return [...others, ...nextDeliveries];
    });

    setSavingPartnerId(partnerId);
    setSuccess("");
    setError("");
    try {
      const payload = nextDeliveries.map((a, i) => ({
        id: String(a._id),
        sequence: i
      }));
      await adminReorderAssignments(token, payload);
      setSuccess(`Route order saved for ${partnerName}`);
    } catch (err: any) {
      setError(err.message || "Could not save route order");
      await fetchList(true);
    } finally {
      setSavingPartnerId(null);
    }
  };

  return (
    <DashboardShell
      title="Manage Delivery Order List"
      description="Drag and drop stops under each delivery partner to set the route order for the day."
      navLinks={ADMIN_NAV_LINKS}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3 justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">
                Delivery date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <button
              type="button"
              onClick={() => fetchList(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
            >
              Refresh
            </button>
          </div>
          <div className="text-xs text-slate-500">
            {lanes.length} partner{lanes.length === 1 ? "" : "s"} · {assignments.length} stop
            {assignments.length === 1 ? "" : "s"}
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-200 text-sm px-3 py-2">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 text-sm px-3 py-2">
            {success}
          </div>
        ) : null}

        {loading ? (
          <div className="text-slate-400 text-sm py-12 text-center">Loading delivery order list…</div>
        ) : lanes.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-12 text-center text-slate-400 text-sm">
            No assigned deliveries for this date. Assign partners in Order Management first.
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 overscroll-contain">
            {lanes.map((lane) => (
              <PartnerOrderColumn
                key={lane.partnerId}
                lane={lane}
                categoryMap={categoryMap}
                onReorder={handleReorder}
                savingPartnerId={savingPartnerId}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
