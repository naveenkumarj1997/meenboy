import { useLocation, Navigate, Link } from "react-router-dom";
import { motion } from "framer-motion";

const PaymentStatusPage = () => {
  const location = useLocation();
  const state = location.state as {
    orderId: string;
    status: string;
    method: string;
    amount: number;
  } | null;

  if (!state) {
    return <Navigate to="/dashboard" replace />;
  }

  const isSuccess = state.status === "Authorized" || state.status === "Pending";

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-white/5 border border-white/10 p-10 rounded-3xl shadow-2xl max-w-lg w-full"
      >
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
          isSuccess ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {isSuccess ? (
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        
        <h2 className="text-3xl font-black text-white mb-2">
          {isSuccess ? "Order Confirmed!" : "Payment Failed"}
        </h2>
        
        <p className="text-white/60 mb-8 leading-relaxed">
          {isSuccess 
            ? "Your order has been placed successfully and is being processed."
            : "There was an issue processing your payment. Please try again."
          }
        </p>

        <div className="bg-cyan-950/50 rounded-2xl p-6 mb-8 text-left space-y-3 border border-white/5">
          <div className="flex justify-between items-center text-sm">
            <span className="text-white/50 font-medium">Order ID</span>
            <span className="text-white font-mono">{state.orderId.slice(-8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-white/50 font-medium">Amount</span>
            <span className="text-white font-bold">₹{state.amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-white/50 font-medium">Payment Method</span>
            <span className="text-white">{state.method}</span>
          </div>
          <div className="flex justify-between items-center text-sm border-t border-white/10 pt-3 mt-3">
            <span className="text-white/50 font-medium">Status</span>
            <span className={`font-bold ${isSuccess ? 'text-emerald-400' : 'text-red-400'}`}>
              {state.status}
            </span>
          </div>
        </div>

        <Link
          to="/dashboard"
          className="bg-teal-500 hover:bg-teal-400 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg shadow-teal-500/20 transition-all inline-block w-full"
        >
          View Dashboard
        </Link>
      </motion.div>
    </div>
  );
};

export default PaymentStatusPage;
