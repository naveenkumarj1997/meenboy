import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import DashboardShell from "./DashboardShell";
import * as api from "../../lib/api";

const ADMIN_NAV_LINKS = [
  { label: "Overview", href: "/dashboard/admin" },
  { label: "Profile", href: "/dashboard/admin/profile" },
  { label: "New Customers", href: "/dashboard/admin/new-customers" },
  { label: "New Delivery Partners", href: "/dashboard/admin/partner-approvals" },
  { label: "Products", href: "/dashboard/admin/products" },
  { label: "Daily Prices", href: "/dashboard/admin/daily-prices" },
  { label: "Order Management", href: "/dashboard/admin/deliveries" },
  { label: "Partner Report", href: "/dashboard/admin/partner-report" },
  { label: "Pending Payments", href: "/dashboard/admin/pending-payments" },
  { label: "Collected Payments", href: "/dashboard/admin/collected-payments" },
  { label: "Purchases", href: "/dashboard/admin/purchases" },
  { label: "Settlements", href: "/dashboard/admin/settlements" },
  { label: "Partner Salary", href: "/dashboard/admin/partner-salary" },
  { label: "Admin Earnings", href: "/dashboard/admin/earnings" },
  { label: "Users", href: "/dashboard/admin/users" },
  { label: "Money", href: "/dashboard/admin/finance" },
  { label: "Availability", href: "/dashboard/admin/availability" },
  { label: "Manual Booking", href: "/dashboard/admin/manual-booking" }
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export default function AdminFinancePage() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    type: "collection" as "collection" | "payment",
    category: "cod" as api.TransactionPayload["category"],
    amount: "",
    notes: ""
  });

  useEffect(() => {
    if (token) {
      fetchFinanceData();
    }
  }, [token]);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const [sumRes, transRes] = await Promise.all([
        api.getFinanceSummary(token!),
        api.getTransactions(token!)
      ]);
      setSummary(sumRes);
      setTransactions(transRes);
    } catch (err: any) {
      setError(err.message || "Failed to fetch finance data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: api.TransactionPayload = {
        type: formData.type,
        category: formData.category,
        amount: Number(formData.amount),
        notes: formData.notes
      };
      await api.createTransaction(token!, payload);
      setShowModal(false);
      setFormData({ type: "collection", category: "cod", amount: "", notes: "" });
      fetchFinanceData();
    } catch (err: any) {
      alert(err.message || "Failed to create transaction");
    }
  };

  if (loading) {
    return (
      <DashboardShell title="Money Management" description="Loading finances..." navLinks={ADMIN_NAV_LINKS}>
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Money Management"
      description="Track collections and payments"
      navLinks={ADMIN_NAV_LINKS}
    >
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-gray-400 text-sm font-medium mb-1">Total COD Collected</h3>
          <p className="text-3xl font-bold text-emerald-400">
            {formatCurrency(summary?.collections?.cod || 0)}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-gray-400 text-sm font-medium mb-1">Total UPI Collected</h3>
          <p className="text-3xl font-bold text-emerald-400">
            {formatCurrency(summary?.collections?.upi || 0)}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-gray-400 text-sm font-medium mb-1">Partner Collections</h3>
          <p className="text-3xl font-bold text-emerald-400">
            {formatCurrency(summary?.collections?.partner_collection || 0)}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-gray-400 text-sm font-medium mb-1">Salary Payments</h3>
          <p className="text-3xl font-bold text-rose-400">
            {formatCurrency(summary?.payments?.salary || 0)}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-gray-400 text-sm font-medium mb-1">Other / Total Collections</h3>
          <p className="text-3xl font-bold text-emerald-400">
            {formatCurrency(summary?.collections?.total || 0)}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-gray-400 text-sm font-medium mb-1">Other / Total Payments</h3>
          <p className="text-3xl font-bold text-rose-400">
            {formatCurrency(summary?.payments?.total || 0)}
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium text-sm"
        >
          + Add Transaction
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">Date</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">Type</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">Category</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">Amount</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {transactions.map((tx) => (
                <tr key={tx._id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {new Date(tx.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      tx.type === "collection" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300 capitalize">
                    {tx.category.replace("_", " ")}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-white">
                    {formatCurrency(tx.amount)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400 capitalize">
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Add Transaction</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => {
                    const newType = e.target.value as "collection" | "payment";
                    setFormData({ 
                      ...formData, 
                      type: newType,
                      category: newType === "collection" ? "cod" : "salary"
                    });
                  }}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 transition-colors"
                  required
                >
                  <option value="collection">Collection (Inflow)</option>
                  <option value="payment">Payment (Outflow)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 transition-colors"
                  required
                >
                  {formData.type === "collection" ? (
                    <>
                      <option value="cod">COD</option>
                      <option value="upi">UPI</option>
                      <option value="partner_collection">Partner Collection</option>
                      <option value="other">Other</option>
                    </>
                  ) : (
                    <>
                      <option value="salary">Salary</option>
                      <option value="other">Other</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 transition-colors"
                  required
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 transition-colors resize-none"
                  rows={3}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-primary-600 hover:bg-primary-500 text-white font-medium py-2.5 rounded-xl transition-all"
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

