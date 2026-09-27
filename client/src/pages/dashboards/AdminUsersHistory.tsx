import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import {
  getCustomerHistory,
  getHistoryCustomers,
  type CustomerHistory,
  type CustomerHistoryOrder,
  type HistoryCustomer
} from "../../lib/api";

const money = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dmy = (ymd?: string | null) => {
  if (!ymd) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(ymd);
  return Number.isNaN(d.getTime())
    ? ymd
    : d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "2-digit", year: "numeric" });
};

const dateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "—";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash (full)",
  upi: "UPI (full)",
  partial_cash: "Partial cash",
  partial_upi: "Partial UPI",
  pay_later: "Pay later",
  none: "Not collected",
  card: "Card",
  other: "Other",
  manual: "Manual",
  pending: "Pending"
};

const ORDER_STATUS_TONE: Record<string, string> = {
  delivered: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  cancelled: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  out_for_delivery: "bg-blue-500/15 text-blue-300 border-blue-500/30"
};

const statusLabel = (s: string) => s.replace(/_/g, " ");

type Tab = "orders" | "payments" | "items" | "walkin";
type OrderFilter = "all" | "delivered" | "upcoming" | "cancelled" | "due";

export default function AdminUsersHistory() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("customer") || "";

  const [customers, setCustomers] = useState<HistoryCustomer[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [onlyWithOrders, setOnlyWithOrders] = useState(true);

  const [history, setHistory] = useState<CustomerHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");

  const [tab, setTab] = useState<Tab>("orders");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [openOrders, setOpenOrders] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!token) return;
    setListLoading(true);
    getHistoryCustomers(token)
      .then((res) => setCustomers(res.customers || []))
      .catch((err) => setError(err.message || "Failed to load customers"))
      .finally(() => setListLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token || !selectedId) {
      setHistory(null);
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    setError("");
    getCustomerHistory(token, selectedId)
      .then((res) => {
        if (cancelled) return;
        setHistory(res);
        setTab("orders");
        setOrderFilter("all");
        setOrderSearch("");
        setOpenOrders({});
      })
      .catch((err) => !cancelled && setError(err.message || "Failed to load history"))
      .finally(() => !cancelled && setHistoryLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token, selectedId]);

  const filteredCustomers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return customers
      .filter((c) => (onlyWithOrders ? c.orderCount > 0 || c.pendingBalance > 0 : true))
      .filter((c) => {
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (digits.length >= 3 && c.phone.replace(/\D/g, "").includes(digits))
        );
      })
      .sort((a, b) => String(b.lastOrderDate || "").localeCompare(String(a.lastOrderDate || "")));
  }, [customers, query, onlyWithOrders]);

  const selectCustomer = (id: string) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("customer", id);
    else next.delete("customer");
    setSearchParams(next, { replace: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredOrders = useMemo(() => {
    if (!history) return [];
    const q = orderSearch.trim().toLowerCase();
    return history.orders.filter((o) => {
      const delivered = o.status === "delivered" || o.delivery?.status === "delivered";
      if (orderFilter === "delivered" && !delivered) return false;
      if (orderFilter === "cancelled" && o.status !== "cancelled") return false;
      if (orderFilter === "upcoming" && (delivered || o.status === "cancelled")) return false;
      if (orderFilter === "due" && !(o.due > 0)) return false;
      if (!q) return true;
      return (
        o.orderNo.toLowerCase().includes(q) ||
        o.items.some((it) => it.productName.toLowerCase().includes(q))
      );
    });
  }, [history, orderFilter, orderSearch]);

  const paymentTimeline = useMemo(() => {
    if (!history) return [];
    const rows: Array<{
      key: string;
      when: string;
      title: string;
      detail: string;
      amount: number;
      tone: "in" | "due";
    }> = [];
    history.orders.forEach((o) => {
      if (o.status === "cancelled" || !o.delivery || o.delivery.status !== "delivered") return;
      if (o.delivery.paymentCollected > 0) {
        rows.push({
          key: `${o._id}-paid`,
          when: o.delivery.deliveredAt || o.deliveryDate,
          title: `Paid at delivery · Order #${o.orderNo}`,
          detail: `${PAYMENT_LABELS[o.delivery.paymentMethod] || o.delivery.paymentMethod}${
            o.delivery.partnerName ? ` · to ${o.delivery.partnerName}` : ""
          }`,
          amount: o.delivery.paymentCollected,
          tone: "in"
        });
      }
      if (o.due > 0) {
        rows.push({
          key: `${o._id}-due`,
          when: o.delivery.deliveredAt || o.deliveryDate,
          title: `Left unpaid · Order #${o.orderNo}`,
          detail: `Order total ${money(o.total)}`,
          amount: o.due,
          tone: "due"
        });
      }
    });
    history.collections.forEach((c) => {
      rows.push({
        key: c._id,
        when: c.collectedAt,
        title: "Pending amount collected",
        detail: `By ${c.adminName}${c.notes ? ` · ${c.notes}` : ""}`,
        amount: c.amount,
        tone: "in"
      });
    });
    return rows.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
  }, [history]);

  const selectedSummary = customers.find((c) => c._id === selectedId);

  return (
    <DashboardShell
      title="Users History"
      description="Pick a customer to see every order, what they bought, how they paid and what is still pending."
      navLinks={ADMIN_NAV_LINKS}
    >
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/40 text-red-300 p-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="grid lg:grid-cols-[320px_minmax(0,1fr)] gap-4 lg:gap-6 min-w-0">
        {/* Customer picker */}
        <aside className={`${selectedId ? "hidden lg:block" : "block"} min-w-0`}>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3 lg:sticky lg:top-4">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, phone or email"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-base sm:text-sm"
            />
            <label className="flex items-center gap-2 mt-2 text-xs text-slate-400 select-none">
              <input
                type="checkbox"
                checked={onlyWithOrders}
                onChange={(e) => setOnlyWithOrders(e.target.checked)}
                className="accent-teal-500"
              />
              Only customers with orders
              <span className="ml-auto text-slate-500">{filteredCustomers.length}</span>
            </label>
            <div className="mt-3 max-h-[65vh] overflow-y-auto divide-y divide-slate-800/70 -mx-1">
              {listLoading ? (
                <div className="p-6 text-center text-slate-400 text-sm">Loading customers…</div>
              ) : filteredCustomers.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">No customers match.</div>
              ) : (
                filteredCustomers.map((c) => (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => selectCustomer(c._id)}
                    className={`w-full text-left px-2 py-2.5 rounded-lg transition-colors ${
                      c._id === selectedId ? "bg-teal-500/15" : "hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-white text-sm truncate">{c.name}</span>
                      {c.pendingBalance > 0 ? (
                        <span className="ml-auto shrink-0 text-[11px] text-amber-300 font-semibold">
                          Due {money(c.pendingBalance)}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 flex gap-2 min-w-0">
                      <span className="truncate">{c.phone || c.email || "—"}</span>
                      <span className="ml-auto shrink-0">
                        {c.orderCount} order{c.orderCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Details */}
        <section className={`${selectedId ? "block" : "hidden lg:block"} min-w-0 space-y-4`}>
          {selectedId ? (
            <button
              type="button"
              onClick={() => selectCustomer("")}
              className="lg:hidden text-sm font-semibold text-teal-300 py-1"
            >
              ← All customers
            </button>
          ) : null}

          {!selectedId ? (
            <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center text-slate-400">
              Select a customer on the left to see their history.
            </div>
          ) : historyLoading || !history ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-10 text-center text-slate-400">
              Loading {selectedSummary?.name || "customer"}…
            </div>
          ) : (
            <>
              <ProfileCard history={history} />
              <StatsGrid history={history} />

              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {(
                  [
                    ["orders", `Orders (${history.orders.length})`],
                    ["payments", `Payments (${paymentTimeline.length})`],
                    ["items", `Items bought (${history.topItems.length})`],
                    ["walkin", `Walk-in (${history.walkIns.length})`]
                  ] as Array<[Tab, string]>
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold border ${
                      tab === id
                        ? "bg-teal-500/20 text-teal-300 border-teal-500/30"
                        : "bg-slate-900 text-slate-400 border-slate-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === "orders" ? (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {(
                        [
                          ["all", "All"],
                          ["delivered", "Delivered"],
                          ["upcoming", "Upcoming"],
                          ["due", "Has due"],
                          ["cancelled", "Cancelled"]
                        ] as Array<[OrderFilter, string]>
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setOrderFilter(id)}
                          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                            orderFilter === id
                              ? "bg-slate-700 text-white border-slate-600"
                              : "bg-slate-900 text-slate-400 border-slate-800"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="search"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Search item or order no"
                      className="sm:ml-auto sm:w-56 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-base sm:text-sm"
                    />
                  </div>
                  {filteredOrders.length === 0 ? (
                    <div className="rounded-2xl border border-slate-800 p-8 text-center text-slate-500 text-sm">
                      No orders for this filter.
                    </div>
                  ) : (
                    filteredOrders.map((o) => (
                      <OrderCard
                        key={o._id}
                        order={o}
                        open={Boolean(openOrders[o._id])}
                        onToggle={() => setOpenOrders((prev) => ({ ...prev, [o._id]: !prev[o._id] }))}
                      />
                    ))
                  )}
                </div>
              ) : null}

              {tab === "payments" ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 divide-y divide-slate-800/70">
                  {paymentTimeline.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">No payments yet.</div>
                  ) : (
                    paymentTimeline.map((p) => (
                      <div key={p.key} className="p-3 sm:p-4 flex items-start gap-3">
                        <span
                          className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${
                            p.tone === "in" ? "bg-emerald-400" : "bg-amber-400"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-white">{p.title}</div>
                          <div className="text-xs text-slate-400 mt-0.5 break-words">{p.detail}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{dateTime(p.when)}</div>
                        </div>
                        <div
                          className={`shrink-0 text-sm font-bold ${
                            p.tone === "in" ? "text-emerald-400" : "text-amber-300"
                          }`}
                        >
                          {p.tone === "in" ? "+" : ""}
                          {money(p.amount)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : null}

              {tab === "items" ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
                  {history.topItems.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">No items yet.</div>
                  ) : (
                    <div className="divide-y divide-slate-800/70">
                      {history.topItems.map((it, idx) => (
                        <div key={it.name} className="p-3 sm:px-4 flex items-center gap-3">
                          <span className="text-xs text-slate-500 w-5 shrink-0">{idx + 1}</span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-white truncate">{it.name}</div>
                            <div className="text-xs text-slate-400">
                              {it.times} time{it.times === 1 ? "" : "s"} · {it.quantity} {it.unit} total
                            </div>
                          </div>
                          <div className="text-sm font-bold text-teal-300 shrink-0">{money(it.amount)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {tab === "walkin" ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">
                    Walk-in bills matched by the customer&apos;s phone number.
                  </p>
                  {history.walkIns.length === 0 ? (
                    <div className="rounded-2xl border border-slate-800 p-8 text-center text-slate-500 text-sm">
                      No walk-in bills for this phone number.
                    </div>
                  ) : (
                    history.walkIns.map((w) => (
                      <div
                        key={w._id}
                        className={`rounded-xl border p-3 sm:p-4 ${
                          w.status === "cancelled" ? "border-slate-800 opacity-60" : "border-slate-800 bg-slate-900/50"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-white">Bill {w.billNumber}</span>
                          <span className="text-xs text-slate-400">{dmy(w.saleDate)}</span>
                          {w.status === "cancelled" ? (
                            <span className="text-[11px] px-2 py-0.5 rounded-full border bg-rose-500/15 text-rose-300 border-rose-500/30">
                              cancelled
                            </span>
                          ) : (
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full border ${
                                w.paymentStatus === "paid"
                                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                  : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              }`}
                            >
                              {w.paymentStatus}
                            </span>
                          )}
                          <span className="ml-auto text-sm font-bold text-white">{money(w.total)}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1 break-words">
                          {w.items.map((it) => `${it.productName} ${it.quantity}${it.unit}`).join(", ")}
                        </div>
                        {w.status !== "cancelled" && w.amountPaid < w.total ? (
                          <div className="text-xs text-amber-300 mt-1">
                            Paid {money(w.amountPaid)} · Due {money(w.total - w.amountPaid)}
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}

function ProfileCard({ history }: { history: CustomerHistory }) {
  const c = history.customer;
  const address = [c.address?.line1, c.address?.line2, c.address?.city, c.address?.postalCode]
    .filter(Boolean)
    .join(", ");
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-white break-words">{c.name}</h2>
            {c.status === "blocked" ? (
              <span className="text-[11px] px-2 py-0.5 rounded-full border bg-rose-500/15 text-rose-300 border-rose-500/30">
                blocked
              </span>
            ) : null}
            {!c.isRealUser ? (
              <span className="text-[11px] px-2 py-0.5 rounded-full border bg-slate-800 text-slate-400 border-slate-700">
                test account
              </span>
            ) : null}
            {c.excludeFromEarnings ? (
              <span className="text-[11px] px-2 py-0.5 rounded-full border bg-slate-800 text-slate-400 border-slate-700">
                family (not in earnings)
              </span>
            ) : null}
          </div>
          <div className="mt-2 space-y-1 text-sm text-slate-300">
            {c.phone ? (
              <div>
                <a href={`tel:${c.phone}`} className="text-teal-300 font-semibold">
                  {c.phone}
                </a>
                {c.alternatePhone ? <span className="text-slate-400"> · Alt {c.alternatePhone}</span> : null}
              </div>
            ) : null}
            {c.email ? <div className="text-slate-400 break-all">{c.email}</div> : null}
            {address ? (
              <div className="text-slate-400 break-words">
                {address}
                {c.mapUrl ? (
                  <>
                    {" · "}
                    <a href={c.mapUrl} target="_blank" rel="noreferrer" className="text-teal-300">
                      Map
                    </a>
                  </>
                ) : null}
              </div>
            ) : null}
            <div className="text-xs text-slate-500">Customer since {dmy(c.joinedAt)}</div>
          </div>
        </div>
        <div
          className={`rounded-xl border px-4 py-3 sm:text-right shrink-0 ${
            c.pendingBalance > 0 ? "border-amber-500/40 bg-amber-500/10" : "border-emerald-500/30 bg-emerald-500/10"
          }`}
        >
          <div className="text-[11px] uppercase tracking-wide text-slate-400">Pending now</div>
          <div
            className={`text-2xl font-black ${c.pendingBalance > 0 ? "text-amber-300" : "text-emerald-300"}`}
          >
            {money(c.pendingBalance)}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsGrid({ history }: { history: CustomerHistory }) {
  const s = history.stats;
  const cards: Array<{ label: string; value: string; tone?: string; sub?: string }> = [
    {
      label: "Orders",
      value: String(s.totalOrders),
      sub: `${s.deliveredOrders} delivered · ${s.upcomingOrders} upcoming · ${s.cancelledOrders} cancelled`
    },
    { label: "Total billed", value: money(s.totalBilled), tone: "text-white", sub: "Delivered orders" },
    {
      label: "Total paid",
      value: money(s.totalPaid),
      tone: "text-emerald-400",
      sub: `${money(s.paidAtDelivery)} at delivery · ${money(s.collectedLater)} later`
    },
    { label: "Average order", value: money(s.avgOrderValue), tone: "text-teal-300" },
    {
      label: "First / last order",
      value: `${dmy(s.lastOrderDate)}`,
      sub: `First: ${dmy(s.firstOrderDate)}`
    },
    {
      label: "Usually",
      value: s.favouriteSlot || "—",
      sub: s.favouritePaymentMethod
        ? `Pays by ${PAYMENT_LABELS[s.favouritePaymentMethod] || s.favouritePaymentMethod}`
        : "No payments yet"
    }
  ];
  if (s.walkInBills > 0) {
    cards.push({
      label: "Walk-in",
      value: money(s.walkInBilled),
      sub: `${s.walkInBills} bill${s.walkInBills === 1 ? "" : "s"} · paid ${money(s.walkInPaid)}`
    });
  }
  return (
    <div className="grid grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">{c.label}</div>
          <div className={`text-base sm:text-lg font-black mt-0.5 truncate ${c.tone || "text-white"}`}>{c.value}</div>
          {c.sub ? <div className="text-[11px] text-slate-500 mt-0.5 break-words">{c.sub}</div> : null}
        </div>
      ))}
    </div>
  );
}

function OrderCard({
  order: o,
  open,
  onToggle
}: {
  order: CustomerHistoryOrder;
  open: boolean;
  onToggle: () => void;
}) {
  const tone = ORDER_STATUS_TONE[o.status] || "bg-amber-500/15 text-amber-300 border-amber-500/30";
  const d = o.delivery;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full text-left p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-white">#{o.orderNo}</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${tone}`}>{statusLabel(o.status)}</span>
          {o.bookingSource === "manual" ? (
            <span className="text-[11px] px-2 py-0.5 rounded-full border bg-slate-800 text-slate-400 border-slate-700">
              manual booking
            </span>
          ) : null}
          <span className="ml-auto text-sm font-bold text-white">{money(o.total)}</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400">
          <span>
            {dmy(o.deliveryDate)} · {o.deliveryTime}
          </span>
          {d?.status === "delivered" ? (
            <span className="text-emerald-400">
              Paid {money(d.paymentCollected)} · {PAYMENT_LABELS[d.paymentMethod] || d.paymentMethod}
            </span>
          ) : null}
          {o.due > 0 ? <span className="text-amber-300 font-semibold">Due {money(o.due)}</span> : null}
        </div>
        <div className="mt-1 text-xs text-slate-500 truncate">
          {o.items.map((it) => it.productName).join(", ")}
          <span className="ml-1 text-teal-400">{open ? "▴ less" : "▾ details"}</span>
        </div>
      </button>

      {open ? (
        <div className="border-t border-slate-800 p-3 sm:p-4 space-y-3 text-sm">
          <div className="rounded-lg border border-slate-800 divide-y divide-slate-800/70">
            {o.items.map((it, idx) => (
              <div key={idx} className="px-3 py-2 flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-white font-medium break-words">
                    {it.productName}
                    {it.cutName ? <span className="text-slate-400"> · {it.cutName}</span> : null}
                  </div>
                  <div className="text-xs text-slate-400">
                    {it.quantity} {it.unit} × {money(it.unitPrice)}
                    {it.notes ? ` · ${it.notes}` : ""}
                  </div>
                </div>
                <div className="shrink-0 text-white font-semibold">{money(it.totalPrice)}</div>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-3 space-y-1 text-xs">
              <Row label="Items" value={money(o.subtotal)} />
              {o.deliveryFee > 0 ? <Row label="Delivery fee" value={money(o.deliveryFee)} /> : null}
              {o.addonAmount > 0 ? (
                <Row label={`Add-on${o.addonNote ? ` (${o.addonNote})` : ""}`} value={`+ ${money(o.addonAmount)}`} />
              ) : null}
              {o.discountAmount > 0 ? (
                <Row
                  label={`Discount${o.discountNote ? ` (${o.discountNote})` : ""}`}
                  value={`- ${money(o.discountAmount)}`}
                />
              ) : null}
              <div className="border-t border-slate-800 pt-1">
                <Row label="Total" value={money(o.total)} bold />
              </div>
            </div>
            <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-3 space-y-1 text-xs">
              {d ? (
                <>
                  <Row label="Delivery" value={statusLabel(d.status)} />
                  {d.partnerName ? <Row label="Partner" value={d.partnerName} /> : null}
                  {d.deliveredAt ? <Row label="Delivered at" value={dateTime(d.deliveredAt)} /> : null}
                  {d.status === "delivered" ? (
                    <>
                      <Row label="Payment" value={PAYMENT_LABELS[d.paymentMethod] || d.paymentMethod} />
                      <Row label="Collected" value={money(d.paymentCollected)} />
                      <Row label="Left unpaid" value={money(o.due)} />
                    </>
                  ) : null}
                </>
              ) : (
                <div className="text-slate-500">Not assigned to a delivery partner yet.</div>
              )}
              <Row label="Booked on" value={dateTime(o.createdAt)} />
            </div>
          </div>

          {o.customerNotes || d?.notes ? (
            <div className="text-xs text-slate-400 space-y-1 break-words">
              {o.customerNotes ? <div>Customer note: {o.customerNotes}</div> : null}
              {d?.notes ? <div>Delivery note: {d.notes}</div> : null}
            </div>
          ) : null}
          {o.address?.line1 ? (
            <div className="text-xs text-slate-500 break-words">
              Delivered to: {[o.address.line1, o.address.line2, o.address.city, o.address.postalCode].filter(Boolean).join(", ")}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-400 min-w-0 break-words">{label}</span>
      <span className={`shrink-0 text-right ${bold ? "text-white font-bold" : "text-slate-200"}`}>{value}</span>
    </div>
  );
}
