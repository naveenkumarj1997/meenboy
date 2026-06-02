import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getMyPayments } from "../../lib/api";
import DashboardShell from "./DashboardShell";

const PaymentHistoryPage = () => {
  const { token, user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      const data = await getMyPayments(token!);
      setPayments(data.payments || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch payments");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchPayments();
  }, [token]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "text-yellow-400 bg-yellow-400/10 border-yellow-400/20";
      case "authorized": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
      case "captured": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
      case "failed": return "text-red-400 bg-red-400/10 border-red-400/20";
      case "refunded": return "text-purple-400 bg-purple-400/10 border-purple-400/20";
      default: return "text-white/70 bg-white/5 border-white/10";
    }
  };

  const formatMethod = (provider: string) => {
    if (provider === "cash_on_delivery") return "Cash on Delivery";
    if (provider === "upi") return "UPI";
    return provider.charAt(0).toUpperCase() + provider.slice(1);
  };

const CUSTOMER_NAV_LINKS = [
  { label: "Orders", href: "/dashboard" },
  { label: "Payments", href: "/dashboard/payments" },
  { label: "Delivery Status", href: "/dashboard/deliveries" }
];

  if (isLoading) {
    return (
      <DashboardShell title="Payment History" description={`Manage payments for ${user?.name}`} navLinks={CUSTOMER_NAV_LINKS}>
        <div className="flex justify-center items-center h-64">
          <div className="w-10 h-10 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Payment History" description={`View your transaction history, ${user?.name}`} navLinks={CUSTOMER_NAV_LINKS}>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-8">
          {error}
        </div>
      )}

      {payments.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
          <div className="text-6xl mb-4 opacity-50">💳</div>
          <h3 className="text-xl font-bold text-white mb-2">No payments yet</h3>
          <p className="text-white/50 mb-6">You haven't made any transactions with us.</p>
          <Link
            to="/products"
            className="inline-flex bg-teal-500 hover:bg-teal-400 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-teal-500/20 transition-all"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-white/70">
              <thead className="bg-cyan-950/80 text-white uppercase font-bold text-xs">
                <tr>
                  <th className="px-6 py-4">Transaction ID</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-white">
                      {payment._id.slice(-8).toUpperCase()}
                      <div className="text-[10px] text-white/40 mt-1">Order: {payment.order?._id?.slice(-8).toUpperCase() || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium text-white">
                      {formatMethod(payment.provider)}
                    </td>
                    <td className="px-6 py-4 font-bold text-teal-400">
                      ₹{payment.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardShell>
  );
};

export default PaymentHistoryPage;
