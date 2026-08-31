import { computeOrderTotal } from "../lib/orderTotals";

type OrderAdjustments = {
  subtotal?: number;
  deliveryFee?: number;
  discountAmount?: number;
  discountNote?: string;
  addonAmount?: number;
  addonNote?: string;
  total?: number;
};

const money = (n: number) => `₹${Number(n).toFixed(2)}`;

const OrderAdjustmentsBreakdown = ({
  order,
  compact = false
}: {
  order: OrderAdjustments;
  compact?: boolean;
}) => {
  const subtotal = Number(order.subtotal || 0);
  const deliveryFee = Number(order.deliveryFee || 0);
  const discountAmount = Number(order.discountAmount || 0);
  const addonAmount = Number(order.addonAmount || 0);
  const discountNote = String(order.discountNote || "").trim();
  const addonNote = String(order.addonNote || "").trim();
  const computedTotal = computeOrderTotal(subtotal, deliveryFee, discountAmount, addonAmount);
  const showBreakdown =
    discountAmount > 0 || addonAmount > 0 || deliveryFee > 0;

  if (!showBreakdown) return null;

  const textSize = compact ? "text-xs" : "text-sm";
  const gap = compact ? "space-y-0.5" : "space-y-1";

  return (
    <div
      className={`rounded-lg border border-white/10 bg-black/20 ${compact ? "p-2.5" : "p-3"} ${textSize} ${gap}`}
    >
      {subtotal > 0 && (
        <div className="flex justify-between text-white/70">
          <span>Items subtotal</span>
          <span>{money(subtotal)}</span>
        </div>
      )}
      {deliveryFee > 0 && (
        <div className="flex justify-between text-white/70">
          <span>Delivery fee</span>
          <span>{money(deliveryFee)}</span>
        </div>
      )}
      {addonAmount > 0 && (
        <div className="flex justify-between text-amber-200">
          <span>
            Addon
            {addonNote ? (
              <span className="block text-[10px] text-amber-300/80 mt-0.5">{addonNote}</span>
            ) : null}
          </span>
          <span className="font-semibold">+{money(addonAmount)}</span>
        </div>
      )}
      {discountAmount > 0 && (
        <div className="flex justify-between text-emerald-300">
          <span>
            Discount
            {discountNote ? (
              <span className="block text-[10px] text-emerald-200/80 mt-0.5">{discountNote}</span>
            ) : null}
          </span>
          <span className="font-semibold">−{money(discountAmount)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold text-white border-t border-white/10 pt-1.5 mt-1">
        <span>Total</span>
        <span className="text-teal-400">
          {money(order.total != null ? Number(order.total) : computedTotal)}
        </span>
      </div>
    </div>
  );
};

export default OrderAdjustmentsBreakdown;
