import { useState, useEffect } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { updateUser } from "../../lib/api";

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

export default function AdminProfile() {
  const { user, token } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        password: ""
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user) return;
    
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      
      const updatePayload: any = {
        name: formData.name,
        email: formData.email
      };
      
      if (formData.password) {
        if (formData.password.length < 8) {
          throw new Error("Password must be at least 8 characters long");
        }
        updatePayload.password = formData.password;
      }

      await updateUser(token, user.id || (user as any)._id, updatePayload);
      setSuccess("Profile updated successfully!");
      setFormData(prev => ({ ...prev, password: "" })); // Clear password field
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardShell
      title="Admin Profile"
      description="Update your personal admin account details."
      navLinks={NAV_LINKS}
    >
      <div className="max-w-2xl">
        {error && <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">{error}</div>}
        {success && <div className="mb-6 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">{success}</div>}

        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <label className="block text-slate-400 text-sm font-medium mb-2">Name</label>
            <input 
              type="text" 
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-teal-500"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-slate-400 text-sm font-medium mb-2">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-teal-500"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="pt-4 border-t border-slate-800">
            <label className="block text-slate-400 text-sm font-medium mb-2">New Password (optional)</label>
            <input 
              type="password" 
              placeholder="Leave blank to keep current password"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-teal-500"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <div className="pt-2">
            <button 
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-lg font-bold transition-colors"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}

