import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import {
  getPriceHistory,
  getPriceHistoryProducts,
  type PriceHistory,
  type PriceProduct
} from "../../lib/api";

const COLORS = {
  rate: "#2dd4bf",
  band: "#14b8a6",
  sold: "#fbbf24",
  avg: "#a78bfa",
  listed: "#64748b",
  qty: "#38bdf8",
  grid: "#1e293b",
  axis: "#64748b"
};

const istToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

const shiftDays = (ymd: string, days: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const shiftMonths = (ymd: string, months: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
};

type Period = "30d" | "3m" | "6m" | "1y" | "month" | "year" | "all" | "custom";

const PERIODS: Array<[Period, string]> = [
  ["30d", "30 days"],
  ["3m", "3 months"],
  ["6m", "6 months"],
  ["1y", "1 year"],
  ["month", "This month"],
  ["year", "This year"],
  ["all", "All time"],
  ["custom", "Custom"]
];

const rangeFor = (period: Period, custom: { from: string; to: string }) => {
  const today = istToday();
  switch (period) {
    case "30d":
      return { from: shiftDays(today, -29), to: today };
    case "3m":
      return { from: shiftMonths(today, -3), to: today };
    case "6m":
      return { from: shiftMonths(today, -6), to: today };
    case "1y":
      return { from: shiftMonths(today, -12), to: today };
    case "month":
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case "year":
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    case "all":
      return { from: "2020-01-01", to: today };
    default:
      return custom;
  }
};

const rs = (n: number | null | undefined, digits = 0) =>
  n == null
    ? "—"
    : `₹${Number(n).toLocaleString("en-IN", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits === 0 ? 2 : digits
      })}`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const shortDate = (ymd: string) => {
  const [y, m, d] = ymd.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]}${y ? ` ${y.slice(2)}` : ""}`;
};

const monthLabel = (key: string) => {
  const [y, m] = key.split("-");
  return `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
};

const fullDate = (ymd?: string | null) => {
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-");
  const dt = new Date(`${ymd}T00:00:00Z`);
  return `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getUTCDay()]}, ${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
};

function ChartTooltip({
  active,
  payload,
  label,
  unit,
  labelFormatter
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  unit: string;
  labelFormatter?: (l: string) => string;
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value != null && p.dataKey !== "band");
  const band = payload.find((p) => p.dataKey === "band")?.payload;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/95 px-3 py-2 shadow-xl text-xs min-w-[160px]">
      <div className="font-bold text-white mb-1">{labelFormatter ? labelFormatter(String(label)) : label}</div>
      {rows.map((p) => (
        <div key={String(p.dataKey)} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color || p.stroke || p.fill }} />
          <span className="text-slate-400">{p.name}</span>
          <span className="ml-auto font-semibold text-white">
            {String(p.dataKey).toLowerCase().includes("qty") ? `${p.value} ${unit}` : rs(p.value)}
          </span>
        </div>
      ))}
      {band && band.rateLow != null && band.rateHigh != null && band.rateLow !== band.rateHigh ? (
        <div className="text-slate-500 mt-1">
          Cut range {rs(band.rateLow)} – {rs(band.rateHigh)}
        </div>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone = "text-white",
  accent
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-4 min-w-0">
      <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: accent }} />
      <div className="text-[11px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`text-lg sm:text-2xl font-black mt-1 truncate ${tone}`}>{value}</div>
      {sub ? <div className="text-[11px] text-slate-500 mt-0.5 truncate">{sub}</div> : null}
    </div>
  );
}

function Panel({ title, subtitle, children, right }: { title: string; subtitle?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3 sm:p-5 min-w-0">
      <div className="flex flex-wrap items-start gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-white">{title}</h3>
          {subtitle ? <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p> : null}
        </div>
        {right ? <div className="ml-auto">{right}</div> : null}
      </div>
      {children}
    </div>
  );
}

export default function AdminPriceRangeGraph() {
  const { token } = useAuth();
  const [products, setProducts] = useState<PriceProduct[]>([]);
  const [productId, setProductId] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  const [period, setPeriod] = useState<Period>("3m");
  const [custom, setCustom] = useState(() => ({ from: shiftDays(istToday(), -29), to: istToday() }));
  const [cut, setCut] = useState("");
  const [showSold, setShowSold] = useState(true);
  const [showListed, setShowListed] = useState(true);

  const [data, setData] = useState<PriceHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    getPriceHistoryProducts(token)
      .then((res) => {
        setProducts(res.products || []);
        const saved = localStorage.getItem("ff_price_graph_product");
        const initial = res.products.find((p) => p._id === saved) || res.products[0];
        if (initial) setProductId(initial._id);
      })
      .catch((err) => setError(err.message || "Failed to load products"));
  }, [token]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const range = useMemo(() => rangeFor(period, custom), [period, custom]);

  useEffect(() => {
    if (!token || !productId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    getPriceHistory(token, { productId, from: range.from, to: range.to, cut: cut || undefined })
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err.message || "Failed to load price history"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token, productId, range.from, range.to, cut]);

  const selectProduct = (id: string) => {
    setProductId(id);
    setCut("");
    setPickerOpen(false);
    setProductQuery("");
    localStorage.setItem("ff_price_graph_product", id);
  };

  const selectedProduct = products.find((p) => p._id === productId);
  const unit = data?.product.unit || selectedProduct?.unit || "kg";

  const groupedProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    const map: Record<string, PriceProduct[]> = {};
    products
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
      .forEach((p) => {
        (map[p.category] ||= []).push(p);
      });
    return Object.entries(map);
  }, [products, productQuery]);

  const chartSeries = useMemo(
    () =>
      (data?.series || []).map((s) => ({
        ...s,
        band: s.rateLow != null && s.rateHigh != null ? [s.rateLow, s.rateHigh] : null
      })),
    [data]
  );

  const monthlyChart = useMemo(
    () => (data?.monthly || []).map((m) => ({ ...m, label: monthLabel(m.key) })),
    [data]
  );

  const weekdayMax = useMemo(
    () => Math.max(0, ...(data?.weekday || []).map((w) => w.avg || 0)),
    [data]
  );

  const s = data?.summary;
  const change = s?.changePct;
  const hasData = Boolean(data && data.series.length);

  const yDomain = useMemo(() => {
    if (!data) return [0, "auto"] as [number, string];
    const vals: number[] = [];
    data.series.forEach((p) => {
      [p.dailyRate, p.rateLow, p.rateHigh, showSold ? p.soldAvg : null].forEach((v) => v != null && vals.push(v));
    });
    if (showListed) {
      if (data.product.minPrice) vals.push(data.product.minPrice);
      if (data.product.maxPrice) vals.push(data.product.maxPrice);
    }
    if (!vals.length) return [0, "auto"] as [number, string];
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = Math.max(10, (hi - lo) * 0.12);
    return [Math.max(0, Math.floor((lo - pad) / 10) * 10), Math.ceil((hi + pad) / 10) * 10] as [number, number];
  }, [data, showSold, showListed]);

  return (
    <DashboardShell
      title="Price Range Graph"
      description="See the daily price of any product for each delivery day, and how it moved across months and years."
      navLinks={ADMIN_NAV_LINKS}
    >
      <div className="space-y-4 sm:space-y-5">
        {error && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-300 p-3 rounded-xl text-sm">{error}</div>
        )}

        {/* Controls */}
        <div className="relative z-40 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-3 sm:p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 md:items-end">
            <div ref={pickerRef} className="relative md:w-80 min-w-0">
              <label className="block text-xs text-slate-400 mb-1">Product</label>
              <button
                type="button"
                onClick={() => setPickerOpen((o) => !o)}
                className="w-full flex items-center gap-3 bg-slate-950 border border-slate-700 hover:border-teal-500/50 rounded-xl px-3 py-2.5 text-left"
              >
                {selectedProduct?.image ? (
                  <img src={selectedProduct.image} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
                ) : (
                  <span className="h-8 w-8 rounded-lg bg-teal-500/15 text-teal-300 grid place-items-center text-sm font-bold shrink-0">
                    {selectedProduct?.name?.[0] || "?"}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-white truncate">
                    {selectedProduct?.name || "Choose a product"}
                  </span>
                  <span className="block text-[11px] text-slate-500 truncate">
                    {selectedProduct
                      ? `${selectedProduct.category} · listed ${rs(selectedProduct.minPrice)}–${rs(selectedProduct.maxPrice)}/${selectedProduct.unit}`
                      : ""}
                  </span>
                </span>
                <span className="text-slate-500 text-xs">▾</span>
              </button>
              {pickerOpen ? (
                <div
                  className="absolute z-50 mt-2 w-full rounded-xl border border-slate-600 shadow-2xl shadow-black/60 overflow-hidden"
                  style={{ backgroundColor: "#062a33" }}
                >
                  <div className="p-2 border-b border-slate-700">
                    <input
                      autoFocus
                      type="search"
                      value={productQuery}
                      onChange={(e) => setProductQuery(e.target.value)}
                      placeholder="Search product or category"
                      className="w-full border border-slate-600 rounded-lg px-3 py-2 text-white text-base sm:text-sm"
                      style={{ backgroundColor: "#083844" }}
                    />
                  </div>
                  <div className="max-h-72 overflow-y-auto py-1">
                    {groupedProducts.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-slate-500 text-center">No products found</div>
                    ) : (
                      groupedProducts.map(([cat, list]) => (
                        <div key={cat}>
                          <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-slate-500">{cat}</div>
                          {list.map((p) => (
                            <button
                              key={p._id}
                              type="button"
                              onClick={() => selectProduct(p._id)}
                              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${
                                p._id === productId ? "bg-teal-500/15 text-teal-200" : "text-slate-200 hover:bg-slate-800"
                              }`}
                            >
                              <span className="truncate">{p.name}</span>
                              <span className="ml-auto text-[11px] text-slate-500 shrink-0">
                                {rs(p.minPrice)}–{rs(p.maxPrice)}
                              </span>
                            </button>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {(data?.cuts?.length || 0) > 1 ? (
              <div className="md:w-48">
                <label className="block text-xs text-slate-400 mb-1">Cut</label>
                <select
                  value={cut}
                  onChange={(e) => setCut(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-white text-base sm:text-sm"
                >
                  <option value="">All cuts (average)</option>
                  {data!.cuts.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {period === "custom" ? (
              <div className="grid grid-cols-2 gap-2 md:w-72">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">From</label>
                  <input
                    type="date"
                    value={custom.from}
                    max={custom.to}
                    onChange={(e) => e.target.value && setCustom((c) => ({ ...c, from: e.target.value }))}
                    className="w-full min-w-0 bg-slate-950 border border-slate-700 rounded-xl px-2 py-2.5 text-white text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">To</label>
                  <input
                    type="date"
                    value={custom.to}
                    min={custom.from}
                    max={istToday()}
                    onChange={(e) => e.target.value && setCustom((c) => ({ ...c, to: e.target.value }))}
                    className="w-full min-w-0 bg-slate-950 border border-slate-700 rounded-xl px-2 py-2.5 text-white text-base sm:text-sm"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {PERIODS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPeriod(id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                  period === id
                    ? "bg-teal-500 text-slate-950 border-teal-400"
                    : "bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading && !data ? (
          <div className="rounded-2xl border border-slate-800 p-12 text-center text-slate-400">Loading prices…</div>
        ) : !data ? null : (
          <div className={`space-y-4 sm:space-y-5 transition-opacity ${loading ? "opacity-60" : ""}`}>
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <StatCard
                label={`Average / ${unit}`}
                value={rs(s?.avg)}
                sub={`${s?.days || 0} priced day${s?.days === 1 ? "" : "s"}`}
                tone="text-teal-300"
                accent={COLORS.rate}
              />
              <StatCard
                label="Lowest"
                value={rs(s?.lowest?.price)}
                sub={fullDate(s?.lowest?.date)}
                tone="text-emerald-300"
                accent="#34d399"
              />
              <StatCard
                label="Highest"
                value={rs(s?.highest?.price)}
                sub={fullDate(s?.highest?.date)}
                tone="text-rose-300"
                accent="#fb7185"
              />
              <StatCard
                label="Change in period"
                value={change == null ? "—" : `${change > 0 ? "▲" : change < 0 ? "▼" : "•"} ${Math.abs(change)}%`}
                sub={s?.first && s?.last ? `${rs(s.first.price)} → ${rs(s.last.price)}` : undefined}
                tone={change == null ? "text-white" : change > 0 ? "text-rose-300" : change < 0 ? "text-emerald-300" : "text-white"}
                accent={COLORS.avg}
              />
              <StatCard
                label="Price spread"
                value={rs(s?.spread)}
                sub={s?.min != null ? `${rs(s.min)} to ${rs(s.max)}` : undefined}
                accent="#f472b6"
              />
              <StatCard
                label="Avg sold price"
                value={rs(s?.soldAvg)}
                sub="Weighted by quantity"
                tone="text-amber-300"
                accent={COLORS.sold}
              />
              <StatCard
                label="Quantity sold"
                value={`${(s?.totalQty || 0).toLocaleString("en-IN")} ${unit}`}
                sub="Delivered + walk-in"
                tone="text-sky-300"
                accent={COLORS.qty}
              />
              <StatCard
                label="Sales value"
                value={rs(s?.totalAmount)}
                sub={`${fullDate(data.range.from)} – ${fullDate(data.range.to)}`}
                accent="#e2e8f0"
              />
            </div>

            {!hasData ? (
              <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center text-slate-400">
                No daily prices or sales for {data.product.name} in this period. Try a longer range.
              </div>
            ) : (
              <>
                {/* Main daily chart */}
                <Panel
                  title={`Daily price · ${data.product.name}${data.cut ? ` (${data.cut})` : ""}`}
                  subtitle={`Per ${unit} for each delivery day. Shaded band = lowest to highest cut price that day.`}
                  right={
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowSold((v) => !v)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                          showSold ? "border-amber-400/50 text-amber-300 bg-amber-400/10" : "border-slate-700 text-slate-500"
                        }`}
                      >
                        Sold price
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowListed((v) => !v)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                          showListed ? "border-slate-500 text-slate-300 bg-slate-700/30" : "border-slate-700 text-slate-500"
                        }`}
                      >
                        Listed range
                      </button>
                    </div>
                  }
                >
                  <div className="h-72 sm:h-96 -ml-2 sm:ml-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartSeries} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={COLORS.band} stopOpacity={0.35} />
                            <stop offset="100%" stopColor={COLORS.band} stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(d) => shortDate(d).replace(/ \d{2}$/, "")}
                          tick={{ fill: COLORS.axis, fontSize: 11 }}
                          axisLine={{ stroke: COLORS.grid }}
                          tickLine={false}
                          minTickGap={24}
                        />
                        <YAxis
                          domain={yDomain as any}
                          tickFormatter={(v) => `₹${v}`}
                          tick={{ fill: COLORS.axis, fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          width={54}
                        />
                        <Tooltip
                          content={<ChartTooltip unit={unit} labelFormatter={fullDate} />}
                          cursor={{ stroke: "#475569", strokeDasharray: "4 4" }}
                        />
                        <Legend
                          verticalAlign="top"
                          height={28}
                          iconType="circle"
                          wrapperStyle={{ fontSize: 11, color: "#94a3b8" }}
                        />
                        {showListed && data.product.minPrice ? (
                          <ReferenceLine
                            y={data.product.minPrice}
                            stroke={COLORS.listed}
                            strokeDasharray="6 4"
                            label={{ value: `Listed min ${rs(data.product.minPrice)}`, fill: COLORS.listed, fontSize: 10, position: "insideBottomRight" }}
                          />
                        ) : null}
                        {showListed && data.product.maxPrice ? (
                          <ReferenceLine
                            y={data.product.maxPrice}
                            stroke={COLORS.listed}
                            strokeDasharray="6 4"
                            label={{ value: `Listed max ${rs(data.product.maxPrice)}`, fill: COLORS.listed, fontSize: 10, position: "insideTopRight" }}
                          />
                        ) : null}
                        {s?.avg != null ? (
                          <ReferenceLine
                            y={s.avg}
                            stroke={COLORS.avg}
                            strokeDasharray="2 4"
                            label={{ value: `Avg ${rs(s.avg)}`, fill: COLORS.avg, fontSize: 10, position: "insideTopLeft" }}
                          />
                        ) : null}
                        <Area
                          type="monotone"
                          dataKey="band"
                          name="Cut range"
                          stroke="none"
                          fill="url(#bandFill)"
                          connectNulls
                          isAnimationActive={false}
                          legendType="none"
                        />
                        <Line
                          type="monotone"
                          dataKey="dailyRate"
                          name="Daily price"
                          stroke={COLORS.rate}
                          strokeWidth={2.5}
                          dot={chartSeries.length <= 45 ? { r: 3, fill: COLORS.rate, strokeWidth: 0 } : false}
                          activeDot={{ r: 6, stroke: "#0f172a", strokeWidth: 2 }}
                          connectNulls
                        />
                        {showSold ? (
                          <Line
                            type="monotone"
                            dataKey="soldAvg"
                            name="Avg sold price"
                            stroke={COLORS.sold}
                            strokeWidth={2}
                            strokeDasharray="5 4"
                            dot={false}
                            activeDot={{ r: 5, stroke: "#0f172a", strokeWidth: 2 }}
                            connectNulls
                          />
                        ) : null}
                        {chartSeries.length > 40 ? (
                          <Brush
                            dataKey="date"
                            height={22}
                            stroke="#334155"
                            fill="#0f172a"
                            travellerWidth={8}
                            tickFormatter={(d) => shortDate(d)}
                          />
                        ) : null}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>

                <div className="grid xl:grid-cols-2 gap-4 sm:gap-5">
                  {/* Monthly min / avg / max */}
                  <Panel title="Month by month" subtitle={`Average price per ${unit}, with lowest and highest day`}>
                    <div className="h-64 sm:h-72 -ml-2 sm:ml-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={monthlyChart} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="monthBar" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={COLORS.rate} stopOpacity={0.9} />
                              <stop offset="100%" stopColor={COLORS.rate} stopOpacity={0.35} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="label" tick={{ fill: COLORS.axis, fontSize: 11 }} axisLine={{ stroke: COLORS.grid }} tickLine={false} />
                          <YAxis tickFormatter={(v) => `₹${v}`} tick={{ fill: COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={54} />
                          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
                          <Legend verticalAlign="top" height={26} iconType="circle" wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
                          <Bar dataKey="avg" name="Average" fill="url(#monthBar)" radius={[6, 6, 0, 0]} maxBarSize={42} />
                          <Line type="monotone" dataKey="max" name="Highest" stroke="#fb7185" strokeWidth={2} dot={{ r: 3, fill: "#fb7185", strokeWidth: 0 }} />
                          <Line type="monotone" dataKey="min" name="Lowest" stroke="#34d399" strokeWidth={2} dot={{ r: 3, fill: "#34d399", strokeWidth: 0 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </Panel>

                  {/* Monthly quantity */}
                  <Panel title="Quantity sold per month" subtitle="Delivered orders and walk-in bills">
                    <div className="h-64 sm:h-72 -ml-2 sm:ml-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyChart} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="qtyBar" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={COLORS.qty} stopOpacity={0.95} />
                              <stop offset="100%" stopColor={COLORS.qty} stopOpacity={0.3} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="label" tick={{ fill: COLORS.axis, fontSize: 11 }} axisLine={{ stroke: COLORS.grid }} tickLine={false} />
                          <YAxis tickFormatter={(v) => `${v}`} tick={{ fill: COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
                          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
                          <Bar dataKey="qty" name="Quantity" fill="url(#qtyBar)" radius={[6, 6, 0, 0]} maxBarSize={42} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Panel>

                  {/* Weekday */}
                  <Panel title="Price by day of week" subtitle="Which delivery days are usually costlier">
                    <div className="h-56 sm:h-64 -ml-2 sm:ml-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.weekday} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                          <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="key" tick={{ fill: COLORS.axis, fontSize: 11 }} axisLine={{ stroke: COLORS.grid }} tickLine={false} />
                          <YAxis tickFormatter={(v) => `₹${v}`} tick={{ fill: COLORS.axis, fontSize: 11 }} axisLine={false} tickLine={false} width={54} domain={[0, "auto"]} />
                          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
                          <Bar dataKey="avg" name="Average" radius={[6, 6, 0, 0]} maxBarSize={36}>
                            {data.weekday.map((w) => (
                              <Cell
                                key={w.key}
                                fill={w.avg != null && w.avg === weekdayMax ? "#fb7185" : COLORS.avg}
                                fillOpacity={w.avg == null ? 0.2 : 0.85}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Panel>

                  {/* Cuts */}
                  {data.byCut.length > 1 ? (
                    <Panel title="Price by cut" subtitle={`Average daily price per ${unit}`}>
                      <div className="space-y-3 py-1">
                        {data.byCut.map((c) => {
                          const top = data.byCut[0].avg || 1;
                          return (
                            <div key={c.cut}>
                              <div className="flex items-baseline gap-2 text-sm">
                                <span className="text-white font-semibold truncate">{c.cut}</span>
                                <span className="ml-auto text-teal-300 font-bold shrink-0">{rs(c.avg)}</span>
                              </div>
                              <div className="mt-1 h-2.5 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-300"
                                  style={{ width: `${Math.max(6, ((c.avg || 0) / top) * 100)}%` }}
                                />
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {rs(c.min)} – {rs(c.max)} · {c.count} day{c.count === 1 ? "" : "s"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Panel>
                  ) : (
                    <Panel title="Year by year" subtitle={`Average price per ${unit}`}>
                      <YearTable rows={data.yearly} unit={unit} />
                    </Panel>
                  )}
                </div>

                {data.byCut.length > 1 ? (
                  <Panel title="Year by year" subtitle={`Average price per ${unit}`}>
                    <YearTable rows={data.yearly} unit={unit} />
                  </Panel>
                ) : null}

                {/* Monthly table */}
                <Panel title="Monthly details" subtitle="What you sold this product for each month">
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs uppercase text-slate-500">
                        <tr className="border-b border-slate-800">
                          <th className="text-left py-2 pr-3">Month</th>
                          <th className="text-right py-2 px-3">Lowest</th>
                          <th className="text-right py-2 px-3">Average</th>
                          <th className="text-right py-2 px-3">Highest</th>
                          <th className="text-right py-2 px-3">Avg sold</th>
                          <th className="text-right py-2 px-3">Qty</th>
                          <th className="text-right py-2 pl-3">Sales</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {[...data.monthly].reverse().map((m) => (
                          <tr key={m.key} className="hover:bg-slate-800/30">
                            <td className="py-2 pr-3 text-white font-semibold">{monthLabel(m.key).replace(" ", " 20")}</td>
                            <td className="py-2 px-3 text-right text-emerald-300">{rs(m.min)}</td>
                            <td className="py-2 px-3 text-right text-teal-300 font-bold">{rs(m.avg)}</td>
                            <td className="py-2 px-3 text-right text-rose-300">{rs(m.max)}</td>
                            <td className="py-2 px-3 text-right text-amber-300">{rs(m.soldAvg)}</td>
                            <td className="py-2 px-3 text-right text-slate-300">
                              {m.qty} {unit}
                            </td>
                            <td className="py-2 pl-3 text-right text-white">{rs(m.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="sm:hidden divide-y divide-slate-800/70">
                    {[...data.monthly].reverse().map((m) => (
                      <div key={m.key} className="py-2.5">
                        <div className="flex items-baseline gap-2">
                          <span className="text-white font-semibold">{monthLabel(m.key).replace(" ", " 20")}</span>
                          <span className="ml-auto text-teal-300 font-bold">{rs(m.avg)}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          <span className="text-emerald-300">{rs(m.min)}</span> –{" "}
                          <span className="text-rose-300">{rs(m.max)}</span> · {m.qty} {unit} · {rs(m.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function YearTable({ rows, unit }: { rows: PriceHistory["yearly"]; unit: string }) {
  if (!rows.length) return <div className="text-sm text-slate-500 py-4 text-center">No data</div>;
  return (
    <div className="space-y-2">
      {[...rows].reverse().map((y) => (
        <div key={y.key} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-lg font-black text-white">{y.key}</span>
          <span className="text-sm">
            <span className="text-slate-500">Avg </span>
            <span className="text-teal-300 font-bold">{rs(y.avg)}</span>
          </span>
          <span className="text-xs text-slate-400">
            <span className="text-emerald-300">{rs(y.min)}</span> – <span className="text-rose-300">{rs(y.max)}</span>
          </span>
          <span className="ml-auto text-xs text-slate-400">
            {y.qty} {unit} · {rs(y.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}
