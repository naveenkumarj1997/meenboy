import { getItemPriceChanges, type PriceChangeItem } from "../lib/priceChanges";

type Props = {
  dailyPriceUpdated?: boolean;
  estimatedTotal?: number;
  total?: number;
  items?: PriceChangeItem[];
  compact?: boolean;
};

const money = (n: number) => `₹${Math.abs(Number(n)).toFixed(2)}`;

const OrderPriceNotice = ({ dailyPriceUpdated, estimatedTotal, total, items, compact }: Props) => {
  const changes = dailyPriceUpdated ? getItemPriceChanges(items) : [];

  if (dailyPriceUpdated) {
    return (
      <div className={`rounded-xl border-2 border-emerald-400 bg-emerald-500/15 ${compact ? "p-3" : "p-4"}`}>
        <p className="text-emerald-300 font-black uppercase tracking-wide text-sm">
          Daily price updated
        </p>
        <p className={`text-emerald-100/90 ${compact ? "text-xs mt-1" : "text-sm mt-1.5"}`}>
          Actual market price for this delivery date has been applied.
        </p>
        {changes.length > 0 ? (
          <div className={`mt-3 space-y-2 ${compact ? "text-xs" : "text-sm"}`}>
            {changes.map((change, idx) => (
              <div key={idx} className="rounded-lg bg-black/20 border border-emerald-400/20 px-3 py-2 text-emerald-50">
                <p className="font-bold text-white">
                  {change.name}
                  {change.cutName ? ` (${change.cutName})` : ""} — {change.qtyLabel}
                </p>
                <p className="mt-0.5">
                  Rate {money(change.oldRate)} → {money(change.newRate)} per {change.unit}
                  {change.increased ? (
                    <span className="text-amber-300 font-black">
                      {" "}
                      · increased {money(change.lineDiff)}
                    </span>
                  ) : (
                    <span className="text-teal-300 font-black">
                      {" "}
                      · decreased {money(change.lineDiff)}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-emerald-200/80 mt-2">Rates for this order did not change.</p>
        )}
        {estimatedTotal != null && total != null && Math.abs(Number(estimatedTotal) - Number(total)) > 0.01 && (
          <p className="text-xs text-emerald-200/80 mt-2">
            Booking estimate ₹{Number(estimatedTotal).toFixed(2)} → confirmed ₹{Number(total).toFixed(2)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border-2 border-amber-400 bg-amber-500/15 ${compact ? "p-3" : "p-4"}`}>
      <p className="text-amber-300 font-black uppercase tracking-wide text-sm">
        Approximate price — daily price not updated
      </p>
      <p className={`text-amber-50/90 ${compact ? "text-xs mt-1" : "text-sm mt-1.5"}`}>
        These item prices and the total are approximate. The actual price is confirmed 1 day before your delivery date, after admin updates Daily Prices.
      </p>
    </div>
  );
};

export default OrderPriceNotice;
