import { SHOP_PHONE_DISPLAY, SHOP_PHONE_TEL, shopWhatsAppUrl } from "../lib/shopContact";

const OrderChangeHelp = ({ orderId }: { orderId?: string }) => {
  const message = orderId
    ? `Hi Fish Friendly, I need to modify or cancel order #${String(orderId).slice(-8).toUpperCase()}.`
    : undefined;

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 sm:p-5">
      <h3 className="text-amber-200 font-semibold mb-1">Need to change or cancel an order?</h3>
      <p className="text-sm text-slate-300 mb-4 leading-relaxed">
        Orders cannot be edited or cancelled from your account. Please call or WhatsApp Fish Friendly
        and our admin will update the order for you.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <a
          href={shopWhatsAppUrl(message)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white font-semibold px-4 py-2.5 rounded-xl text-sm"
        >
          Chat on WhatsApp
        </a>
        <a
          href={SHOP_PHONE_TEL}
          className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold px-4 py-2.5 rounded-xl text-sm border border-white/10"
        >
          Call {SHOP_PHONE_DISPLAY}
        </a>
      </div>
    </div>
  );
};

export default OrderChangeHelp;
