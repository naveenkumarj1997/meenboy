import { useEffect, useState } from "react";
import {
  downloadQuotationPdf,
  downloadToolsExport,
  getDuplicateCustomers,
  mergeDuplicateCustomers,
  type DuplicateCustomer,
  type ToolsExportType
} from "../../../lib/api";
import { triggerFileDownload, triggerPdfDownload } from "../../../lib/downloadPdf";
import { Card, Field, Notice } from "./toolsUi";
import {
  addDaysYmd,
  btnGhost,
  btnPrimary,
  btnSmall,
  inputCls,
  money,
  prettyDate,
  selectCls,
  shortName,
  todayIst,
  type ToolProps
} from "./toolsHelpers";

type QuoteLine = { key: number; productId: string; name: string; qty: string; unit: string; rate: string };

let lineKey = 1;
const newLine = (): QuoteLine => ({ key: lineKey++, productId: "", name: "", qty: "", unit: "kg", rate: "" });

export function QuotationTool({ token, products }: ToolProps) {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [validDays, setValidDays] = useState("3");
  const [lines, setLines] = useState<QuoteLine[]>([newLine()]);
  const [discount, setDiscount] = useState("");
  const [deliveryCharge, setDeliveryCharge] = useState("");
  const [notes, setNotes] = useState("");
  const [contactPhone, setContactPhone] = useState(() => localStorage.getItem("ff_quote_contact") || "");
  const [priceBasis, setPriceBasis] = useState<"min" | "max">("max");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const update = (key: number, patch: Partial<QuoteLine>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const pickProduct = (key: number, id: string) => {
    const p = products.find((x) => x._id === id);
    if (!p) return update(key, { productId: "" });
    const price = priceBasis === "max" ? p.maxPrice || p.minPrice : p.minPrice || p.maxPrice;
    update(key, { productId: id, name: shortName(p.name), unit: p.unit === "piece" ? "pcs" : p.unit, rate: price ? String(price) : "" });
  };

  const amountOf = (l: QuoteLine) => (Number(l.qty) || 0) * (Number(l.rate) || 0);
  const subtotal = lines.reduce((s, l) => s + amountOf(l), 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0) + (Number(deliveryCharge) || 0));

  const handleDownload = async () => {
    setError("");
    if (!customerName.trim()) return setError("Enter the customer name.");
    const items = lines
      .filter((l) => l.name.trim() && Number(l.qty) > 0)
      .map((l) => ({ name: l.name.trim(), qty: Number(l.qty), unit: l.unit || "kg", rate: Number(l.rate) || 0 }));
    if (!items.length) return setError("Add at least one item with a quantity.");
    try {
      setBusy(true);
      localStorage.setItem("ff_quote_contact", contactPhone.trim());
      const { blob } = await downloadQuotationPdf(token, {
        customerName: customerName.trim(),
        phone,
        address,
        eventName,
        eventDate,
        validDays: Number(validDays) || 3,
        items,
        discount: Number(discount) || 0,
        deliveryCharge: Number(deliveryCharge) || 0,
        notes,
        contactPhone
      });
      triggerPdfDownload(blob, `Quotation-${customerName.trim().replace(/[^\w-]+/g, "_")}-${todayIst()}.pdf`);
    } catch (e: any) {
      setError(e.message || "Failed to create quotation");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Quotation" subtitle="Make a PDF quotation for bulk orders, functions and events.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Customer name *">
          <input className={inputCls} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </Field>
        <Field label="Phone">
          <input className={inputCls} value={phone} inputMode="tel" onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Address">
          <input className={inputCls} value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field label="Event / function">
          <input className={inputCls} value={eventName} placeholder="Wedding, birthday, hotel…" onChange={(e) => setEventName(e.target.value)} />
        </Field>
        <Field label="Event date">
          <input className={inputCls} type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </Field>
        <Field label="Valid for (days)">
          <input className={inputCls} type="number" min="1" max="30" value={validDays} onChange={(e) => setValidDays(e.target.value)} />
        </Field>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Items</span>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            Fill rate from website
            <select className={`${selectCls} h-8 w-auto text-xs`} value={priceBasis} onChange={(e) => setPriceBasis(e.target.value as "min" | "max")}>
              <option value="max">max price</option>
              <option value="min">min price</option>
            </select>
          </label>
        </div>
        {lines.map((l) => (
          <div key={l.key} className="grid gap-2 rounded-xl border border-white/10 p-2 sm:grid-cols-[1.2fr_1.4fr_90px_80px_110px_110px_auto] sm:items-center">
            <select className={selectCls} value={l.productId} onChange={(e) => pickProduct(l.key, e.target.value)}>
              <option value="">Pick product…</option>
              {products
                .filter((p) => p.isActive)
                .map((p) => (
                  <option key={p._id} value={p._id}>
                    {shortName(p.name)}
                  </option>
                ))}
            </select>
            <input className={inputCls} placeholder="Item name (e.g. curry cut)" value={l.name} onChange={(e) => update(l.key, { name: e.target.value })} />
            <input className={inputCls} type="number" min="0" step="0.25" placeholder="Qty" value={l.qty} onChange={(e) => update(l.key, { qty: e.target.value })} />
            <select className={selectCls} value={l.unit} onChange={(e) => update(l.key, { unit: e.target.value })}>
              <option value="kg">kg</option>
              <option value="pcs">pcs</option>
              <option value="plate">plate</option>
            </select>
            <input className={inputCls} type="number" min="0" placeholder="Rate ₹" value={l.rate} onChange={(e) => update(l.key, { rate: e.target.value })} />
            <div className="text-right font-bold text-white px-2">{money(amountOf(l))}</div>
            <button
              type="button"
              className={btnSmall}
              disabled={lines.length === 1}
              onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
              aria-label="Remove item"
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" className={btnGhost} onClick={() => setLines((ls) => [...ls, newLine()])}>
          + Add item
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Discount (₹)">
          <input className={inputCls} type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </Field>
        <Field label="Delivery charge (₹)">
          <input className={inputCls} type="number" min="0" value={deliveryCharge} onChange={(e) => setDeliveryCharge(e.target.value)} />
        </Field>
        <Field label="Shop phone on PDF" hint="Remembered on this device.">
          <input className={inputCls} value={contactPhone} inputMode="tel" onChange={(e) => setContactPhone(e.target.value)} />
        </Field>
        <div className="rounded-xl bg-teal-500/10 border border-teal-400/30 p-3 text-right">
          <div className="text-xs text-slate-400">Subtotal {money(subtotal)}</div>
          <div className="text-2xl font-black text-white">{money(total)}</div>
        </div>
      </div>
      <Field label="Notes (optional)">
        <textarea className={`${inputCls} h-20 py-2`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Cleaning and cutting included. 50% advance to confirm." />
      </Field>
      {error && <Notice tone="error">{error}</Notice>}
      <button type="button" className={btnPrimary} disabled={busy} onClick={handleDownload}>
        {busy ? "Creating…" : "Download quotation PDF"}
      </button>
    </Card>
  );
}

export function DuplicatesTool({ token }: ToolProps) {
  const [groups, setGroups] = useState<Array<{ phone: string; customers: DuplicateCustomer[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keep, setKeep] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const load = () => {
    setLoading(true);
    getDuplicateCustomers(token)
      .then((r) => {
        setGroups(r.groups);
        setKeep(Object.fromEntries(r.groups.map((g) => [g.phone, g.customers[0]?._id || ""])));
      })
      .catch((e) => setError(e.message || "Failed to find duplicates"))
      .finally(() => setLoading(false));
  };
  useEffect(load, [token]);

  const merge = async (phone: string, customers: DuplicateCustomer[]) => {
    const keepId = keep[phone];
    const kept = customers.find((c) => c._id === keepId);
    const others = customers.filter((c) => c._id !== keepId);
    if (!kept || !others.length) return;
    const ok = window.confirm(
      `Keep "${kept.name}" and merge ${others.map((c) => `"${c.name}"`).join(", ")} into it?\n\n` +
        "All their orders, payments and pending balance move to the kept customer, and the other accounts are deleted. This can't be undone."
    );
    if (!ok) return;
    try {
      setBusy(phone);
      setError("");
      const res = await mergeDuplicateCustomers(token, keepId, others.map((c) => c._id));
      setMsg(`${res.message} Moved ${res.moved.orders} order(s), ${res.moved.payments + res.moved.collections} payment record(s).`);
      load();
    } catch (e: any) {
      setError(e.message || "Merge failed");
    } finally {
      setBusy("");
    }
  };

  return (
    <Card title="Duplicate customers" subtitle="Customers saved more than once with the same phone number (last 10 digits).">
      {msg && <Notice tone="success">{msg}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {loading ? (
        <p className="text-sm text-slate-400">Searching…</p>
      ) : !groups.length ? (
        <Notice tone="success">No duplicate customers found.</Notice>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.phone} className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-bold text-white">📞 {g.phone}</div>
                <button type="button" className={btnPrimary} disabled={busy === g.phone} onClick={() => merge(g.phone, g.customers)}>
                  {busy === g.phone ? "Merging…" : "Merge into selected"}
                </button>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {g.customers.map((c) => (
                  <label
                    key={c._id}
                    className={`flex gap-3 rounded-xl border p-3 cursor-pointer text-sm ${
                      keep[g.phone] === c._id ? "border-teal-400/60 bg-teal-500/10" : "border-white/10"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`keep-${g.phone}`}
                      className="mt-1 accent-teal-500"
                      checked={keep[g.phone] === c._id}
                      onChange={() => setKeep((k) => ({ ...k, [g.phone]: c._id }))}
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-white">
                        {c.name}{" "}
                        {keep[g.phone] === c._id && <span className="text-xs font-semibold text-teal-300">· keep</span>}
                      </div>
                      <div className="text-xs text-slate-400 break-all">{c.email || "No email"}</div>
                      <div className="text-xs text-slate-400">
                        {c.customerSource || "-"} · joined {prettyDate(String(c.createdAt).slice(0, 10))}
                        {c.area ? ` · ${c.area}` : ""}
                      </div>
                      <div className="text-xs text-slate-300 mt-1">
                        {c.orderCount} order(s){c.lastOrderDate ? `, last ${prettyDate(c.lastOrderDate)}` : ""} · pending{" "}
                        {money(c.pendingBalance)}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

const EXPORT_TYPES: Array<{ id: ToolsExportType; label: string; hint: string; usesDates: boolean }> = [
  { id: "orders", label: "Orders", hint: "All orders by delivery date, with items, partner and payment.", usesDates: true },
  { id: "collections", label: "Collections", hint: "Money received: delivery payments, pending collections and walk-in payments.", usesDates: true },
  { id: "walkins", label: "Walk-in bills", hint: "Shop walk-in bills by sale date.", usesDates: true },
  { id: "customers", label: "Customers", hint: "Every customer with orders, total spent and pending balance.", usesDates: false }
];

export function ExportTool({ token }: ToolProps) {
  const today = todayIst();
  const [type, setType] = useState<ToolsExportType>("orders");
  const [from, setFrom] = useState(`${today.slice(0, 8)}01`);
  const [to, setTo] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const def = EXPORT_TYPES.find((t) => t.id === type)!;

  const presets: Array<[string, () => void]> = [
    ["Today", () => { setFrom(today); setTo(today); }],
    ["Last 7 days", () => { setFrom(addDaysYmd(today, -6)); setTo(today); }],
    ["This month", () => { setFrom(`${today.slice(0, 8)}01`); setTo(today); }],
    [
      "Last month",
      () => {
        const [y, m] = today.split("-").map(Number);
        const start = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10);
        const end = new Date(Date.UTC(y, m - 1, 0)).toISOString().slice(0, 10);
        setFrom(start);
        setTo(end);
      }
    ]
  ];

  const handleExport = async () => {
    try {
      setBusy(true);
      setError("");
      const { blob } = await downloadToolsExport(token, { type, from, to });
      const label = def.label.replace(/\s+/g, "");
      triggerFileDownload(blob, def.usesDates ? `${label}-${from}_to_${to}.csv` : `${label}-${today}.csv`);
    } catch (e: any) {
      setError(e.message || "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Excel / CSV export" subtitle="Download data as a CSV file that opens in Excel or Google Sheets.">
      <div className="grid gap-2 sm:grid-cols-2">
        {EXPORT_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setType(t.id)}
            className={`text-left rounded-xl border p-3 ${
              type === t.id ? "border-teal-400/60 bg-teal-500/10" : "border-white/10 bg-white/[0.02] hover:bg-white/5"
            }`}
          >
            <div className="font-bold text-white">{t.label}</div>
            <div className="text-xs text-slate-400">{t.hint}</div>
          </button>
        ))}
      </div>
      {def.usesDates && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {presets.map(([label, fn]) => (
              <button key={label} type="button" className={btnSmall} onClick={fn}>
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 max-w-md">
            <Field label="From">
              <input className={inputCls} type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
            </Field>
            <Field label="To">
              <input className={inputCls} type="date" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} />
            </Field>
          </div>
        </div>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <button type="button" className={btnPrimary} disabled={busy || (def.usesDates && from > to)} onClick={handleExport}>
        {busy ? "Preparing…" : `Download ${def.label} CSV`}
      </button>
      {def.usesDates && from > to && <p className="text-xs text-red-300">From date must be before To date.</p>}
    </Card>
  );
}
