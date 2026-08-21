import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WEIGHT_OPTIONS, snapToWeightOption } from "../lib/weightOptions";
import { useCart } from "../context/CartContext";
import { checkCartAvailability, type ItemAvailability } from "../lib/cartAvailability";

const formatPrice = (price: number) => {
  if (isNaN(price) || price === null || price === undefined) return "0";
  const num = Number(price);
  return num % 1 === 0 ? num.toString() : num.toFixed(2);
};

const getLocalDateString = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const CART_CHECK_DATE_KEY = "meenboy_cart_check_date";

const CartPage = () => {
  const { cartItems, updateQuantity, removeFromCart, clearCart, cartTotal } = useCart();
  const navigate = useNavigate();
  const [checkDate, setCheckDate] = useState(() => {
    return localStorage.getItem(CART_CHECK_DATE_KEY) || getLocalDateString();
  });
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, ItemAvailability>>({});
  const [warning, setWarning] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  // Normalize older cart weights (0.1 steps) to the new dropdown options
  useEffect(() => {
    cartItems.forEach((item) => {
      if (item.unit !== "kg") return;
      const snapped = snapToWeightOption(item.quantity);
      if (Math.abs(snapped - item.quantity) > 0.001) {
        updateQuantity(item.id, snapped);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_CHECK_DATE_KEY, checkDate);
  }, [checkDate]);

  useEffect(() => {
    if (cartItems.length === 0) {
      setAvailabilityMap({});
      setWarning(null);
      setCheckError(null);
      return;
    }

    let active = true;
    const requestId = Date.now();

    const run = async () => {
      try {
        setChecking(true);
        setCheckError(null);
        const result = await checkCartAvailability(cartItems, checkDate);
        if (!active) return;

        const map: Record<string, ItemAvailability> = {};
        result.items.forEach((item) => {
          map[item.cartItemId] = item;
        });
        setAvailabilityMap(map);
        setWarning(result.warning);
      } catch (err) {
        console.error("Cart availability check failed", err);
        if (!active) return;
        setCheckError(
          err instanceof Error ? err.message : "Could not verify item availability. Please refresh."
        );
        // Fail safe: mark all items unavailable so checkout is blocked
        const map: Record<string, ItemAvailability> = {};
        cartItems.forEach((item) => {
          map[item.id] = {
            cartItemId: item.id,
            productId: String(item.productId),
            name: item.name,
            unavailable: true,
            reason: "Could not verify this item. Please remove it or try again."
          };
        });
        setAvailabilityMap(map);
        setWarning("Could not verify cart items. Remove unavailable items or refresh the page.");
      } finally {
        if (active) setChecking(false);
      }
    };

    void run();
    return () => {
      active = false;
      void requestId;
    };
  }, [cartItems, checkDate]);

  const unavailableCount = useMemo(
    () => Object.values(availabilityMap).filter((i) => i.unavailable).length,
    [availabilityMap]
  );

  if (cartItems.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="text-7xl mb-4 opacity-50">🛒</div>
          <h2 className="text-3xl font-black text-white mb-2">Your Cart is Empty</h2>
          <p className="text-white/50 mb-8 max-w-sm mx-auto">
            Looks like you haven't added any seafood to your cart yet.
          </p>
          <Link
            to="/products"
            className="bg-teal-500 hover:bg-teal-400 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg shadow-teal-500/20 transition-all inline-block"
          >
            Start Shopping
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 lg:py-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-1">Shopping Cart</h1>
          <p className="text-white/50 text-sm">You have {cartItems.length} items in your cart</p>
        </div>
        <button
          onClick={clearCart}
          className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
        >
          Clear Cart
        </button>
      </div>

      {warning && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl font-medium flex items-start gap-3">
          <span className="mt-0.5 shrink-0">⚠️</span>
          <p className="text-sm leading-relaxed">{warning}</p>
        </div>
      )}
      {checkError && !warning && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl font-medium flex items-start gap-3">
          <span className="mt-0.5 shrink-0">⚠️</span>
          <p className="text-sm leading-relaxed">{checkError}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence>
            {cartItems.map((item) => {
              const status = availabilityMap[item.id];
              const isUnavailable = !!status?.unavailable;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className={`flex flex-col sm:flex-row items-center gap-4 border p-4 rounded-2xl ${
                    isUnavailable
                      ? "bg-rose-500/10 border-rose-500/30"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="w-full sm:w-28 h-28 shrink-0 bg-cyan-900/40 rounded-xl overflow-hidden relative">
                    <img
                      src={item.image}
                      alt={item.name}
                      className={`w-full h-full object-cover ${isUnavailable ? "opacity-50 grayscale" : ""}`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://placehold.co/150x150/0e7490/e0f2fe?text=${encodeURIComponent(
                          item.name
                        )}`;
                      }}
                    />
                    {isUnavailable && (
                      <span className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                        Unavailable
                      </span>
                    )}
                  </div>

                  <div className="flex-grow flex flex-col justify-center text-center sm:text-left min-w-0">
                    <Link
                      to={`/products/${item.productId}`}
                      className={`text-lg font-bold hover:text-teal-400 transition-colors truncate ${
                        isUnavailable ? "text-rose-200" : "text-white"
                      }`}
                    >
                      {item.name}
                    </Link>
                    {item.cutName && (
                      <span className="text-sm text-teal-400 font-medium mt-0.5">
                        Cut: {item.cutName}
                      </span>
                    )}
                    {item.notes && (
                      <span className="text-xs text-white/50 italic mt-0.5 max-w-[200px] truncate">
                        Note: {item.notes}
                      </span>
                    )}
                    {isUnavailable && (
                      <p className="text-xs text-rose-300 mt-1.5">
                        {status.reason} Remove this item to continue with other items.
                      </p>
                    )}
                    <span className="text-sm font-bold text-white mt-1">
                      ₹{formatPrice(item.price)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 mt-4 sm:mt-0">
                    {item.unit === "kg" ? (
                      <select
                        value={snapToWeightOption(item.quantity)}
                        onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                        disabled={isUnavailable}
                        className="bg-cyan-950/50 border border-white/10 rounded-lg px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:border-teal-500/50 min-w-[7.5rem] disabled:opacity-40"
                        aria-label={`Weight for ${item.name}`}
                      >
                        {WEIGHT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center bg-cyan-950/50 rounded-lg p-1 border border-white/10">
                        <button
                          type="button"
                          disabled={isUnavailable}
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors disabled:opacity-40"
                        >
                          -
                        </button>
                        <span className="w-12 text-center font-bold text-white text-sm">{item.quantity}</span>
                        <button
                          type="button"
                          disabled={isUnavailable}
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    )}
                    <div className="w-24 text-right font-black text-teal-400">
                      ₹{formatPrice(item.price * item.quantity)}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        isUnavailable
                          ? "text-rose-300 hover:text-rose-200 hover:bg-rose-400/20"
                          : "text-white/30 hover:text-red-400 hover:bg-red-400/10"
                      }`}
                      title="Remove item"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Order Summary */}
        <div className="bg-gradient-to-br from-teal-500/10 to-cyan-500/5 border border-teal-500/20 p-6 rounded-2xl sticky top-24">
          <h3 className="text-xl font-bold text-white mb-4">Order Summary</h3>

          <div className="mb-5">
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-1.5">
              Check availability for date
            </label>
            <input
              type="date"
              min={getLocalDateString()}
              value={checkDate}
              onChange={(e) => setCheckDate(e.target.value)}
              className="w-full bg-cyan-950/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500 [color-scheme:dark]"
            />
            {checking && <p className="text-[11px] text-white/40 mt-1.5">Checking availability…</p>}
          </div>

          <div className="space-y-4 mb-6 text-sm">
            <div className="flex justify-between text-white/60">
              <span>Subtotal</span>
              <span className="text-white">₹{formatPrice(cartTotal)}</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Delivery</span>
              <span className="text-teal-400 font-medium">Free</span>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 mb-6 flex justify-between items-center">
            <span className="font-medium text-white">Total</span>
            <span className="text-2xl font-black text-teal-400">
              ₹{formatPrice(cartTotal)}
            </span>
          </div>

          <button
            onClick={() =>
              navigate("/checkout", {
                state: { deliveryDate: checkDate }
              })
            }
            disabled={unavailableCount > 0}
            className={`w-full bg-teal-500 hover:bg-teal-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 ${
              unavailableCount > 0 ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            Proceed to Checkout
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>

          {warning && (
            <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs leading-relaxed flex items-start gap-2">
              <span>⚠️</span>
              <span>{warning}</span>
            </div>
          )}

          <div className="mt-4 text-center">
            <Link to="/products" className="text-sm text-teal-400/80 hover:text-teal-300 transition-colors">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
