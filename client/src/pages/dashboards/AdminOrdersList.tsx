import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import {
  getOrdersDateBoard,
  updateOrderDeliveryDate,
  type DateBoardOrder
} from "../../lib/api";
import { formatQuantityLabel } from "../../lib/weightOptions";

type DayColumn = { date: string; count: number; orders: DateBoardOrder[] };

const money = (n: number) => `₹${Number(n || 0).toFixed(0)}`;

const canMoveOrder = (status?: string) =>
  !["delivered", "cancelled"].includes(String(status || ""));

const dayTitle = (ymd: string, index: number) => {
  const d = new Date(`${ymd}T12:00:00`);
  const weekday = d.toLocaleDateString("en-IN", { weekday: "short" });
  const pretty = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return { weekday, pretty, isToday: index === 0 };
};

const statusChip = (status: string) => {
  if (status === "delivered") return "bg-emerald-500/15 text-emerald-300";
  if (status === "out_for_delivery") return "bg-blue-500/15 text-blue-300";
  if (status === "preparing") return "bg-sky-500/15 text-sky-300";
  if (status === "confirmed") return "bg-teal-500/15 text-teal-300";
  return "bg-amber-500/15 text-amber-300";
};

function OrderCard({
  order,
  dates,
  isOverlay,
  onChangeDate
}: {
  order: DateBoardOrder;
  dates: string[];
  isOverlay?: boolean;
  onChangeDate: (orderId: string, date: string) => void;
}) {
  const movable = canMoveOrder(order.status);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order._id,
    disabled: !movable,
    data: { order }
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.35 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={isOverlay ? undefined : style}
      className={`rounded-xl border p-2.5 ${
        isOverlay
          ? "border-teal-400 bg-slate-900 shadow-xl shadow-teal-500/20"
          : movable
            ? "border-slate-800 bg-slate-950/90"
            : "border-slate-800/70 bg-slate-950/50"
      }`}
    >
      <div
        className={`flex items-start justify-between gap-2 ${movable && !isOverlay ? "sm:cursor-grab active:sm:cursor-grabbing" : ""}`}
        {...(movable ? { ...listeners, ...attributes } : {})}
      >
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">{order.customerName}</p>
          <p className="text-[10px] text-slate-500">
            #{String(order._id).slice(-6).toUpperCase()} · {order.deliveryTime || "—"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-black text-teal-300">{money(order.total)}</p>
          <span className={`inline-block mt-1 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${statusChip(order.status)}`}>
            {String(order.status || "").replace(/_/g, " ")}
          </span>
        </div>
      </div>
      <div className="mt-1.5 space-y-0.5">
        {order.items.slice(0, 3).map((item, i) => (
          <p key={`${order._id}-${i}`} className="text-[11px] text-slate-300 truncate">
            {formatQuantityLabel(item.quantity, item.unit)} · {item.productName}
            {item.cutName ? ` (${item.cutName})` : ""}
          </p>
        ))}
        {order.itemCount > 3 ? (
          <p className="text-[10px] text-slate-500">+{order.itemCount - 3} more</p>
        ) : null}
      </div>
      {movable ? (
        <select
          value={order.deliveryDate}
          onChange={(e) => onChangeDate(order._id, e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          className="mt-2 w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-xs text-white sm:hidden"
        >
          {dates.map((d) => (
            <option key={d} value={d}>
              {dayTitle(d, dates.indexOf(d)).isToday ? "Today" : dayTitle(d, dates.indexOf(d)).pretty} · {d}
            </option>
          ))}
        </select>
      ) : (
        <p className="mt-2 text-[10px] text-slate-600 sm:hidden">Date locked</p>
      )}
    </div>
  );
}

function DayLane({
  day,
  index,
  dates,
  onChangeDate
}: {
  day: DayColumn;
  index: number;
  dates: string[];
  onChangeDate: (orderId: string, date: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day-${day.date}` });
  const { weekday, pretty, isToday } = dayTitle(day.date, index);
  return (
    <div
      ref={setNodeRef}
      className={`snap-start shrink-0 w-[280px] sm:w-[300px] rounded-2xl border bg-slate-950/80 flex flex-col min-h-[420px] ${
        isOver ? "border-teal-400 shadow-[0_0_24px_rgba(45,212,191,0.2)]" : "border-slate-800"
      }`}
    >
      <div className="p-3 border-b border-slate-800/80">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm">{isToday ? "Today" : weekday}</span>
              {isToday ? (
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300">
                  Live
                </span>
              ) : null}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {pretty} · {day.date}
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-teal-300 leading-none">{day.count}</div>
            <div className="text-[10px] text-slate-500">orders</div>
          </div>
        </div>
        <p className="hidden sm:block text-[10px] text-slate-600 mt-2">Drop an order here to change date</p>
        <p className="sm:hidden text-[10px] text-slate-600 mt-2">Use the date list on each order card</p>
      </div>
      <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[70vh]">
        {day.orders.length === 0 ? (
          <div className="text-center text-[11px] text-slate-600 py-8">No orders this date</div>
        ) : (
          day.orders.map((order) => (
            <OrderCard key={order._id} order={order} dates={dates} onChangeDate={onChangeDate} />
          ))
        )}
      </div>
    </div>
  );
}

export default function AdminOrdersList() {
  const { token } = useAuth();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [days, setDays] = useState<DayColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [moving, setMoving] = useState(false);
  const [activeOrder, setActiveOrder] = useState<DateBoardOrder | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 280, tolerance: 8 } })
  );

  const dates = useMemo(() => days.map((d) => d.date), [days]);
  const totalOrders = days.reduce((sum, d) => sum + d.count, 0);

  const load = async (silent = false) => {
    if (!token) return;
    try {
      if (!silent) setLoading(true);
      setError("");
      const res = await getOrdersDateBoard(token);
      setDays(res.days || []);
    } catch (err: any) {
      if (!silent) setError(err.message || "Failed to load orders list");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const moveOrder = async (orderId: string, toDate: string) => {
    if (!token || !toDate) return;
    const fromDay = days.find((d) => d.orders.some((o) => o._id === orderId));
    const order = fromDay?.orders.find((o) => o._id === orderId);
    if (!order || order.deliveryDate === toDate) return;
    if (!canMoveOrder(order.status)) {
      setError("Delivered orders cannot be moved.");
      return;
    }
    const snapshot = days;
    setDays((prev) =>
      prev.map((day) => {
        const without = day.orders.filter((o) => o._id !== orderId);
        if (day.date === toDate) {
          const moved = { ...order, deliveryDate: toDate };
          return { ...day, orders: [...without, moved], count: without.length + 1 };
        }
        return { ...day, orders: without, count: without.length };
      })
    );
    try {
      setMoving(true);
      setError("");
      await updateOrderDeliveryDate(token, orderId, toDate);
    } catch (err: any) {
      setDays(snapshot);
      setError(err.message || "Could not change delivery date");
    } finally {
      setMoving(false);
    }
  };

  const onDragStart = (event: DragStartEvent) => {
    const order = event.active.data.current?.order as DateBoardOrder | undefined;
    setActiveOrder(order || null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveOrder(null);
    const overId = event.over?.id ? String(event.over.id) : "";
    if (!overId.startsWith("day-")) return;
    const toDate = overId.slice(4);
    moveOrder(String(event.active.id), toDate);
  };

  const scrollByLane = (dir: -1 | 1) => {
    scrollerRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  };

  return (
    <DashboardShell
      title="Orders List"
      description="Next 5 delivery dates from today. Drag on desktop, or pick a date on the card on mobile."
      navLinks={ADMIN_NAV_LINKS}
    >
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            Today → +4 days
          </span>
          <span className="text-slate-400">Total {totalOrders} orders</span>
          {moving ? <span className="text-teal-300">Saving date…</span> : null}
        </div>
        <button
          type="button"
          onClick={() => load(false)}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs border border-slate-700"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-white">
              Date lanes
              <span className="ml-2 text-slate-500 font-normal text-xs">
                swipe / scroll sideways · desktop: drag order to a date
              </span>
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

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragCancel={() => setActiveOrder(null)}
          >
            <div
              ref={scrollerRef}
              className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scroll-smooth [scrollbar-width:thin]"
            >
              {days.map((day, index) => (
                <DayLane key={day.date} day={day} index={index} dates={dates} onChangeDate={moveOrder} />
              ))}
            </div>
            <DragOverlay>
              {activeOrder ? (
                <div className="w-[260px]">
                  <OrderCard order={activeOrder} dates={dates} isOverlay onChangeDate={() => undefined} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </>
      )}
    </DashboardShell>
  );
}
