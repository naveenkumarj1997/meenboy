import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { getAdminOverview, type AdminOverviewPayload } from "../../lib/api";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import { hasAdminSection, type AdminSectionId } from "../../lib/adminSections";

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
  { label: "Daily Prices", href: "/dashboard/admin/daily-prices", section: "daily_prices" },
  {
    label: "Today Delivery Status",
    href: "/dashboard/admin/today-delivery-status",
    section: "today_delivery_status"
  },
  { label: "Today's Catch", href: "/dashboard/admin/todays-catch", section: "todays_catch" },
  { label: "Order Management", href: "/dashboard/admin/deliveries", section: "deliveries" },
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

const AdminDashboard = () => {
  const { token, user } = useAuth();
  const [data, setData] = useState<AdminOverviewPayload>(emptyOverview());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

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

  const attentionCards: AttentionCard[] = useMemo(() => {
    const a = data.attention;
    return [
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
        href: "/dashboard/admin/deliveries",
        section: "deliveries",
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
    ].filter((c) => can(c.section));
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
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Active products</p>
          <p className="text-3xl font-black text-teal-400">
            {loading ? "…" : s.activeProducts}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {loading ? "" : `${s.totalProducts} total in catalog`}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Open orders</p>
          <p className="text-3xl font-black text-amber-400">
            {loading ? "…" : s.activeOrders}
          </p>
          <p className="text-xs text-slate-500 mt-1">All dates · not yet delivered</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Revenue today</p>
          <p className="text-3xl font-black text-emerald-400">
            {loading ? "…" : money(s.revenueToday)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {loading ? "" : `Week ${money(s.revenueWeek)}`}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Lifetime all-time</p>
          <p className="text-3xl font-black text-cyan-400">
            {loading ? "…" : money(s.revenueAllTime)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Delivered orders only</p>
        </div>
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
    </DashboardShell>
  );
};

export default AdminDashboard;
