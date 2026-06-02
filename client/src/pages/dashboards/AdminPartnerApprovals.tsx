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
  { label: "Users", href: "/dashboard/admin/users" },
  { label: "Money", href: "/dashboard/admin/finance" },
  { label: "Availability", href: "/dashboard/admin/availability" },
  { label: "Manual Booking", href: "/dashboard/admin/manual-booking" }
];

export default function AdminPartnerApprovals() {
  const { token } = useAuth();
  const [pendingPartners, setPendingPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchPendingPartners = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getAllUsers(token!, "delivery_partner");
      const pending = res.users.filter(u => u.status === "pending");
      setPendingPartners(pending);
    } catch (err: any) {
      setError(err.message || "Failed to load pending partners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchPendingPartners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleAction = async (userId: string, action: "active" | "rejected", name: string) => {
    if (!window.confirm(`Are you sure you want to ${action === "active" ? "Approve" : "Reject"} ${name}?`)) return;
    
    try {
      setError("");
      setSuccess("");
      await updateUser(token!, userId, { status: action });
      setSuccess(`User ${name} has been ${action === "active" ? "approved" : "rejected"}!`);
      // Re-fetch to remove from the pending list
      fetchPendingPartners();
    } catch (err: any) {
      setError(err.message || `Failed to ${action} user`);
    }
  };

  return (
    <DashboardShell
      title="Partner Approvals"
      description="Review and approve new delivery partner registrations."
      navLinks={NAV_LINKS}
    >
      {error && <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">{error}</div>}
      {success && <div className="mb-6 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">{success}</div>}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Applicant Details</th>
                <th className="px-6 py-4 font-medium">Phone Number</th>
                <th className="px-6 py-4 font-medium">Applied Date</th>
                <th className="px-6 py-4 font-medium">Document</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading pending applications...</td>
                </tr>
              ) : pendingPartners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    <div className="text-4xl mb-3">✅</div>
                    <div>You're all caught up! No pending applications.</div>
                  </td>
                </tr>
              ) : (
                pendingPartners.map(partner => (
                  <tr key={partner._id} className="hover:bg-slate-800/20">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{partner.name}</div>
                      <div className="text-xs text-slate-400">{partner.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {partner.phone ? (
                        <span className="text-teal-400">📞 {partner.phone}</span>
                      ) : (
                        <span className="text-slate-500 italic">Not provided</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(partner.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {partner.documentUrl ? (
                        <a 
                          href={import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace('/api', '')}${partner.documentUrl}` : `http://localhost:5000${partner.documentUrl}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-blue-400 hover:text-blue-300 underline font-medium text-xs"
                        >
                          📄 View PDF
                        </a>
                      ) : (
                        <span className="text-amber-500/80 text-xs italic">Waiting for upload</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 items-center">
                        <button 
                          onClick={() => handleAction(partner._id, "active", partner.name)} 
                          disabled={!partner.documentUrl}
                          className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-lg font-bold transition-colors shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
                          title={!partner.documentUrl ? "Cannot approve until document is uploaded" : ""}
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => handleAction(partner._id, "rejected", partner.name)} 
                          disabled={!partner.documentUrl}
                          className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg font-bold transition-colors shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
                          title={!partner.documentUrl ? "Cannot reject until document is uploaded" : ""}
                        >
                          Reject
                        </button>
                      </div>
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
