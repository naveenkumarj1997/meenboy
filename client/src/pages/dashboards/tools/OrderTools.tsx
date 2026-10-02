import { useEffect, useMemo, useState } from "react";
import {
  getPurchasePlan,
  getToolDayOrders,
  getToolRoutes,
  type PurchasePlanRow,
  type ToolDayOrder,
  type ToolRoute
} from "../../../lib/api";
import { Card, DateNav, Field, Notice } from "./toolsUi";
import {
  addDaysYmd,
  btnGhost,
  btnPrimary,
  btnSmall,
  copyText,
  inputCls,
  money,
  prettyDate,
  qtyText,
  selectCls,
  shortName,
  todayIst,
  type ToolProps
} from "./toolsHelpers";

const esc = (s: string) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Opens a print-only window; the main app's dark styles don't get in the way. */
const printHtml = (title: string, css: string, body: string) => {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>${body}<script>window.onload=function(){setTimeout(function(){window.print()},200)}</scr` +
      `ipt></body></html>`
  );
  w.document.close();
  return true;
};

const LABEL_CSS = `
*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#000}
.sheet{display:grid;gap:4mm;padding:6mm}
.cols-2{grid-template-columns:repeat(2,1fr)}.cols-3{grid-template-columns:repeat(3,1fr)}.cols-1{grid-template-columns:1fr}
.label{border:1.5px dashed #000;border-radius:3mm;padding:3mm;break-inside:avoid;page-break-inside:avoid;font-size:11px;line-height:1.3}
.top{display:flex;justify-content:space-between;font-size:10px;font-weight:bold;border-bottom:1px solid #000;padding-bottom:1.5mm;margin-bottom:1.5mm}
.name{font-size:15px;font-weight:bold}.phone{font-size:13px;font-weight:bold}
.addr{margin:1mm 0}.items{margin:1.5mm 0 0;padding-left:4mm}.items li{margin:0.5mm 0}
.foot{display:flex;justify-content:space-between;border-top:1px solid #000;margin-top:1.5mm;padding-top:1.5mm;font-weight:bold}
.note{font-style:italic;margin-top:1mm}
@media print{.sheet{padding:0}@page{margin:6mm}}
`;

export function LabelsTool({ token }: ToolProps) {
  const [date, setDate] = useState(todayIst());
  const [orders, setOrders] = useState<ToolDayOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [partner, setPartner] = useState("all");
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [cols, setCols] = useState("2");
  const [showPrice, setShowPrice] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError("");
    getToolDayOrders(token, date)
      .then((r) => {
        setOrders(r.orders);
        setPicked(Object.fromEntries(r.orders.map((o) => [o.orderId, true])));
      })
      .catch((e) => setError(e.message || "Failed to load orders"))
      .finally(() => setLoading(false));
  }, [token, date]);

  const partners = useMemo(
    () => [...new Map(orders.filter((o) => o.partnerId).map((o) => [o.partnerId, o.partnerName])).entries()],
    [orders]
  );
  const visible = useMemo(
    () =>
      orders
        .filter((o) => partner === "all" || (partner === "none" ? !o.partnerId : o.partnerId === partner))
        .sort(
          (a, b) =>
            a.partnerName.localeCompare(b.partnerName) || (a.sequence ?? 999) - (b.sequence ?? 999)
        ),
    [orders, partner]
  );
  const chosen = visible.filter((o) => picked[o.orderId]);

  const handlePrint = () => {
    const body = `<div class="sheet cols-${cols}">${chosen
      .map(
        (o) => `<div class="label">
  <div class="top"><span>FISHFRIENDLY · #${esc(o.shortId)}</span><span>${esc(o.deliveryTime)}</span></div>
  <div class="name">${esc(o.customerName)}</div>
  <div class="phone">${esc(o.phone)}</div>
  <div class="addr">${esc(o.address)}</div>
  <ul class="items">${o.items
    .map(
      (it) =>
        `<li><b>${esc(shortName(it.productName))}</b>${it.cutName ? ` (${esc(it.cutName)})` : ""} — ${esc(qtyText(it.quantity, it.unit))}${it.notes ? ` <i>· ${esc(it.notes)}</i>` : ""}</li>`
    )
    .join("")}</ul>
  ${o.customerNotes ? `<div class="note">Note: ${esc(o.customerNotes)}</div>` : ""}
  <div class="foot"><span>${o.partnerName ? `${esc(o.partnerName)}${o.sequence !== null ? ` · Stop ${o.sequence + 1}` : ""}` : "Not assigned"}</span><span>${
    showPrice ? (o.dailyPriceUpdated ? esc(money(o.total)) : `~${esc(money(o.total))}`) : ""
  }</span></div>
</div>`
      )
      .join("")}</div>`;
    if (!printHtml(`Labels ${date}`, LABEL_CSS, body)) setError("Allow pop-ups for this site to print labels.");
  };

  return (
    <Card title="Packing labels" subtitle="Print a sticker for each order to put on the packet.">
      <div className="flex flex-wrap items-end gap-3">
        <DateNav value={date} onChange={setDate} />
        <div className="w-48">
          <select className={selectCls} value={partner} onChange={(e) => setPartner(e.target.value)}>
            <option value="all">All partners</option>
            {partners.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
            <option value="none">Not assigned</option>
          </select>
        </div>
        <div className="w-40">
          <select className={selectCls} value={cols} onChange={(e) => setCols(e.target.value)}>
            <option value="1">1 per row (big)</option>
            <option value="2">2 per row</option>
            <option value="3">3 per row (small)</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300 h-10">
          <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} className="accent-teal-500" />
          Show amount
        </label>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : !visible.length ? (
        <Notice>No orders for {prettyDate(date)}.</Notice>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={btnPrimary} disabled={!chosen.length} onClick={handlePrint}>
              Print {chosen.length} label{chosen.length === 1 ? "" : "s"}
            </button>
            <button type="button" className={btnSmall} onClick={() => setPicked((p) => ({ ...p, ...Object.fromEntries(visible.map((o) => [o.orderId, true])) }))}>
              Select all
            </button>
            <button type="button" className={btnSmall} onClick={() => setPicked((p) => ({ ...p, ...Object.fromEntries(visible.map((o) => [o.orderId, false])) }))}>
              Clear
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {visible.map((o) => (
              <label
                key={o.orderId}
                className={`flex gap-3 rounded-xl border p-3 cursor-pointer ${
                  picked[o.orderId] ? "border-teal-400/50 bg-teal-500/5" : "border-white/10 bg-white/[0.02]"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1 accent-teal-500"
                  checked={Boolean(picked[o.orderId])}
                  onChange={(e) => setPicked((p) => ({ ...p, [o.orderId]: e.target.checked }))}
                />
                <div className="min-w-0 text-sm">
                  <div className="font-bold text-white">
                    {o.customerName} <span className="text-xs text-slate-500">#{o.shortId}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {o.deliveryTime} · {o.partnerName || "Not assigned"}
                    {o.sequence !== null && o.partnerName ? ` · Stop ${o.sequence + 1}` : ""}
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    {o.items.map((it) => `${shortName(it.productName)} ${qtyText(it.quantity, it.unit)}`).join(", ")}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

export function PurchasePlanTool({ token }: ToolProps) {
  const [date, setDate] = useState(addDaysYmd(todayIst(), 1));
  const [data, setData] = useState<{ weeksOfHistory: number; orderCount: number; plan: PurchasePlanRow[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [buffer, setBuffer] = useState("10");
  const [includeWalkIn, setIncludeWalkIn] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");
    getPurchasePlan(token, date)
      .then(setData)
      .catch((e) => setError(e.message || "Failed to load purchase plan"))
      .finally(() => setLoading(false));
  }, [token, date]);

  const rows = useMemo(() => {
    const buf = 1 + (Number(buffer) || 0) / 100;
    return (data?.plan || [])
      .map((r) => {
        const cleaned = r.bookedQty + (includeWalkIn ? r.walkInAvg : 0);
        const whole = (r.yieldPercent ? cleaned / (r.yieldPercent / 100) : cleaned) * buf;
        const buy = r.unit === "kg" ? Math.ceil(whole * 4 - 1e-9) / 4 : Math.ceil(whole - 1e-9);
        return { ...r, cleaned: Math.round(cleaned * 100) / 100, buy };
      })
      .filter((r) => r.buy > 0);
  }, [data, buffer, includeWalkIn]);

  const byCategory = useMemo(() => {
    const map = new Map<string, typeof rows>();
    rows.forEach((r) => {
      if (!map.has(r.category)) map.set(r.category, []);
      map.get(r.category)!.push(r);
    });
    return [...map.entries()];
  }, [rows]);

  const shareText = () =>
    [
      `Purchase list for ${prettyDate(date)}`,
      ...byCategory.flatMap(([cat, list]) => [
        "",
        `*${cat}*`,
        ...list.map((r) => `• ${shortName(r.name)} — ${qtyText(r.buy, r.unit)}`)
      ])
    ].join("\n");

  return (
    <Card
      title="Purchase planner"
      subtitle={`Booked orders for the day + average walk-in sales on the same weekday (last ${data?.weeksOfHistory || 8} weeks), adjusted for cleaning loss.`}
    >
      <div className="flex flex-wrap items-end gap-3">
        <DateNav value={date} onChange={setDate} />
        <div className="w-36">
          <Field label="Extra buffer %">
            <input className={inputCls} type="number" min="0" max="100" value={buffer} onChange={(e) => setBuffer(e.target.value)} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300 h-10">
          <input type="checkbox" className="accent-teal-500" checked={includeWalkIn} onChange={(e) => setIncludeWalkIn(e.target.checked)} />
          Add walk-in average
        </label>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : !rows.length ? (
        <Notice>
          Nothing to buy for {prettyDate(date)} yet — {data?.orderCount || 0} order(s) booked and no walk-in history for this weekday.
        </Notice>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-400">{data?.orderCount} order(s) booked for {prettyDate(date)}.</span>
            <button
              type="button"
              className={btnPrimary}
              onClick={async () => {
                if (await copyText(shareText())) {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                }
              }}
            >
              {copied ? "Copied" : "Copy list for WhatsApp"}
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-slate-300">
                <tr>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-right">Booked</th>
                  <th className="px-3 py-2 text-right">Walk-in avg</th>
                  <th className="px-3 py-2 text-right">Cleaned need</th>
                  <th className="px-3 py-2 text-right">Yield</th>
                  <th className="px-3 py-2 text-right">Buy (whole)</th>
                </tr>
              </thead>
              <tbody>
                {byCategory.map(([cat, list]) => [
                  <tr key={`h-${cat}`} className="bg-white/[0.03]">
                    <td colSpan={6} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-teal-300">
                      {cat}
                    </td>
                  </tr>,
                  ...list.map((r) => (
                    <tr key={r.productId} className="border-t border-white/5">
                      <td className="px-3 py-2 text-white">{shortName(r.name)}</td>
                      <td className="px-3 py-2 text-right text-slate-300">
                        {r.bookedQty ? `${qtyText(r.bookedQty, r.unit)} (${r.bookedOrders})` : "-"}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-300">
                        {includeWalkIn && r.walkInAvg ? qtyText(r.walkInAvg, r.unit) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-300">{qtyText(r.cleaned, r.unit)}</td>
                      <td className="px-3 py-2 text-right text-slate-400">{r.yieldPercent ? `${r.yieldPercent}%` : "—"}</td>
                      <td className="px-3 py-2 text-right font-black text-white">{qtyText(r.buy, r.unit)}</td>
                    </tr>
                  ))
                ])}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">
            "—" yield means no cleaning loss is saved for that product, so it's bought at the cleaned quantity. Save
            yields in the Cleaning Yield tool.
          </p>
        </>
      )}
    </Card>
  );
}

const STATUS_LABEL: Record<string, string> = {
  assigned: "Assigned",
  picked_up: "Picked up",
  en_route: "On the way",
  delivered: "Delivered",
  failed: "Failed",
  cancelled: "Cancelled"
};

export function RouteTool({ token }: ToolProps) {
  const [date, setDate] = useState(todayIst());
  const [data, setData] = useState<{ routes: ToolRoute[]; unassigned: number; stopsPerLink: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingOnly, setPendingOnly] = useState(true);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    getToolRoutes(token, date)
      .then(setData)
      .catch((e) => setError(e.message || "Failed to load routes"))
      .finally(() => setLoading(false));
  }, [token, date]);

  return (
    <Card
      title="Route opener"
      subtitle={`Open each partner's stops, in delivery order, in Google Maps. Long routes are split into links of ${data?.stopsPerLink || 4} stops so they work on phones.`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <DateNav value={date} onChange={setDate} />
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" className="accent-teal-500" checked={pendingOnly} onChange={(e) => setPendingOnly(e.target.checked)} />
          Only stops not delivered yet
        </label>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {data && data.unassigned > 0 && (
        <Notice tone="warn">{data.unassigned} order(s) on this day have no partner assigned and are not in any route.</Notice>
      )}
      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : !data?.routes.length ? (
        <Notice>No assigned deliveries for {prettyDate(date)}.</Notice>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.routes.map((r) => {
            const links = pendingOnly ? r.pendingLinks : r.links;
            const stops = pendingOnly
              ? r.stops.filter((s) => !["delivered", "failed", "cancelled"].includes(s.assignmentStatus))
              : r.stops;
            const text = [
              `Route for ${r.partnerName} — ${prettyDate(date)}`,
              ...links.map((l) => `${l.label}: ${l.url}`)
            ].join("\n");
            return (
              <div key={r.partnerId} className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-lg font-bold text-white capitalize">{r.partnerName}</div>
                    <div className="text-xs text-slate-400">
                      {r.stops.length} stop(s) · {r.pendingCount} not delivered
                    </div>
                  </div>
                  {links.length > 0 && (
                    <button
                      type="button"
                      className={btnSmall}
                      onClick={async () => {
                        if (await copyText(text)) {
                          setCopied(r.partnerId);
                          window.setTimeout(() => setCopied(""), 1500);
                        }
                      }}
                    >
                      {copied === r.partnerId ? "Copied" : "Copy links to send"}
                    </button>
                  )}
                </div>
                {links.length ? (
                  <div className="flex flex-wrap gap-2">
                    {links.map((l) => (
                      <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className={btnPrimary}>
                        Open {l.label}
                      </a>
                    ))}
                  </div>
                ) : (
                  <Notice tone="success">All stops delivered.</Notice>
                )}
                <ol className="space-y-1.5">
                  {stops.map((s, i) => (
                    <li key={s.orderId} className="flex gap-3 text-sm">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-teal-500/20 text-xs font-bold text-teal-200">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-white">
                          {s.customerName}{" "}
                          <span className="text-xs font-normal text-slate-500">
                            {s.deliveryTime} · {STATUS_LABEL[s.assignmentStatus] || s.assignmentStatus}
                          </span>
                        </div>
                        <div className="truncate text-xs text-slate-400">{s.address}</div>
                        {!s.hasPin && (
                          <div className="text-xs text-amber-300">No map pin — the address text is used, so check this stop.</div>
                        )}
                      </div>
                      {s.mapLink && (
                        <a href={s.mapLink} target="_blank" rel="noreferrer" className={`${btnGhost} h-8 px-2 text-xs`}>
                          Map
                        </a>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
