import { useState, useEffect } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { getAdminOverview } from "../../lib/api";

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

const AdminDashboard = () => {
  const { token } = useAuth();
  const [data, setData] = useState({ totalProducts: 0, activeOrders: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      getAdminOverview(token)
        .then(res => {
          setData(res);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [token]);

  return (
    <DashboardShell
      title="Admin Dashboard"
      description="Manage platform operations, monitor users, and control access."
      navLinks={ADMIN_NAV_LINKS}
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-medium text-white mb-2">Total Products</h3>
          <p className="text-3xl font-bold text-teal-400">
            {loading ? "..." : data.totalProducts}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-medium text-white mb-2">Active Orders</h3>
          <p className="text-3xl font-bold text-teal-400">
            {loading ? "..." : data.activeOrders}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-medium text-white mb-2">Revenue</h3>
          <p className="text-3xl font-bold text-teal-400">
            {loading ? "..." : `₹${data.revenue.toFixed(2)}`}
          </p>
        </div>
      </div>
    </DashboardShell>
  );
};

export default AdminDashboard;

