import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import {
  getAdminOverview,
  getOverviewOrders,
  type AdminOverviewPayload,
  type OverviewOrderKind,
  type OverviewOrderRow
} from "../../lib/api";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import { hasAdminSection, type AdminSectionId } from "../../lib/adminSections";
import { formatQuantityLabel } from "../../lib/weightOptions";

const money = (n: number) => `₹${Number(n || 0).toFixed(2)}`;

type AttentionCard = {
  label: string;
  value: string;
  hint: string;
  href: string;
  section?: AdminSectionId;
  hot?: boolean;
};

type Shortcut = {
  label: string;
  href: string;
  section?: AdminSectionId;
  always?: boolean;
};

const SHORTCUTS: Shortcut[] = [
  { label: "Manual Booking", href: "/dashboard/admin/manual-booking", section: "manual_booking" },
  { label: "Availability / Banner", href: "/dashboard/admin/availability", section: "availability" },
  { label: "Customer Reviews", href: "/dashboard/admin/customer-reviews", section: "customer_reviews" },
  { label: "Sourcing Photos", href: "/dashboard/admin/sourcing-photos", section: "sourcing_photos" },
  { label: "Daily Prices", href: "/dashboard/admin/daily-prices", section: "daily_prices" },
  {
    label: "Today Delivery Status",
    href: "/dashboard/admin/today-delivery-status",
    section: "today_delivery_status"
  },
  { label: "Today's Catch", href: "/dashboard/admin/todays-catch", section: "todays_catch" },
  { label: "Order Management", href: "/dashboard/admin/deliveries", section: "deliveries" },
  { label: "Orders List", href: "/dashboard/admin/orders-list", section: "orders_list" },
  {
    label: "Assign Delivery Partners",
    href: "/dashboard/admin/assign-delivery-partners",
    section: "assign_delivery_partners"
  },
  { label: "Pending Payments", href: "/dashboard/admin/pending-payments", section: "pending_payments" },
  { label: "Money Management", href: "/dashboard/admin/money-management", section: "money_management" },
  { label: "Partner Salary", href: "/dashboard/admin/partner-salary", section: "partner_salary" },
  { label: "Petrol Allowance", href: "/dashboard/admin/petrol-allowance", section: "petrol_allowance" },
  { label: "New Customers", href: "/dashboard/admin/new-customers", section: "new_customers" },
  {
    label: "Partner Approvals",
    href: "/dashboard/admin/partner-approvals",
    section: "partner_approvals"
  }
];

const emptyOverview = (): AdminOverviewPayload => ({
  date: new Date().toISOString().slice(0, 10),
  weekStart: "",
  summary: {
    totalProducts: 0,
    activeProducts: 0,
    activeOrders: 0,
    revenueAllTime: 0,
    revenueToday: 0,
    revenueWeek: 0
  },
  attention: {
    newCustomers: 0,
    pendingPartners: 0,
    unassignedToday: 0,
    notDeliveredToday: 0,
    assignmentPendingToday: 0,
    pendingPaymentCustomers: 0,
    pendingPaymentAmount: 0
  },
  today: {
    ordersTotal: 0,
    ordersDelivered: 0,
    ordersRemaining: 0,
    bookingManual: 0,
    bookingWebsite: 0,
    catchEnabled: false,
    catchItemCount: 0,
    catchStockQty: 0
  },
  money: {
    todayCash: 0,
    todayUpi: 0,
    todayCollected: 0,
    weekCash: 0,
    weekUpi: 0,
    weekCollected: 0,
    salaryUnconfirmedCount: 0,
    salaryUnconfirmedAmount: 0,
    petrolUnconfirmedCount: 0,
    petrolUnconfirmedAmount: 0
  }
});

const DRILL_TITLES: Record<OverviewOrderKind, string> = {
  open: "Open orders",
  lifetime: "Lifetime all-time (delivered)",
  today_revenue: "Revenue today (delivered)"
};

const AdminDashboard = () => {
  const { token, user } = useAuth();
  const [data, setData] = useState<AdminOverviewPayload>(emptyOverview());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [drillKind, setDrillKind] = useState<OverviewOrderKind | null>(null);
  const [drillPage, setDrillPage] = useState(1);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillError, setDrillError] = useState("");
  const [drillOrders, setDrillOrders] = useState<OverviewOrderRow[]>([]);
  const [drillTotalCount, setDrillTotalCount] = useState(0);
  const [drillTotalPages, setDrillTotalPages] = useState(1);
  const [drillTotalAmount, setDrillTotalAmount] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    getAdminOverview(token, selectedDate)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || "Failed to load overview");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, selectedDate]);

  const can = (section?: AdminSectionId) =>
    !section || hasAdminSection(user, section);

  const openDrill = (kind: OverviewOrderKind) => {
    setDrillKind(kind);
    setDrillPage(1);
    setDrillOrders([]);
    setDrillError("");
  };

  useEffect(() => {
    if (!token || !drillKind) return;
    let cancelled = false;
    setDrillLoading(true);
    setDrillError("");
    getOverviewOrders(token, drillKind, { date: selectedDate, page: drillPage })
      .then((res) => {
        if (cancelled) return;
        setDrillOrders(res.orders || []);
        setDrillTotalCount(res.totalCount || 0);
        setDrillTotalPages(res.totalPages || 1);
        setDrillTotalAmount(res.totalAmount || 0);
      })
      .catch((err: any) => {
        if (!cancelled) setDrillError(err.message || "Failed to load orders");
      })
      .finally(() => {
        if (!cancelled) setDrillLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, drillKind, drillPage, selectedDate]);

  const attentionCards: AttentionCard[] = useMemo(() => {
    const a = data.attention;
    const cards: AttentionCard[] = [
      {
        label: "New customers",
        value: String(a.newCustomers),
        hint: "Not noticed yet",
        href: "/dashboard/admin/new-customers",
        section: "new_customers",
        hot: a.newCustomers > 0
      },
      {
        label: "Partner approvals",
        value: String(a.pendingPartners),
        hint: "Waiting for approve",
        href: "/dashboard/admin/partner-approvals",
        section: "partner_approvals",
        hot: a.pendingPartners > 0
      },
      {
        label: "Unassigned today",
        value: String(a.unassignedToday),
        hint: "Orders without partner",
        href: "/dashboard/admin/assign-delivery-partners",
        section: "assign_delivery_partners",
        hot: a.unassignedToday > 0
      },
      {
        label: "Not delivered today",
        value: String(a.notDeliveredToday),
        hint: `${a.assignmentPendingToday} assignment(s) still open`,
        href: "/dashboard/admin/today-delivery-status",
        section: "today_delivery_status",
        hot: a.notDeliveredToday > 0
      },
      {
        label: "Pending payments",
        value: String(a.pendingPaymentCustomers),
        hint: money(a.pendingPaymentAmount),
        href: "/dashboard/admin/pending-payments",
        section: "pending_payments",
        hot: a.pendingPaymentCustomers > 0
      }
    ];
    return cards.filter((c) => can(c.section));
  }, [data, user]);

  const shortcuts = useMemo(
    () => SHORTCUTS.filter((s) => s.always || can(s.section)),
    [user]
  );

  const s = data.summary;
  const t = data.today;
  const m = data.money;

  return (
    <DashboardShell
      title="Admin Overview"
      description="See what needs attention today, then jump into the right tool."
      navLinks={ADMIN_NAV_LINKS}
    >
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Focus date</p>
          <p className="text-sm text-slate-400">
            Stats for delivery date {loading ? "…" : data.date}
            {data.weekStart ? ` · week from ${data.weekStart}` : ""}
          </p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-white px-4 py-2 rounded-lg outline-none focus:border-teal-500"
        />
      </div>

      {/* Snapshot */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        <Link
          to="/dashboard/admin/products"
          className={`rounded-2xl border border-slate-800 bg-slate-900/50 p-5 hover:border-teal-500/40 transition-colors ${
            can("products") ? "" : "pointer-events-none"
          }`}
        >
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Active products</p>
          <p className="text-3xl font-black text-teal-400">
            {loading ? "…" : s.activeProducts}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {loading ? "" : `${s.totalProducts} total in catalog`}
            <span className="block text-teal-400/80 mt-1">Tap to view catalog →</span>
          </p>
        </Link>
        <button
          type="button"
          onClick={() => openDrill("open")}
          className="text-left rounded-2xl border border-slate-800 bg-slate-900/50 p-5 hover:border-amber-500/40 transition-colors"
        >
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Open orders</p>
          <p className="text-3xl font-black text-amber-400">
            {loading ? "…" : s.activeOrders}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            All dates · not yet delivered
            <span className="block text-amber-400/80 mt-1">Tap to view list →</span>
          </p>
        </button>
        <button
          type="button"
          onClick={() => openDrill("today_revenue")}
          className="text-left rounded-2xl border border-slate-800 bg-slate-900/50 p-5 hover:border-emerald-500/40 transition-colors"
        >
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Revenue today</p>
          <p className="text-3xl font-black text-emerald-400">
            {loading ? "…" : money(s.revenueToday)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {loading ? "" : `Week ${money(s.revenueWeek)}`}
            <span className="block text-emerald-400/80 mt-1">Tap to view delivered orders →</span>
          </p>
        </button>
        <button
          type="button"
          onClick={() => openDrill("lifetime")}
          className="text-left rounded-2xl border border-slate-800 bg-slate-900/50 p-5 hover:border-cyan-500/40 transition-colors"
        >
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Lifetime all-time</p>
          <p className="text-3xl font-black text-cyan-400">
            {loading ? "…" : money(s.revenueAllTime)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Delivered orders only
            <span className="block text-cyan-400/80 mt-1">Tap to view list →</span>
          </p>
        </button>
      </div>

      {/* Needs attention */}
      <section className="mb-8">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-white">Needs attention</h3>
          <p className="text-sm text-slate-400">Tap a card to open that section.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {attentionCards.map((card) => (
            <Link
              key={card.href + card.label}
              to={card.href}
              className={`rounded-2xl border p-5 transition-colors ${
                card.hot
                  ? "border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/15"
                  : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-300">{card.label}</p>
                  <p className="text-xs text-slate-500 mt-1">{card.hint}</p>
                </div>
                <span
                  className={`text-2xl font-black ${card.hot ? "text-rose-400" : "text-white"}`}
                >
                  {loading ? "…" : card.value}
                </span>
              </div>
            </Link>
          ))}
          {!loading && attentionCards.length === 0 && (
            <p className="text-sm text-slate-500 col-span-full">No attention sections on your access.</p>
          )}
        </div>
      </section>

      {/* Today ops */}
      <section className="mb-8">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-white">Today&apos;s operations</h3>
          <p className="text-sm text-slate-400">Delivery date {data.date}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Orders</p>
            <p className="text-3xl font-black text-white">{loading ? "…" : t.ordersTotal}</p>
            <p className="text-xs text-slate-400 mt-2">
              {loading
                ? ""
                : `${t.ordersDelivered} delivered · ${t.ordersRemaining} remaining`}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Bookings</p>
            <p className="text-3xl font-black text-teal-400">
              {loading ? "…" : t.bookingManual + t.bookingWebsite}
            </p>
            <p className="text-xs text-slate-400 mt-2">
              {loading ? "" : `${t.bookingManual} manual · ${t.bookingWebsite} website`}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sm:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">
                  Today&apos;s Catch stock
                </p>
                <p className="text-2xl font-black text-white">
                  {loading ? "…" : t.catchEnabled ? "ON" : "OFF"}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  {loading
                    ? ""
                    : t.catchEnabled
                      ? `${t.catchItemCount} item(s) · ${t.catchStockQty} qty available`
                      : "Homepage shows pre-order message"}
                </p>
              </div>
              {can("todays_catch") && (
                <Link
                  to="/dashboard/admin/todays-catch"
                  className="text-xs font-bold text-teal-400 hover:text-teal-300"
                >
                  Manage →
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Money */}
      <section className="mb-8">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-white">Money</h3>
            <p className="text-sm text-slate-400">Collections from partner deliveries + payout confirms</p>
          </div>
          {can("money_management") && (
            <Link
              to="/dashboard/admin/money-management"
              className="text-sm font-bold text-teal-400 hover:text-teal-300"
            >
              Open Money Management →
            </Link>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">
              Collected today
            </p>
            <p className="text-2xl font-black text-emerald-400">
              {loading ? "…" : money(m.todayCollected)}
            </p>
            <p className="text-xs text-slate-400 mt-2">
              {loading ? "" : `Cash ${money(m.todayCash)} · UPI ${money(m.todayUpi)}`}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">
              Collected (7 days)
            </p>
            <p className="text-2xl font-black text-cyan-400">
              {loading ? "…" : money(m.weekCollected)}
            </p>
            <p className="text-xs text-slate-400 mt-2">
              {loading ? "" : `Cash ${money(m.weekCash)} · UPI ${money(m.weekUpi)}`}
            </p>
          </div>
          <Link
            to="/dashboard/admin/partner-salary"
            className={`rounded-2xl border p-5 transition-colors ${
              m.salaryUnconfirmedCount > 0
                ? "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15"
                : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
            } ${can("partner_salary") ? "" : "pointer-events-none opacity-60"}`}
          >
            <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">
              Salary unconfirmed
            </p>
            <p className="text-2xl font-black text-amber-400">
              {loading ? "…" : m.salaryUnconfirmedCount}
            </p>
            <p className="text-xs text-slate-400 mt-2">
              {loading ? "" : money(m.salaryUnconfirmedAmount)} waiting partner Collect
            </p>
          </Link>
          <Link
            to="/dashboard/admin/petrol-allowance"
            className={`rounded-2xl border p-5 transition-colors ${
              m.petrolUnconfirmedCount > 0
                ? "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15"
                : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
            } ${can("petrol_allowance") ? "" : "pointer-events-none opacity-60"}`}
          >
            <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">
              Petrol unconfirmed
            </p>
            <p className="text-2xl font-black text-amber-400">
              {loading ? "…" : m.petrolUnconfirmedCount}
            </p>
            <p className="text-xs text-slate-400 mt-2">
              {loading ? "" : money(m.petrolUnconfirmedAmount)} waiting partner Collect
            </p>
          </Link>
        </div>
      </section>

      {/* Shortcuts */}
      <section>
        <div className="mb-4">
          <h3 className="text-lg font-bold text-white">Quick links</h3>
          <p className="text-sm text-slate-400">Shortcuts based on your admin access.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shortcuts.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm font-semibold text-slate-200 hover:border-teal-500/40 hover:text-teal-300 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      {drillKind && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="bg-slate-950 border-t sm:border border-slate-800 rounded-t-2xl sm:rounded-2xl w-full max-w-3xl h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 sm:px-6 shrink-0 border-b border-slate-800">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-white">{DRILL_TITLES[drillKind]}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {drillLoading
                    ? "Loading…"
                    : `${drillTotalCount} order${drillTotalCount === 1 ? "" : "s"} · ${money(
                        drillKind === "lifetime" ? s.revenueAllTime : drillTotalAmount
                      )}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrillKind(null)}
                className="shrink-0 min-h-11 px-3 rounded-xl bg-slate-800 text-slate-200 text-sm font-semibold"
              >
                Close
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-3">
              {drillError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
                  {drillError}
                </div>
              )}
              {!drillLoading && !drillError && drillOrders.length === 0 && (
                <p className="text-sm text-slate-500 py-8 text-center">No orders in this list.</p>
              )}
              {drillOrders.map((order) => (
                <div key={order._id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-white leading-snug">{order.customerName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        #{String(order._id).slice(-6).toUpperCase()} · {order.deliveryDate} {order.deliveryTime}
                      </p>
                      {order.phone ? <p className="text-xs text-slate-500">{order.phone}</p> : null}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-teal-300">{money(order.total)}</p>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">
                        {String(order.status || "").replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    {order.items.map((item, i) => (
                      <p key={`${order._id}-${i}`} className="text-xs text-slate-300">
                        {formatQuantityLabel(item.quantity, item.unit)} · {item.productName}
                        {item.cutName ? ` (${item.cutName})` : ""}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {drillTotalPages > 1 && (
              <div className="shrink-0 border-t border-slate-800 px-4 sm:px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={drillPage <= 1 || drillLoading}
                  onClick={() => setDrillPage((p) => Math.max(1, p - 1))}
                  className="min-h-11 px-4 rounded-xl bg-slate-800 text-white text-sm disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-xs text-slate-400">
                  Page {drillPage} of {drillTotalPages}
                </span>
                <button
                  type="button"
                  disabled={drillPage >= drillTotalPages || drillLoading}
                  onClick={() => setDrillPage((p) => p + 1)}
                  className="min-h-11 px-4 rounded-xl bg-slate-800 text-white text-sm disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
};

export default AdminDashboard;
