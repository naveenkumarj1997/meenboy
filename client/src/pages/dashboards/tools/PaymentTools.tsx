import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  getToolDayOrders,
  getToolPendingCustomers,
  type ToolDayOrder,
  type ToolPendingCustomer
} from "../../../lib/api";
import { triggerFileDownload } from "../../../lib/downloadPdf";
import { Card, Field, Notice } from "./toolsUi";
import {
  btnGhost,
  btnPrimary,
  btnSmall,
  copyText,
  inputCls,
  money,
  prettyDate,
  selectCls,
  todayIst,
  waLink,
  waNumber,
  type ToolProps
} from "./toolsHelpers";

const upiLink = (pa: string, pn: string, amount: number, note: string) => {
  const qs = new URLSearchParams({ pa, pn, cu: "INR" });
  if (amount > 0) qs.set("am", amount.toFixed(2));
  if (note) qs.set("tn", note.slice(0, 60));
  return `upi://pay?${qs.toString().replace(/\+/g, "%20")}`;
};

/** QR with payee, amount and note printed under it, as a PNG blob. */
const composeQrCard = async (qrDataUrl: string, lines: string[]) => {
  const img = new Image();
  img.src = qrDataUrl;
  await img.decode();
  const W = 440;
  const H = 440 + 34 * lines.length + 24;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(img, 20, 20, 400, 400);
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  lines.forEach((line, i) => {
    ctx.font = i === 0 ? "bold 26px sans-serif" : "20px sans-serif";
    ctx.fillText(line, W / 2, 452 + i * 34, W - 30);
  });
  return new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
};

type QrSource = "manual" | "order" | "pending";

export function UpiQrTool({ token, settings, openSettings }: ToolProps) {
  const [source, setSource] = useState<QrSource>("manual");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [orders, setOrders] = useState<ToolDayOrder[]>([]);
  const [pending, setPending] = useState<ToolPendingCustomer[]>([]);
  const [pickId, setPickId] = useState("");
  const [qr, setQr] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setPickId("");
    setError("");
    if (source === "order" && !orders.length) {
      getToolDayOrders(token, todayIst())
        .then((r) => setOrders(r.orders))
        .catch((e) => setError(e.message || "Failed to load today's orders"));
    }
    if (source === "pending" && !pending.length) {
      getToolPendingCustomers(token)
        .then((r) => setPending(r.customers))
        .catch((e) => setError(e.message || "Failed to load pending customers"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, token]);

  const pick = (id: string) => {
    setPickId(id);
    if (source === "order") {
      const o = orders.find((x) => x.orderId === id);
      if (!o) return;
      setAmount(String(o.total));
      setCustomerName(o.customerName);
      setNote(`Order ${o.shortId}`);
    } else if (source === "pending") {
      const c = pending.find((x) => x._id === id);
      if (!c) return;
      setAmount(String(c.pendingBalance));
      setCustomerName(c.name);
      setNote("Pending payment");
    }
  };

  const amt = Number(amount) || 0;
  const link = settings.upiId ? upiLink(settings.upiId, settings.payeeName, amt, note) : "";

  useEffect(() => {
    if (!link) {
      setQr("");
      return;
    }
    QRCode.toDataURL(link, { width: 400, margin: 1, errorCorrectionLevel: "M" })
      .then(setQr)
      .catch(() => setQr(""));
  }, [link]);

  const cardLines = () =>
    [
      amt > 0 ? money(amt) : "Any amount",
      settings.payeeName,
      customerName ? `For: ${customerName}` : "",
      note
    ].filter(Boolean);

  const fileName = `UPI-QR-${(customerName || "payment").replace(/[^\w-]+/g, "_")}-${amt || "open"}.png`;

  const handleDownload = async () => {
    if (!qr) return;
    triggerFileDownload(await composeQrCard(qr, cardLines()), fileName);
  };

  const handleShare = async () => {
    if (!qr) return;
    const blob = await composeQrCard(qr, cardLines());
    const file = new File([blob], fileName, { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: "UPI payment", text: cardLines().join(" · ") });
      } catch {
        /* user closed the share sheet */
      }
    } else {
      triggerFileDownload(blob, fileName);
      setMsg("Sharing isn't supported in this browser, so the QR was downloaded instead.");
    }
  };

  if (!settings.upiId) {
    return (
      <Card title="UPI QR for exact amount">
        <Notice tone="warn">
          Add your shop's UPI ID first. The QR codes are made for that UPI ID.
        </Notice>
        <button type="button" className={btnPrimary} onClick={openSettings}>
          Open Tools settings
        </button>
      </Card>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
      <Card title="UPI QR for exact amount" subtitle="Customer scans and the amount is already filled in.">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["manual", "Type amount"],
              ["order", "Today's order"],
              ["pending", "Pending customer"]
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSource(id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${
                source === id
                  ? "bg-teal-500/20 text-teal-200 border-teal-400/60"
                  : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {error && <Notice tone="error">{error}</Notice>}
        {source === "order" && (
          <Field label="Pick order (today)">
            <select className={selectCls} value={pickId} onChange={(e) => pick(e.target.value)}>
              <option value="">Select order…</option>
              {orders.map((o) => (
                <option key={o.orderId} value={o.orderId}>
                  {o.customerName} · {money(o.total)} · #{o.shortId}
                  {o.dailyPriceUpdated ? "" : " (price not updated)"}
                </option>
              ))}
            </select>
          </Field>
        )}
        {source === "pending" && (
          <Field label="Pick customer with pending balance">
            <select className={selectCls} value={pickId} onChange={(e) => pick(e.target.value)}>
              <option value="">Select customer…</option>
              {pending.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} · {money(c.pendingBalance)}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount (₹)" hint="Leave empty to let the customer type the amount.">
            <input className={inputCls} type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </Field>
          <Field label="Customer name (optional)">
            <input className={inputCls} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </Field>
        </div>
        <Field label="Payment note (optional)" hint="Shows in the customer's UPI app.">
          <input className={inputCls} value={note} maxLength={60} onChange={(e) => setNote(e.target.value)} placeholder="Order 16FCA6" />
        </Field>
        <p className="text-xs text-slate-500">
          Paying to <span className="text-slate-300 font-semibold">{settings.upiId}</span> ({settings.payeeName}).
        </p>
      </Card>

      <Card>
        <div className="flex flex-col items-center gap-3 w-full lg:w-80">
          {qr ? (
            <div className="bg-white rounded-2xl p-3 w-full">
              <img src={qr} alt="UPI QR code" className="w-full" />
              <div className="text-center text-black pt-2">
                <div className="text-2xl font-black">{amt > 0 ? money(amt) : "Any amount"}</div>
                <div className="text-sm">{settings.payeeName}</div>
                {customerName && <div className="text-sm">For: {customerName}</div>}
              </div>
            </div>
          ) : (
            <div className="h-64 w-full grid place-items-center text-slate-500">Making QR…</div>
          )}
          <div className="grid grid-cols-2 gap-2 w-full">
            <button type="button" className={btnPrimary} onClick={handleShare} disabled={!qr}>
              Share
            </button>
            <button type="button" className={btnGhost} onClick={handleDownload} disabled={!qr}>
              Download
            </button>
          </div>
          <button
            type="button"
            className={`${btnSmall} w-full`}
            onClick={async () => setMsg((await copyText(link)) ? "UPI payment link copied." : "Could not copy.")}
          >
            Copy UPI payment link
          </button>
          {msg && <p className="text-xs text-slate-400 text-center">{msg}</p>}
        </div>
      </Card>
    </div>
  );
}

const fillReminder = (template: string, c: ToolPendingCustomer, upiId: string) =>
  template
    .replace(/\{name\}/g, c.name)
    .replace(/\{amount\}/g, Number(c.pendingBalance).toLocaleString("en-IN", { maximumFractionDigits: 2 }))
    .replace(/\{upi\}/g, upiId || "-")
    .replace(/\{last\}/g, c.lastOrderDate ? prettyDate(c.lastOrderDate) : "-");

export function ReminderTool({ token, settings, openSettings }: ToolProps) {
  const [customers, setCustomers] = useState<ToolPendingCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState("");

  useEffect(() => {
    getToolPendingCustomers(token)
      .then((r) => setCustomers(r.customers))
      .catch((e) => setError(e.message || "Failed to load pending customers"))
      .finally(() => setLoading(false));
  }, [token]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = Number(minAmount) || 0;
    return customers.filter(
      (c) => c.pendingBalance >= min && (!q || c.name.toLowerCase().includes(q) || c.phone.includes(q))
    );
  }, [customers, search, minAmount]);

  const total = list.reduce((s, c) => s + c.pendingBalance, 0);

  return (
    <Card
      title="Payment reminder"
      subtitle="Send a ready-made WhatsApp message to customers who have a pending balance."
      actions={
        <button type="button" className={btnSmall} onClick={openSettings}>
          Edit message
        </button>
      }
    >
      <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-300 whitespace-pre-wrap">
        {settings.reminderTemplate}
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <input className={inputCls} placeholder="Search name or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
        <input className={inputCls} type="number" min="0" placeholder="Min pending ₹" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : !list.length ? (
        <Notice tone="success">No customers with a pending balance.</Notice>
      ) : (
        <>
          <p className="text-sm text-slate-400">
            {list.length} customer{list.length > 1 ? "s" : ""} · total pending{" "}
            <span className="font-bold text-amber-300">{money(total)}</span>
          </p>
          <div className="divide-y divide-white/10 rounded-xl border border-white/10">
            {list.map((c) => {
              const text = fillReminder(settings.reminderTemplate, c, settings.upiId);
              const canWa = Boolean(waNumber(c.phone));
              return (
                <div key={c._id} className="flex flex-wrap items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white">
                      {c.name} {sent[c._id] && <span className="text-xs font-semibold text-emerald-300">· opened</span>}
                    </div>
                    <div className="text-xs text-slate-400">
                      {c.phone || "No phone"} · last order {c.lastOrderDate ? prettyDate(c.lastOrderDate) : "-"}
                    </div>
                  </div>
                  <div className="text-lg font-black text-amber-300">{money(c.pendingBalance)}</div>
                  <div className="flex gap-2">
                    <a
                      href={canWa ? waLink(c.phone, text) : undefined}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => canWa && setSent((s) => ({ ...s, [c._id]: true }))}
                      className={`${btnSmall} ${canWa ? "!bg-emerald-600 !border-emerald-500 !text-white" : "pointer-events-none opacity-40"}`}
                    >
                      WhatsApp
                    </a>
                    <button
                      type="button"
                      className={btnSmall}
                      onClick={async () => {
                        if (await copyText(text)) {
                          setCopied(c._id);
                          window.setTimeout(() => setCopied(""), 1500);
                        }
                      }}
                    >
                      {copied === c._id ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}
