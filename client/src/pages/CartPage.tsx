import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";

const formatPrice = (price: number) => {
  if (isNaN(price) || price === null || price === undefined) return "0";
  const num = Number(price);
  return num % 1 === 0 ? num.toString() : num.toFixed(2);
};

const CartPage = () => {
  const { cartItems, updateQuantity, removeFromCart, clearCart, cartTotal } = useCart();
  const navigate = useNavigate();

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

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence>
            {cartItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col sm:flex-row items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl"
              >
                {/* Image */}
                <div className="w-full sm:w-28 h-28 shrink-0 bg-cyan-900/40 rounded-xl overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://placehold.co/150x150/0e7490/e0f2fe?text=${encodeURIComponent(
                        item.name
                      )}`;
                    }}
                  />
                </div>

                {/* Info */}
                <div className="flex-grow flex flex-col justify-center text-center sm:text-left min-w-0">
                  <Link
                    to={`/products/${item.productId}`}
                    className="text-lg font-bold text-white hover:text-teal-400 transition-colors truncate"
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
                  <span className="text-sm font-bold text-white mt-1">
                    ₹{formatPrice(item.price)}
                  </span>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-4 shrink-0 mt-4 sm:mt-0">
                  <div className="flex items-center bg-cyan-950/50 rounded-lg p-1 border border-white/10">
                    <button
                      onClick={() => updateQuantity(
                        item.id, 
                        item.unit === "kg" ? Math.max(0, item.quantity - 0.1) : item.quantity - 1
                      )}
                      className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-bold text-white text-sm">
                      {item.unit === "kg" 
                        ? (item.quantity < 1 ? `${Math.round(item.quantity * 1000)}g` : `${item.quantity}kg`) 
                        : item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(
                        item.id, 
                        item.unit === "kg" ? Math.min(5.0, item.quantity + 0.1) : item.quantity + 1
                      )}
                      className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <div className="w-20 text-right font-black text-teal-400">
                    ₹{formatPrice(item.price * item.quantity)}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-2 text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    title="Remove item"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Order Summary */}
        <div className="bg-gradient-to-br from-teal-500/10 to-cyan-500/5 border border-teal-500/20 p-6 rounded-2xl sticky top-24">
          <h3 className="text-xl font-bold text-white mb-6">Order Summary</h3>
          
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
          
          <div className="border-t border-white/10 pt-4 mb-8 flex justify-between items-center">
            <span className="font-medium text-white">Total</span>
            <span className="text-2xl font-black text-teal-400">
              ₹{formatPrice(cartTotal)}
            </span>
          </div>

          <button
            onClick={() => navigate("/checkout")}
            className="w-full bg-teal-500 hover:bg-teal-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2"
          >
            Proceed to Checkout
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
          
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
