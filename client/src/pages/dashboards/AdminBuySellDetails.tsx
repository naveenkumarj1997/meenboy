import { useEffect, useMemo, useState } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import { getBuySellReport, downloadBuySellPdf, type BuySellReport } from "../../lib/api";
import { triggerPdfDownload } from "../../lib/downloadPdf";

type Period = "day" | "month" | "3m" | "6m" | "year";

const PERIODS: { id: Period; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "month", label: "Month" },
  { id: "3m", label: "3 Months" },
  { id: "6m", label: "6 Months" },
  { id: "year", label: "Year" }
];

const todayIst = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Calendar period that contains the anchor date (multi-month periods end with its month). */
const rangeFor = (period: Period, anchor: string) => {
  const [y, m] = anchor.split("-").map(Number);
  if (period === "day") return { from: anchor, to: anchor };
  if (period === "year") return { from: ymd(y, 1, 1), to: ymd(y, 12, 31) };
  const months = period === "month" ? 1 : period === "3m" ? 3 : 6;
  const start = new Date(Date.UTC(y, m - months, 1));
  return {
    from: ymd(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
    to: ymd(y, m, lastDay(y, m))
  };
};

const shiftAnchor = (period: Period, anchor: string, dir: 1 | -1) => {
  const [y, m, d] = anchor.split("-").map(Number);
  if (period === "day") {
    const dt = new Date(Date.UTC(y, m - 1, d + dir));
    return dt.toISOString().slice(0, 10);
  }
  if (period === "year") return ymd(y + dir, m, Math.min(d, lastDay(y + dir, m)));
  const step = period === "month" ? 1 : period === "3m" ? 3 : 6;
  const dt = new Date(Date.UTC(y, m - 1 + dir * step, 1));
  const ny = dt.getUTCFullYear();
  const nm = dt.getUTCMonth() + 1;
  return ymd(ny, nm, Math.min(d, lastDay(ny, nm)));
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const prettyDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

const money = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const qty = (n: number, unit: string) => {
  if (!n) return "-";
  const shown = Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);
  return `${shown} ${unit === "piece" ? "pcs" : unit}`;
};

type SortKey = "minValue" | "soldQty" | "name" | "minPrice";

const th = "border border-black px-2 py-1.5 font-bold text-left whitespace-nowrap";
const td = "border border-black px-2 py-1.5 align-top";

export default function AdminBuySellDetails() {
  const { token } = useAuth();
  const [period, setPeriod] = useState<Period>("month");
  const [anchor, setAnchor] = useState(todayIst());
  const [report, setReport] = useState<BuySellReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<"" | "all" | "category">("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [onlySold, setOnlySold] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("minValue");

  const range = useMemo(() => rangeFor(period, anchor), [period, anchor]);
  const periodLabel = PERIODS.find((p) => p.id === period)?.label || "";

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    getBuySellReport(token, range)
      .then((res) => {
        if (!cancelled) setReport(res);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.message || "Failed to load report");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, range]);

  const categories = useMemo(
    () => [...new Set((report?.products || []).map((p) => p.category))].sort(),
    [report]
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = (report?.products || []).filter(
      (p) =>
        (category === "all" || p.category === category) &&
        (!onlySold || p.soldQty > 0) &&
        (!q || p.name.toLowerCase().includes(q))
    );
    return list.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      const diff = (b[sortKey] as number) - (a[sortKey] as number);
      return diff || a.name.localeCompare(b.name);
    });
  }, [report, search, category, onlySold, sortKey]);

  const shown = useMemo(() => {
    const kg = rows.filter((r) => r.unit === "kg").reduce((s, r) => s + r.soldQty, 0);
    const pcs = rows.filter((r) => r.unit !== "kg").reduce((s, r) => s + r.soldQty, 0);
    return {
      kg: Math.round(kg * 1000) / 1000,
      pcs: Math.round(pcs * 1000) / 1000,
      minValue: rows.reduce((s, r) => s + r.minValue, 0)
    };
  }, [rows]);

  const handlePdf = async (kind: "all" | "category") => {
    if (!token) return;
    try {
      setDownloading(kind);
      const byCategory = kind === "category";
      const blob = await downloadBuySellPdf(token, {
        ...range,
        label: periodLabel,
        onlySold,
        byCategory
      });
      triggerPdfDownload(
        blob,
        `BuySell${byCategory ? "-CategoryWise" : ""}-${range.from}_to_${range.to}.pdf`
      );
    } catch (err: any) {
      setError(err.message || "Failed to download PDF");
    } finally {
      setDownloading("");
    }
  };

  const v = report?.vendors;

  return (
    <DashboardShell
      title="Buy & Sell Details"
      description="Products sold with quantity x price, and vendor purchases & settlements."
      navLinks={ADMIN_NAV_LINKS}
    >
      <div className="space-y-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
                  period === p.id
                    ? "bg-teal-500/20 text-teal-200 border-teal-400/60"
                    : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAnchor(shiftAnchor(period, anchor, -1))}
                className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
                aria-label="Previous period"
              >
                ‹
              </button>
              <input
                type="date"
                value={anchor}
                onChange={(e) => e.target.value && setAnchor(e.target.value)}
                className="h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-white focus:border-teal-500"
              />
              <button
                type="button"
                onClick={() => setAnchor(shiftAnchor(period, anchor, 1))}
                className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
                aria-label="Next period"
              >
                ›
              </button>
              <button
                type="button"
                onClick={() => setAnchor(todayIst())}
                className="h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-sm text-slate-200 hover:bg-white/10"
              >
                Today
              </button>
            </div>
            <div className="text-sm text-slate-300 sm:ml-2">
              <span className="text-slate-500">Showing </span>
              <span className="font-semibold text-white">
                {range.from === range.to
                  ? prettyDate(range.from)
                  : `${prettyDate(range.from)} – ${prettyDate(range.to)}`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 sm:ml-auto">
              <button
                type="button"
                onClick={() => handlePdf("all")}
                disabled={Boolean(downloading) || !report}
                className="h-10 px-4 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 text-cyan-950 font-bold text-sm disabled:opacity-50"
              >
                {downloading === "all" ? "Preparing PDF…" : "Download PDF"}
              </button>
              <button
                type="button"
                onClick={() => handlePdf("category")}
                disabled={Boolean(downloading) || !report}
                className="h-10 px-4 rounded-xl border border-teal-400/60 bg-teal-500/15 text-teal-100 font-bold text-sm hover:bg-teal-500/25 disabled:opacity-50"
              >
                {downloading === "category" ? "Preparing PDF…" : "Category-wise PDF"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl">{error}</div>
        )}

        {loading && !report ? (
          <div className="text-center text-slate-400 py-16">Loading…</div>
        ) : report && v ? (
          <div className={`space-y-6 ${loading ? "opacity-60" : ""}`}>
            <section className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5">
              <div className="flex flex-col lg:flex-row lg:items-end gap-3 mb-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-white">Products — Sold quantity x price</h2>
                </div>
                <div className="flex flex-wrap gap-2 lg:ml-auto">
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search product…"
                    className="h-9 w-44 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-white placeholder:text-white/35 focus:border-teal-500"
                  />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-9 bg-white/5 border border-white/10 rounded-lg px-2 text-sm text-white"
                  >
                    <option value="all">All categories</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className="h-9 bg-white/5 border border-white/10 rounded-lg px-2 text-sm text-white"
                  >
                    <option value="minValue">Sort: Qty x Price</option>
                    <option value="soldQty">Sort: Sold qty</option>
                    <option value="minPrice">Sort: Price</option>
                    <option value="name">Sort: Name</option>
                  </select>
                  <label className="h-9 flex items-center gap-2 px-3 rounded-lg border border-white/10 bg-white/5 text-sm text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={onlySold}
                      onChange={(e) => setOnlySold(e.target.checked)}
                    />
                    Only sold
                  </label>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg bg-white">
                <table className="w-full min-w-[640px] border-collapse text-[13px] text-black bg-white">
                  <thead>
                    <tr>
                      <th className={`${th} text-center`}>S.No</th>
                      <th className={th}>Product</th>
                      <th className={th}>Category</th>
                      <th className={`${th} text-right`}>Price</th>
                      <th className={`${th} text-right`}>Sold Qty</th>
                      <th className={`${th} text-right`}>Qty x Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td className={`${td} text-center`} colSpan={6}>
                          No products match.
                        </td>
                      </tr>
                    ) : (
                      rows.map((r, i) => (
                        <tr key={r.productId}>
                          <td className={`${td} text-center`}>{i + 1}</td>
                          <td className={td}>
                            {r.name}
                            {!r.isActive && <span className="ml-1 text-[11px] italic">(inactive)</span>}
                          </td>
                          <td className={td}>{r.category}</td>
                          <td className={`${td} text-right whitespace-nowrap`}>
                            {money(r.minPrice)}/{r.unit === "piece" ? "pc" : r.unit}
                          </td>
                          <td className={`${td} text-right whitespace-nowrap`}>{qty(r.soldQty, r.unit)}</td>
                          <td className={`${td} text-right whitespace-nowrap font-semibold`}>
                            {r.soldQty ? money(r.minValue) : "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold">
                      <td className={`${td} text-right`} colSpan={4}>
                        TOTAL ({rows.length} products)
                      </td>
                      <td className={`${td} text-right whitespace-nowrap`}>
                        {[shown.kg ? qty(shown.kg, "kg") : "", shown.pcs ? qty(shown.pcs, "piece") : ""]
                          .filter(Boolean)
                          .join(" + ") || "-"}
                      </td>
                      <td className={`${td} text-right whitespace-nowrap`}>{money(shown.minValue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {report.unmatched.length > 0 && (
                <p className="text-xs text-amber-300/90 mt-3">
                  Sold items not in the product list (not counted above):{" "}
                  {report.unmatched.map((u) => `${u.name} ${qty(u.soldQty, u.unit)}`).join(", ")}
                </p>
              )}
            </section>

            <section className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
              <h2 className="text-lg font-bold text-white">Vendor purchases & settlements</h2>

              <div className="overflow-x-auto rounded-lg bg-white">
                <table className="w-full min-w-[520px] border-collapse text-[13px] text-black bg-white">
                  <thead>
                    <tr>
                      <th className={th}>Vendor</th>
                      <th className={`${th} text-right`}>Purchases</th>
                      <th className={`${th} text-right`}>Settled</th>
                      <th className={`${th} text-right`}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.totals.map((t) => (
                      <tr key={t.key}>
                        <td className={td}>{t.label}</td>
                        <td className={`${td} text-right`}>{money(t.purchased)}</td>
                        <td className={`${td} text-right`}>{money(t.settled)}</td>
                        <td className={`${td} text-right font-semibold`}>{money(t.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold">
                      <td className={`${td} text-right`}>TOTAL</td>
                      <td className={`${td} text-right`}>{money(v.totalPurchased)}</td>
                      <td className={`${td} text-right`}>{money(v.totalSettled)}</td>
                      <td className={`${td} text-right`}>{money(v.totalBalance)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
}
