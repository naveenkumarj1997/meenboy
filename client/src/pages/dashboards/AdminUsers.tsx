import { useState, useEffect } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { getAllUsers, updateUser, deleteUser } from "../../lib/api";

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

export default function AdminUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "",
    status: "",
    phone: "",
    mapUrl: "",
    address: { line1: "", city: "", state: "", postalCode: "" }
  });

  useEffect(() => {
    if (token) fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, roleFilter, sortConfig]);

  // Reset page when filter/sort/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, sortConfig, searchQuery]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getAllUsers(token!, roleFilter === "all" ? undefined : roleFilter);
      let fetchedUsers = res.users;
      
      // Sort logic
      fetchedUsers.sort((a: any, b: any) => {
        if (sortConfig.key === "name") {
          return sortConfig.direction === "asc" 
            ? a.name.localeCompare(b.name) 
            : b.name.localeCompare(a.name);
        } else {
          // createdAt
          return sortConfig.direction === "asc"
            ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });
      
      setUsers(fetchedUsers);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (user: any) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "",
      status: user.status || "active",
      phone: user.phone || "",
      mapUrl: user.mapUrl || "",
      address: {
        line1: user.address?.line1 || "",
        city: user.address?.city || "",
        state: user.address?.state || "",
        postalCode: user.address?.postalCode || ""
      }
    });
  };

  const handleUpdate = async () => {
    try {
      setError("");
      setSuccess("");
      await updateUser(token!, editingUser._id, editForm);
      setSuccess("User updated successfully");
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || "Failed to update user");
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this user?")) return;
    try {
      setError("");
      await deleteUser(token!, userId);
      setSuccess("User deleted successfully");
      fetchUsers();
    } catch (err: any) {
      setError(err.message || "Failed to delete user");
    }
  };

  const handleToggleBlock = async (user: any) => {
    try {
      setError("");
      const newStatus = user.status === "blocked" ? "active" : "blocked";
      await updateUser(token!, user._id, { status: newStatus });
      setSuccess(`User ${newStatus === "blocked" ? "blocked" : "unblocked"}`);
      
      // Update local state to avoid full refetch
      setUsers(users.map(u => u._id === user._id ? { ...u, status: newStatus } : u));
    } catch (err: any) {
      setError(err.message || "Failed to change user status");
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (user.name && user.name.toLowerCase().includes(q)) ||
      (user.email && user.email.toLowerCase().includes(q)) ||
      (user.phone && user.phone.toLowerCase().includes(q))
    );
  });
  
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const currentUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <DashboardShell
      title="User Management"
      description="Manage customers, admins, and delivery partners."
      navLinks={NAV_LINKS}
    >
      {error && <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">{error}</div>}
      {success && <div className="mb-6 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">{success}</div>}

      <div className="flex gap-4 mb-6">
        {["all", "customer", "delivery_partner", "admin"].map(role => (
          <button
            key={role}
            onClick={() => setRoleFilter(role)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${roleFilter === role ? "bg-teal-500 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
          >
            {role.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center justify-between">
        <div className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search name, email, phone..."
            className="w-full md:w-72 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-teal-500 text-sm"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-slate-400 text-sm">Sort by:</span>
          <select 
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-teal-500 text-sm"
            value={`${sortConfig.key}-${sortConfig.direction}`}
            onChange={(e) => {
              const [key, direction] = e.target.value.split("-");
              setSortConfig({ key, direction });
            }}
          >
            <option value="createdAt-desc">Newest First</option>
            <option value="createdAt-asc">Oldest First</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
          </select>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Name & Email</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Joined</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading && filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading users...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No users found.</td>
                </tr>
              ) : (
                currentUsers.map(user => (
                  <tr key={user._id} className="hover:bg-slate-800/20">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{user.name}</div>
                      <div className="text-xs text-slate-400 mb-2">{user.email}</div>
                      <div className="text-xs text-teal-400 flex items-center gap-1">
                        📞 {user.phone || <span className="text-slate-500 italic">No Phone</span>}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex items-start gap-1">
                        <span>📍</span>
                        <span>
                          {user.address?.line1 ? `${user.address.line1}, ${user.address.city || ''}` : <span className="text-slate-500 italic">No Address</span>}
                        </span>
                      </div>
                      <div className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                        🗺️ {user.mapUrl ? (
                          <a href={user.mapUrl} target="_blank" rel="noreferrer" className="hover:underline">Open Map</a>
                        ) : (
                          <span className="text-slate-500 italic">No Map URL</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 capitalize">{user.role.replace("_", " ")}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-bold rounded ${user.status === 'blocked' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {user.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 items-center">
                        <button onClick={() => openEdit(user)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs transition-colors">Edit</button>
                        
                        {/* Toggle Switch Style for Block/Unblock */}
                        <button 
                          onClick={() => handleToggleBlock(user)} 
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${user.status === 'blocked' ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          title={user.status === 'blocked' ? 'Unblock User' : 'Block User'}
                        >
                          <span 
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${user.status === 'blocked' ? 'translate-x-6' : 'translate-x-1'}`}
                          />
                        </button>
                        
                        {/* <button onClick={() => handleDelete(user._id)} className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded text-xs transition-colors">Delete</button> */}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && filteredUsers.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-slate-400">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
          </div>
          <div className="flex gap-2 items-center">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="px-3 py-1.5 bg-slate-800 text-white rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
            >
              Prev
            </button>
            <span className="px-3 py-1 text-sm text-slate-300">Page {currentPage} of {totalPages}</span>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-3 py-1.5 bg-slate-800 text-white rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl my-8">
            <h3 className="text-xl font-bold text-white mb-6">Edit User: {editingUser.name}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">Name</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-teal-500"
                  value={editForm.name}
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">Email</label>
                <input 
                  type="email" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-teal-500"
                  value={editForm.email}
                  onChange={e => setEditForm({...editForm, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">Role</label>
                <select 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-teal-500"
                  value={editForm.role}
                  onChange={e => setEditForm({...editForm, role: e.target.value})}
                >
                  <option value="customer">Customer</option>
                  <option value="delivery_partner">Delivery Partner</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">Phone</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-teal-500"
                  value={editForm.phone}
                  onChange={e => setEditForm({...editForm, phone: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">Google Maps URL</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-teal-500"
                  value={editForm.mapUrl}
                  onChange={e => setEditForm({...editForm, mapUrl: e.target.value})}
                />
              </div>
            </div>

            <h4 className="text-white font-medium mb-3">Address</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="md:col-span-2">
                <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">Street Address</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-teal-500"
                  value={editForm.address.line1}
                  onChange={e => setEditForm({...editForm, address: {...editForm.address, line1: e.target.value}})}
                />
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">City</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-teal-500"
                  value={editForm.address.city}
                  onChange={e => setEditForm({...editForm, address: {...editForm.address, city: e.target.value}})}
                />
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">Postal Code</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white outline-none focus:border-teal-500"
                  value={editForm.address.postalCode}
                  onChange={e => setEditForm({...editForm, address: {...editForm.address, postalCode: e.target.value}})}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setEditingUser(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdate}
                className="flex-1 bg-teal-500 hover:bg-teal-400 text-white py-3 rounded-lg font-bold transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
