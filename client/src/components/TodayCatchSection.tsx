import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import type { TodayCatchItem, TodayCatchPayload } from "../lib/api";
import { shopWhatsAppUrl } from "../lib/shopContact";

const WhatsAppIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M20.52 3.48A11.86 11.86 0 0012.01 0C5.4 0 .04 5.36.04 11.97c0 2.11.55 4.17 1.6 5.99L0 24l6.2-1.62a11.94 11.94 0 005.8 1.48h.01c6.61 0 11.97-5.36 11.97-11.97 0-3.2-1.25-6.21-3.46-8.41zM12 21.48h-.01a9.5 9.5 0 01-4.84-1.33l-.35-.2-3.68.96.98-3.58-.23-.37a9.48 9.48 0 01-1.45-5.05C2.42 6.68 6.7 2.4 12 2.4c2.54 0 4.93.99 6.73 2.79a9.45 9.45 0 012.78 6.72c0 5.3-4.28 9.57-9.51 9.57zm5.22-7.14c-.29-.14-1.7-.84-1.96-.93-.26-.1-.45-.14-.64.14-.19.29-.74.93-.9 1.12-.17.19-.33.21-.62.07-.29-.14-1.21-.45-2.31-1.42-.85-.76-1.43-1.7-1.6-1.98-.17-.29-.02-.44.12-.58.13-.13.29-.33.43-.5.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.08-.14-.64-1.55-.88-2.12-.23-.56-.47-.48-.64-.49h-.55c-.19 0-.5.07-.76.36-.26.29-1 1-1 2.43s1.02 2.82 1.17 3.01c.14.19 2.01 3.07 4.87 4.31.68.29 1.21.47 1.62.6.68.22 1.3.19 1.79.11.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.11-.26-.18-.55-.32z" />
  </svg>
);

type OrderLine = {
  item: TodayCatchItem;
  qty: number;
};

const MIN_QTY = 0.5;

const maxQtyForItem = (item: TodayCatchItem) => {
  const max = Number(item.availableQty);
  if (Number.isFinite(max) && max > 0) return Math.round(max * 10) / 10;
  return 50;
};

const clampQty = (value: number, item: TodayCatchItem) => {
  const max = maxQtyForItem(item);
  const rounded = Math.round(value * 10) / 10;
  if (rounded <= 0) return 0;
  return Math.min(max, Math.max(MIN_QTY, rounded));
};

const itemKey = (item: TodayCatchItem, idx: number) => item.id || `${item.name}-${idx}`;

const buildMessage = (
  lines: OrderLine[],
  details: { name: string; phone: string; address: string; note: string }
) => {
  const linesText = lines
    .map((line) => {
      const unit = line.item.unit || "kg";
      const price = Number(line.item.price || 0);
      const approx = price * line.qty;
      return `• ${line.item.name} — ${line.qty} ${unit} @ ₹${price.toLocaleString("en-IN")}/${unit} (approx ₹${approx.toLocaleString("en-IN")})`;
    })
    .join("\n");

  const totalApprox = lines.reduce(
    (sum, line) => sum + Number(line.item.price || 0) * line.qty,
    0
  );

  return [
    "Hi Fish Friendly!",
    "I want to order from *Stock Available* (quick WhatsApp order — no login):",
    "",
    linesText,
    "",
    `Approx total: ₹${totalApprox.toLocaleString("en-IN")}`,
    "",
    `Name: ${details.name}`,
    `Phone: ${details.phone}`,
    `Delivery address: ${details.address}`,
    details.note ? `Note: ${details.note}` : null,
    "",
    "Please confirm availability, final amount, and delivery time. Thank you!"
  ]
    .filter(Boolean)
    .join("\n");
};

export function StockUnavailableSection() {
  const preOrderMessage = [
    "Hi Fish Friendly!",
    "Currently I see no stock listed on the website.",
    "I want to pre-order fish for Wednesday / Sunday delivery.",
    "",
    "Please share available items and guide me for WhatsApp / website order.",
    "Thank you!"
  ].join("\n");

  return (
    <section className="w-full py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-white">
      <div className="text-center mb-8">
        <p className="text-teal-600 text-sm font-semibold tracking-wider uppercase mb-2">
          Stock status
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-cyan-950 mb-3">Stock Available</h2>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-3xl mx-auto rounded-3xl border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-teal-50 p-6 sm:p-10 text-center shadow-sm"
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold px-3 py-1 mb-4">
          No live stock listed right now
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-cyan-950 mb-3">
          Currently no today&apos;s catch stock available in the shop
        </h3>
        <p className="text-cyan-800 text-sm sm:text-base leading-relaxed mb-2">
          When stock is available, you will see fish with price and quantity here — and you can
          order quickly on WhatsApp or the website.
        </p>
        <p className="text-cyan-700 text-sm sm:text-base leading-relaxed mb-8">
          You can still <strong>pre-order</strong> fishes for{" "}
          <strong>Wednesday</strong> and <strong>Sunday</strong> delivery through WhatsApp order
          or website order.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={shopWhatsAppUrl(preOrderMessage)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#1ebe57] text-white font-semibold px-6 py-3 text-sm"
          >
            <WhatsAppIcon className="w-4 h-4" />
            Pre-order on WhatsApp
          </a>
          <Link
            to="/products"
            className="inline-flex items-center justify-center rounded-xl bg-cyan-950 hover:bg-cyan-900 text-white font-semibold px-6 py-3 text-sm"
          >
            Order on website
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

export default function TodayCatchSection({ todayCatch }: { todayCatch: TodayCatchPayload }) {
  const [qtyByKey, setQtyByKey] = useState<Record<string, number>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingLines, setPendingLines] = useState<OrderLine[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");

  const selectedLines = useMemo(() => {
    return (todayCatch.items || [])
      .map((item, idx) => {
        const key = itemKey(item, idx);
        const qty = Number(qtyByKey[key] || 0);
        return qty > 0 ? { item, qty } : null;
      })
      .filter(Boolean) as OrderLine[];
  }, [todayCatch.items, qtyByKey]);

  const setQty = (key: string, value: number, item: TodayCatchItem) => {
    const next = clampQty(value, item);
    // Allow clearing to 0 when stepping down from 0.5
    const cleared = value <= 0 ? 0 : next;
    setQtyByKey((prev) => ({ ...prev, [key]: cleared }));
  };

  const openOrder = (lines: OrderLine[]) => {
    if (!lines.length) {
      setFormError("Select quantity for at least one item");
      return;
    }
    setFormError("");
    setPendingLines(lines);
    setModalOpen(true);
  };

  const submitWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    const p = phone.trim();
    const a = address.trim();
    if (n.length < 2) {
      setFormError("Please enter your name");
      return;
    }
    if (p.replace(/\D/g, "").length < 10) {
      setFormError("Please enter a valid 10-digit phone number");
      return;
    }
    if (a.length < 5) {
      setFormError("Please enter delivery area / address");
      return;
    }

    const url = shopWhatsAppUrl(
      buildMessage(pendingLines, { name: n, phone: p, address: a, note: note.trim() })
    );
    window.open(url, "_blank", "noopener,noreferrer");
    setModalOpen(false);
  };

  return (
    <section className="w-full py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-white">
      <div className="text-center mb-10 md:mb-14">
        <p className="text-teal-600 text-sm font-semibold tracking-wider uppercase mb-2">
          In stock now · Order on WhatsApp
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-cyan-950 mb-3">
          {todayCatch.headline || "Stock Available"}
        </h2>
        <p className="text-cyan-700 max-w-2xl mx-auto">
          {todayCatch.subheadline ||
            "See what's in stock today — price & quantity. Order fast on WhatsApp."}
        </p>
        <p className="text-sm text-cyan-600 mt-3 max-w-xl mx-auto">
          No login needed — choose how much you want and order on WhatsApp.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {todayCatch.items.map((item, idx) => {
          const key = itemKey(item, idx);
          const qty = Number(qtyByKey[key] || 0);
          const maxQty = maxQtyForItem(item);
          const hasStockLimit = Number(item.availableQty) > 0;
          const orderQty = qty > 0 ? clampQty(qty, item) : Math.min(1, maxQty);

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(idx * 0.05, 0.3) }}
              className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-white overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
            >
              {item.imageUrl ? (
                <div className="aspect-[16/10] bg-cyan-100 overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : null}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-cyan-950">{item.name}</h3>
                    {item.note ? (
                      <p className="text-xs text-amber-700 mt-1">{item.note}</p>
                    ) : null}
                    {hasStockLimit ? (
                      <p className="inline-flex items-center gap-1.5 text-xs text-teal-800 mt-2 font-semibold bg-teal-50 border border-teal-100 rounded-full px-2.5 py-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                        Stock available: {maxQty} {item.unit || "kg"}
                        <span className="font-normal text-teal-700">
                          (you can order {MIN_QTY}–{maxQty})
                        </span>
                      </p>
                    ) : (
                      <p className="text-xs text-amber-700 mt-2 font-medium">
                        Stock limit not set — ask shop for available qty
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-black text-teal-600">
                      ₹{Number(item.price || 0).toLocaleString("en-IN")}
                    </div>
                    <div className="text-xs text-cyan-600">/{item.unit || "kg"}</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-cyan-700 font-medium">Qty ({item.unit || "kg"})</span>
                  <div className="flex items-center rounded-lg border border-cyan-200 bg-white overflow-hidden">
                    <button
                      type="button"
                      className="px-3 py-1.5 text-cyan-800 hover:bg-cyan-50 disabled:opacity-40"
                      disabled={qty <= 0}
                      onClick={() => setQty(key, qty <= MIN_QTY ? 0 : qty - 0.5, item)}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={maxQty}
                      step={0.5}
                      value={qty || ""}
                      onChange={(e) =>
                        setQty(
                          key,
                          e.target.value === "" ? 0 : Number(e.target.value),
                          item
                        )
                      }
                      className="w-14 text-center py-1.5 text-sm text-cyan-950 outline-none"
                    />
                    <button
                      type="button"
                      className="px-3 py-1.5 text-cyan-800 hover:bg-cyan-50 disabled:opacity-40"
                      disabled={qty >= maxQty}
                      onClick={() => setQty(key, qty + 0.5, item)}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="mt-auto pt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => openOrder([{ item, qty: orderQty }])}
                    disabled={maxQty < MIN_QTY}
                    className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-[#25D366] hover:bg-[#1ebe57] disabled:opacity-40 text-white font-semibold text-sm py-2.5 transition-colors"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                    Order on WhatsApp
                  </button>
                  {item.productId ? (
                    <Link
                      to={`/products/${item.productId}`}
                      className="text-center text-xs font-semibold text-teal-700 hover:text-teal-500"
                    >
                      View on website →
                    </Link>
                  ) : null}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {selectedLines.length > 0 && (
        <div className="sticky bottom-4 z-20 mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => openOrder(selectedLines)}
            className="inline-flex items-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1ebe57] text-white font-bold px-6 py-3 shadow-lg shadow-[#25D366]/30"
          >
            <WhatsAppIcon />
            Order {selectedLines.length} item{selectedLines.length > 1 ? "s" : ""} on WhatsApp
          </button>
        </div>
      )}

      <div className="mt-10 text-center">
        <Link
          to="/products"
          className="inline-flex rounded-full bg-cyan-950 px-6 py-3 text-sm font-bold text-white hover:bg-cyan-900 transition-colors"
        >
          Browse all products
        </Link>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-cyan-950">Quick WhatsApp order</h3>
                  <p className="text-xs text-cyan-600 mt-1">
                    No account needed. We open WhatsApp with your order details.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-cyan-500 hover:text-cyan-800 text-sm"
                >
                  Close
                </button>
              </div>

              <ul className="mb-4 space-y-1.5 rounded-xl bg-cyan-50 border border-cyan-100 p-3 text-sm text-cyan-900">
                {pendingLines.map((line, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="truncate">{line.item.name}</span>
                    <span className="shrink-0 font-semibold">
                      {line.qty} {line.item.unit || "kg"}
                    </span>
                  </li>
                ))}
              </ul>

              <form onSubmit={submitWhatsApp} className="space-y-3">
                <div>
                  <label className="block text-xs text-cyan-700 mb-1">Your name *</label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-cyan-200 px-3 py-2.5 text-sm text-cyan-950 outline-none focus:border-teal-500"
                    placeholder="Name"
                  />
                </div>
                <div>
                  <label className="block text-xs text-cyan-700 mb-1">WhatsApp / phone *</label>
                  <input
                    required
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-cyan-200 px-3 py-2.5 text-sm text-cyan-950 outline-none focus:border-teal-500"
                    placeholder="10-digit mobile"
                  />
                </div>
                <div>
                  <label className="block text-xs text-cyan-700 mb-1">
                    Delivery area / address *
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-xl border border-cyan-200 px-3 py-2.5 text-sm text-cyan-950 outline-none focus:border-teal-500 resize-y"
                    placeholder="Area, landmark, city"
                  />
                </div>
                <div>
                  <label className="block text-xs text-cyan-700 mb-1">Note (optional)</label>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full rounded-xl border border-cyan-200 px-3 py-2.5 text-sm text-cyan-950 outline-none focus:border-teal-500"
                    placeholder="Cut preference, timing, etc."
                  />
                </div>

                {formError && <p className="text-sm text-rose-600">{formError}</p>}

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#1ebe57] text-white font-bold py-3 text-sm"
                >
                  <WhatsAppIcon />
                  Open WhatsApp with order
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
