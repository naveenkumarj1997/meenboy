import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import { getMoneyManagement } from "../../lib/api";

type Period = "today" | "week" | "month" | "all";

const PERIOD_LABELS: Record<Period, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  all: "All Time (Real Business)"
};

const fmt = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdminMoneyManagement() {
  const { token } = useAuth();
  const [period, setPeriod] = useState<Period>("today");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "totalSales" | "netCashProfit" | "grossProfit">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await getMoneyManagement(token, period);
        setData(res);
      } catch (err: any) {
        setError(err.message || "Failed to load money management data");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, period]);

  useEffect(() => {
    setSearchQuery("");
    setCurrentPage(1);
  }, [period]);

  const summary = data?.summary || {};
  const profitable = Number(summary.netCashProfit || 0) >= 0;

  const filteredDaily = useMemo(() => {
    const rows = [...(data?.daily || [])];
    const q = searchQuery.trim().toLowerCase();
    const filtered = q ? rows.filter((r) => String(r.date).includes(q)) : rows;

    return filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "date") {
        cmp = String(a.date).localeCompare(String(b.date));
      } else {
        cmp = Number(a[sortBy] || 0) - Number(b[sortBy] || 0);
      }
      return sortOrder === "desc" ? -cmp : cmp;
    });
  }, [data?.daily, searchQuery, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredDaily.length / itemsPerPage));
  const paginatedDaily = filteredDaily.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const periodSnapshots = data?.periods || {};

  return (
    <DashboardShell
      title="Money Management"
      description="Real business profit tracker — test data before launch date is excluded."
      navLinks={ADMIN_NAV_LINKS}
    >
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">{error}</div>
      )}

      <div className="mb-6 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 text-sm">
        <strong>Real business started:</strong> {data?.businessStartDate || "—"}. All orders, collections,
        salaries, purchases, and walk-in sales before this date are ignored (test customers).
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setPeriod(key)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              period === key
                ? "bg-teal-500 text-teal-950"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {PERIOD_LABELS[key]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-slate-400">
            Showing {data?.range?.from} → {data?.range?.to}
          </div>

          <div
            className={`mb-6 p-5 rounded-2xl border ${
              profitable
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-rose-500/10 border-rose-500/30"
            }`}
          >
            <div className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-1">
              Net cash profit ({PERIOD_LABELS[period]})
            </div>
            <div className={`text-4xl font-black ${profitable ? "text-emerald-400" : "text-rose-400"}`}>
              {fmt(summary.netCashProfit)}
            </div>
            <p className="text-sm text-slate-400 mt-2">
              Cash collected − purchases (COGS) − partner salaries.{" "}
              {profitable ? "Business is in profit for this period." : "Business is in loss for this period."}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
            <MetricCard label="Total sales" value={fmt(summary.totalSales)} hint="Deliveries + walk-in" />
            <MetricCard label="Delivery sales" value={fmt(summary.deliverySales)} hint={`${summary.deliveredOrders || 0} orders`} tone="white" />
            <MetricCard label="Walk-in sales" value={fmt(summary.walkInSales)} hint={`${summary.walkInBills || 0} bills`} tone="white" />
            <MetricCard label="Collected (total)" value={fmt(summary.totalCollected)} hint="All cash in" tone="teal" />
            <MetricCard label="At delivery" value={fmt(summary.collectedAtDelivery)} hint="Partner collection" tone="teal" />
            <MetricCard label="Pending collected" value={fmt(summary.manualCollections)} hint="Later admin collect" tone="sky" />
            <MetricCard label="Purchases (COGS)" value={fmt(summary.totalPurchases)} hint="Fish/meat cost" tone="rose" />
            <MetricCard label="Partner salary" value={fmt(summary.partnerSalaries)} hint="Paid to partners" tone="purple" />
            <MetricCard label="Gross profit" value={fmt(summary.grossProfit)} hint="Sales − COGS − salary" tone="indigo" />
            <MetricCard label="Uncollected (period)" value={fmt(summary.amountPending)} hint="Delivery sales not collected yet" tone="amber" />
            <MetricCard label="Customer pending (now)" value={fmt(data?.customerPendingTotal)} hint={`${data?.customersWithPending || 0} customers owe`} tone="amber" />
            <MetricCard label="Net cash profit" value={fmt(summary.netCashProfit)} hint="Your real cash position" tone={profitable ? "emerald" : "rose"} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {(["today", "week", "month", "all"] as Period[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriod(key)}
                className={`text-left p-4 rounded-xl border transition-colors ${
                  period === key
                    ? "border-teal-500/50 bg-teal-500/5"
                    : "border-slate-800 bg-slate-900 hover:border-slate-700"
                }`}
              >
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">
                  {PERIOD_LABELS[key]}
                </div>
                <div className={`text-lg font-black ${Number(periodSnapshots[key]?.netCashProfit || 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {fmt(periodSnapshots[key]?.netCashProfit)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Sales {fmt(periodSnapshots[key]?.totalSales)} · Collected {fmt(periodSnapshots[key]?.totalCollected)}
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
            <Link to="/dashboard/admin/purchases" className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">Purchases →</Link>
            <Link to="/dashboard/admin/partner-salary" className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">Partner Salary →</Link>
            <Link to="/dashboard/admin/delivery-amount-collection" className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">Delivery Collection →</Link>
            <Link to="/dashboard/admin/pending-payments" className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">Pending Payments →</Link>
            <Link to="/dashboard/admin/walk-in" className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">Walk-in →</Link>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Daily breakdown</h3>
                <p className="text-xs text-slate-500 mt-1">Real business days only</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Search date..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-teal-500"
                />
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as typeof sortBy);
                    setCurrentPage(1);
                  }}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-teal-500"
                >
                  <option value="date">Date</option>
                  <option value="totalSales">Total sales</option>
                  <option value="grossProfit">Gross profit</option>
                  <option value="netCashProfit">Net cash profit</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setSortOrder((p) => (p === "desc" ? "asc" : "desc"));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg px-3 py-2 text-sm border border-slate-700"
                >
                  {sortOrder === "desc" ? "↓ Desc" : "↑ Asc"}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300 min-w-[980px]">
                <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Sales</th>
                    <th className="px-4 py-3 text-right">Collected</th>
                    <th className="px-4 py-3 text-right">Purchases</th>
                    <th className="px-4 py-3 text-right">Salary</th>
                    <th className="px-4 py-3 text-right">Pending</th>
                    <th className="px-4 py-3 text-right">Gross</th>
                    <th className="px-4 py-3 text-right">Net cash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {paginatedDaily.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                        No real-business data for this period yet.
                      </td>
                    </tr>
                  ) : (
                    paginatedDaily.map((row) => {
                      const net = Number(row.netCashProfit || 0);
                      return (
                        <tr key={String(row.date)} className="hover:bg-slate-800/20">
                          <td className="px-4 py-3 font-bold text-white">{row.date}</td>
                          <td className="px-4 py-3 text-right">{fmt(Number(row.totalSales))}</td>
                          <td className="px-4 py-3 text-right text-teal-300">{fmt(Number(row.totalCollected))}</td>
                          <td className="px-4 py-3 text-right text-rose-400">{fmt(Number(row.totalPurchases))}</td>
                          <td className="px-4 py-3 text-right text-purple-300">{fmt(Number(row.partnerSalaries))}</td>
                          <td className="px-4 py-3 text-right text-amber-400">{fmt(Number(row.amountPending))}</td>
                          <td className="px-4 py-3 text-right text-indigo-300">{fmt(Number(row.grossProfit))}</td>
                          <td className={`px-4 py-3 text-right font-bold ${net >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {fmt(net)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {filteredDaily.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-sm text-slate-400">
                  Showing {(currentPage - 1) * itemsPerPage + 1}–
                  {Math.min(currentPage * itemsPerPage, filteredDaily.length)} of {filteredDaily.length}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-sm text-slate-300">
                    Page {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </DashboardShell>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone = "slate"
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "white" | "teal" | "sky" | "rose" | "purple" | "indigo" | "amber" | "emerald" | "slate";
}) {
  const toneClass: Record<string, string> = {
    white: "text-white",
    teal: "text-teal-300",
    sky: "text-sky-300",
    rose: "text-rose-400",
    purple: "text-purple-300",
    indigo: "text-indigo-300",
    amber: "text-amber-400",
    emerald: "text-emerald-400",
    slate: "text-slate-200"
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">{label}</div>
      <div className={`text-xl font-black ${toneClass[tone] || toneClass.slate}`}>{value}</div>
      {hint ? <div className="text-xs text-slate-500 mt-1">{hint}</div> : null}
    </div>
  );
}
