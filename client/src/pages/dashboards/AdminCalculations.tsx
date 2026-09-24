import { useEffect, useMemo, useState } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import { getCalculations } from "../../lib/api";

const money = (n: unknown) => {
  const v = Number(n);
  return Number.isFinite(v) ? `₹${v.toFixed(2)}` : "₹0.00";
};

function localToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Period = "today" | "week" | "month" | "all" | "custom";

export default function AdminCalculations() {
  const { token } = useAuth();
  const [period, setPeriod] = useState<Period>("today");
  const [from, setFrom] = useState(localToday());
  const [to, setTo] = useState(localToday());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<Awaited<ReturnType<typeof getCalculations>> | null>(null);
  const [customerFilter, setCustomerFilter] = useState<"all" | "real" | "family">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError("");
      const res = await getCalculations(token, {
        period,
        from: period === "custom" ? from : undefined,
        to: period === "custom" ? to : undefined
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load calculations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, period]);

  const summary = data?.summary;
  const customers = useMemo(() => {
    const list = data?.customers || [];
    if (customerFilter === "real") return list.filter((c) => !c.isFamily);
    if (customerFilter === "family") return list.filter((c) => c.isFamily);
    return list;
  }, [data?.customers, customerFilter]);

  return (
    <DashboardShell
      title="Calculations"
      description="See Fish Friendly bookings, cash delivered, costs (purchases, partner salary, petrol, expenses), and real earn. Family/sister-brother customers are listed separately so fake admin-collect does not inflate profit."
      navLinks={ADMIN_NAV_LINKS}
    >
      <div className="space-y-5 sm:space-y-6 min-w-0">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-5 space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
            {(
              [
                ["today", "Today"],
                ["week", "This week"],
                ["month", "This month"],
                ["all", "All time"],
                ["custom", "Custom range"]
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPeriod(id)}
                className={`shrink-0 px-3 py-2.5 rounded-lg text-sm font-bold border transition-colors whitespace-nowrap ${
                  period === id
                    ? "bg-teal-500/20 text-teal-200 border-teal-500/40"
                    : "bg-slate-950 text-slate-400 border-slate-700 hover:border-slate-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {period === "custom" ? (
            <div className="grid grid-cols-1 sm:flex sm:flex-wrap sm:items-end gap-3">
              <div className="min-w-0 sm:min-w-[9rem]">
                <label className="block text-[10px] uppercase text-slate-500 mb-1">From</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white"
                />
              </div>
              <div className="min-w-0 sm:min-w-[9rem]">
                <label className="block text-[10px] uppercase text-slate-500 mb-1">To</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white"
                />
              </div>
              <button
                type="button"
                onClick={load}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-bold bg-teal-500 text-slate-950 hover:bg-teal-400"
              >
                Apply range
              </button>
            </div>
          ) : null}

          {data ? (
            <p className="text-xs text-slate-500">
              Range {data.range.from} → {data.range.to} · Business start {data.businessStartDate}
            </p>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-200 text-sm px-4 py-3">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="text-center text-slate-400 py-16 text-sm">Loading calculations…</div>
        ) : summary ? (
          <>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              <Stat
                label="Real bookings (delivered)"
                value={money(summary.bookingsReal)}
                hint={`${summary.deliveredOrderCount || 0} delivered orders in range (excl. family)`}
                tone="teal"
              />
              <Stat
                label="Cash in (real)"
                value={money(summary.realCashIn)}
                hint="Delivery collect + walk-in + admin collect (non-family)"
                tone="emerald"
              />
              <Stat
                label="Costs"
                value={money(summary.totalCosts)}
                hint="Purchases + partner salary + petrol + expenses"
                tone="amber"
              />
              <Stat
                label="Actual Fish Friendly earn"
                value={money(summary.actualFishFriendlyEarn)}
                hint="Real cash in − costs"
                tone="profit"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2 min-w-0">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4 space-y-2 text-sm min-w-0">
                <h3 className="text-white font-bold text-sm">Bookings &amp; delivered cash</h3>
                <Row label="All delivered bookings" value={money(summary.bookingsAll)} />
                <Row label="Real customers bookings" value={money(summary.bookingsReal)} />
                <Row
                  label="Family bookings (not real earn)"
                  value={money(summary.bookingsFamily)}
                  muted
                />
                <Row label="Collected at delivery (real)" value={money(summary.collectedReal)} />
                <Row
                  label="Collected at delivery (family / paper)"
                  value={money(summary.collectedFamily)}
                  muted
                />
                <Row label="Pending on these orders (real)" value={money(summary.pendingOnOrdersReal)} />
                <Row label="Walk-in sales" value={money(summary.walkInSales)} />
                <Row label="Admin collect (real)" value={money(summary.manualCollectionsReal)} />
                <Row
                  label="Admin collect (family / paper)"
                  value={money(summary.manualCollectionsFamily)}
                  muted
                />
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4 space-y-2 text-sm min-w-0">
                <h3 className="text-white font-bold text-sm">Costs &amp; ledger</h3>
                <Row label="Vendor purchases" value={money(summary.totalPurchases)} />
                <Row label="Vendor settlements paid" value={money(summary.totalVendorSettled)} />
                <Row label="Delivery partner salaries" value={money(summary.partnerSalaries)} />
                <Row label="Petrol allowances" value={money(summary.petrolAllowances)} />
                <Row label="Other expenses" value={money(summary.otherExpenses)} />
                <Row label="Gross on real bookings" value={money(summary.grossOnRealBookings)} />
                <Row label="Ledger pending (real customers now)" value={money(summary.ledgerPendingReal)} />
                <Row
                  label="Ledger pending (family now)"
                  value={money(summary.ledgerPendingFamily)}
                  muted
                />
              </div>
            </div>

            <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 px-4 py-3 text-xs text-teal-100/90 leading-relaxed">
              <strong className="text-teal-300">How real earn is calculated: </strong>
              {data.formula?.realCashIn}. Costs = {data.formula?.totalCosts}. Result ={" "}
              {data.formula?.actualFishFriendlyEarn}. {data.formula?.note}
            </div>

            {(data.familyAccounts?.length || 0) > 0 ? (
              <div className="rounded-2xl border border-violet-500/25 bg-violet-500/5 p-4">
                <h3 className="text-sm font-bold text-violet-200 mb-2">
                  Family / sister-brother accounts ({data.familyAccounts.length})
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  Marked in Users → Family. Their deliveries and admin-collect are tracked but excluded
                  from Actual Fish Friendly earn.
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.familyAccounts.map((f) => (
                    <span
                      key={String(f.id)}
                      className="px-2.5 py-1 rounded-lg text-xs border border-violet-500/30 bg-violet-500/10 text-violet-100"
                    >
                      {f.name}
                      {f.pendingBalance > 0 ? ` · pending ${money(f.pendingBalance)}` : ""}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-xs text-amber-100/90">
                No family accounts yet. In <strong>Users</strong>, open Adela / Sugumaran (and similar)
                and tap <strong>Mark family</strong> so their admin-collect will not count as real money.
              </div>
            )}

            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-white font-bold text-sm">Customers delivered in this range</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {customers.length} customer{customers.length === 1 ? "" : "s"} · tap a row for order
                    detail
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["all", "All"],
                      ["real", "Real only"],
                      ["family", "Family only"]
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setCustomerFilter(id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                        customerFilter === id
                          ? "bg-slate-100 text-slate-900 border-slate-100"
                          : "bg-slate-950 text-slate-400 border-slate-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {customers.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500">
                  No delivered customers in this range.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/70">
                  {customers.map((c) => {
                    const key = String(c.customerId || c.name);
                    const open = expandedId === key;
                    return (
                      <div key={key} className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setExpandedId(open ? null : key)}
                          className="w-full text-left flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-white">{c.name}</span>
                              {c.isFamily ? (
                                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border border-violet-500/40 text-violet-200 bg-violet-500/15">
                                  Family
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border border-teal-500/30 text-teal-200 bg-teal-500/10">
                                  Real
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {c.phone || "No phone"} · {c.orderCount} order
                              {c.orderCount === 1 ? "" : "s"}
                            </div>
                          </div>
                          <div className="text-xs sm:text-right space-y-0.5 shrink-0">
                            <div className="text-slate-300">
                              Booked <span className="font-bold text-white">{money(c.bookings)}</span>
                            </div>
                            <div className="text-emerald-300/90">
                              Collected {money(c.collectedAtDelivery)}
                            </div>
                            <div className="text-amber-300/90">
                              Pending on orders {money(c.pendingOnOrders)}
                            </div>
                          </div>
                        </button>
                        {open ? (
                          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-300 min-w-[520px]">
                              <thead className="text-slate-500 border-b border-slate-800">
                                <tr>
                                  <th className="px-3 py-2 font-medium">Date</th>
                                  <th className="px-3 py-2 font-medium">Total</th>
                                  <th className="px-3 py-2 font-medium">Collected</th>
                                  <th className="px-3 py-2 font-medium">Method</th>
                                  <th className="px-3 py-2 font-medium">Pending</th>
                                  <th className="px-3 py-2 font-medium">Partner</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/50">
                                {c.orders.map((o) => (
                                  <tr key={String(o.assignmentId)}>
                                    <td className="px-3 py-2">{o.deliveryDate}</td>
                                    <td className="px-3 py-2">{money(o.total)}</td>
                                    <td className="px-3 py-2">{money(o.paymentCollected)}</td>
                                    <td className="px-3 py-2 capitalize">
                                      {String(o.paymentMethod || "").replace(/_/g, " ")}
                                    </td>
                                    <td className="px-3 py-2">{money(o.pendingOnOrder)}</td>
                                    <td className="px-3 py-2">{o.partnerName || "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}

function Stat({
  label,
  value,
  hint,
  tone
}: {
  label: string;
  value: string;
  hint: string;
  tone: "teal" | "emerald" | "amber" | "profit";
}) {
  const wrap =
    tone === "profit"
      ? "border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 to-slate-900"
      : tone === "emerald"
        ? "border-emerald-500/25 bg-emerald-500/5"
        : tone === "amber"
          ? "border-amber-500/25 bg-amber-500/5"
          : "border-teal-500/25 bg-teal-500/5";
  const valueColor =
    tone === "profit" || tone === "emerald"
      ? "text-emerald-300"
      : tone === "amber"
        ? "text-amber-200"
        : "text-teal-200";
  return (
    <div className={`rounded-2xl border p-3 sm:p-4 min-w-0 ${wrap}`}>
      <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">{label}</div>
      <div className={`text-xl sm:text-2xl font-black mt-1 break-all ${valueColor}`}>{value}</div>
      <div className="text-[11px] text-slate-500 mt-2 leading-snug">{hint}</div>
    </div>
  );
}

function Row({
  label,
  value,
  muted
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 min-w-0">
      <span className={`min-w-0 leading-snug ${muted ? "text-slate-500" : "text-slate-300"}`}>
        {label}
      </span>
      <span className={`font-semibold shrink-0 tabular-nums ${muted ? "text-slate-500" : "text-white"}`}>
        {value}
      </span>
    </div>
  );
}
