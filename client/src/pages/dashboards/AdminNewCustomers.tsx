import { useState, useEffect } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { getAllUsers, updateUser } from "../../lib/api";

const NAV_LINKS = [
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

export default function AdminNewCustomers() {
  const { token } = useAuth();
  const [newCustomers, setNewCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchNewCustomers = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getAllUsers(token!, "customer");
      // Filter out those who are already noticed
      const unnoticed = res.users.filter(u => u.isNoticed === false);
      setNewCustomers(unnoticed);
    } catch (err: any) {
      setError(err.message || "Failed to load new customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchNewCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleNoticed = async (userId: string, name: string) => {
    try {
      setError("");
      setSuccess("");
      await updateUser(token!, userId, { isNoticed: true });
      setSuccess(`${name} has been marked as noticed.`);
      fetchNewCustomers();
    } catch (err: any) {
      setError(err.message || "Failed to update status");
    }
  };

  return (
    <DashboardShell
      title="New Customers"
      description="Recently registered customers that haven't been noticed yet."
      navLinks={NAV_LINKS}
    >
      {error && <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">{error}</div>}
      {success && <div className="mb-6 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">{success}</div>}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Customer Details</th>
                <th className="px-6 py-4 font-medium">Phone Number</th>
                <th className="px-6 py-4 font-medium">Joined Date</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Loading new customers...</td>
                </tr>
              ) : newCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    <div className="text-4xl mb-3">✅</div>
                    <div>No new customers to review!</div>
                  </td>
                </tr>
              ) : (
                newCustomers.map(customer => (
                  <tr key={customer._id} className="hover:bg-slate-800/20">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{customer.name}</div>
                      <div className="text-xs text-slate-400">{customer.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {customer.phone ? (
                        <span className="text-teal-400 font-medium">📞 {customer.phone}</span>
                      ) : (
                        <span className="text-slate-500 italic">Not provided</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(customer.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleNoticed(customer._id, customer.name)} 
                        className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg font-bold transition-colors shadow-lg shadow-indigo-500/20"
                      >
                        Mark as Noticed
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}

