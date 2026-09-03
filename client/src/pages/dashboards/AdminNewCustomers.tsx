import { useState, useEffect, useMemo } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { getAllUsers, updateUser } from "../../lib/api";
import { CustomerSourceBadge } from "../../components/SourceBadges";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";

export default function AdminNewCustomers() {
  const { token } = useAuth();
  const [newCustomers, setNewCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchNewCustomers = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getAllUsers(token!, { role: "customer", realOnly: true });
      const unnoticed = (res.users || []).filter((u: any) => u.isNoticed === false);
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortConfig]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = [...newCustomers];

    if (q) {
      list = list.filter((c) => {
        const hay = [
          c.name,
          c.email,
          c.phone,
          c.alternatePhone,
          c.customerSource
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    list.sort((a, b) => {
      if (sortConfig.key === "name") {
        const an = String(a.name || "").toLowerCase();
        const bn = String(b.name || "").toLowerCase();
        const cmp = an.localeCompare(bn);
        return sortConfig.direction === "asc" ? cmp : -cmp;
      }
      if (sortConfig.key === "phone") {
        const ap = String(a.phone || "");
        const bp = String(b.phone || "");
        const cmp = ap.localeCompare(bp);
        return sortConfig.direction === "asc" ? cmp : -cmp;
      }
      const at = new Date(a.createdAt || 0).getTime();
      const bt = new Date(b.createdAt || 0).getTime();
      return sortConfig.direction === "asc" ? at - bt : bt - at;
    });

    return list;
  }, [newCustomers, searchQuery, sortConfig]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const pageCustomers = filteredCustomers.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage
  );

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
      navLinks={ADMIN_NAV_LINKS}
    >
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
          {success}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-center justify-between">
        <input
          type="text"
          placeholder="Search name, email, phone..."
          className="w-full md:w-72 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-teal-500 text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="flex gap-3 items-center w-full md:w-auto">
          <span className="text-slate-400 text-sm shrink-0">Sort by:</span>
          <select
            className="flex-1 md:flex-none bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-teal-500 text-sm"
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
            <option value="phone-asc">Phone (A-Z)</option>
            <option value="phone-desc">Phone (Z-A)</option>
          </select>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3 mb-4">
        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-500 text-sm">
            Loading new customers...
          </div>
        ) : pageCustomers.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-500 text-sm">
            {searchQuery.trim() ? "No customers match your search." : "No new customers to review!"}
          </div>
        ) : (
          pageCustomers.map((customer) => (
            <div
              key={customer._id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3"
            >
              <div>
                <div className="font-bold text-white">{customer.name}</div>
                <div className="text-xs text-slate-400">{customer.email}</div>
              </div>
              <CustomerSourceBadge source={customer.customerSource} role="customer" />
              <div className="text-sm">
                {customer.phone ? (
                  <div className="text-teal-400 font-medium">{customer.phone}</div>
                ) : (
                  <span className="text-slate-500 italic">No phone</span>
                )}
                {customer.alternatePhone ? (
                  <div className="text-amber-300 text-xs mt-0.5">Alt: {customer.alternatePhone}</div>
                ) : null}
              </div>
              <div className="text-xs text-slate-400">
                Joined {new Date(customer.createdAt).toLocaleString()}
              </div>
              <button
                type="button"
                onClick={() => handleNoticed(customer._id, customer.name)}
                className="w-full px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg font-bold text-sm"
              >
                Mark as Noticed
              </button>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Customer Details</th>
                <th className="px-6 py-4 font-medium">Customer type</th>
                <th className="px-6 py-4 font-medium">Phone Number</th>
                <th className="px-6 py-4 font-medium">Joined Date</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Loading new customers...
                  </td>
                </tr>
              ) : pageCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    {searchQuery.trim()
                      ? "No customers match your search."
                      : "No new customers to review!"}
                  </td>
                </tr>
              ) : (
                pageCustomers.map((customer) => (
                  <tr key={customer._id} className="hover:bg-slate-800/20">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{customer.name}</div>
                      <div className="text-xs text-slate-400">{customer.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <CustomerSourceBadge source={customer.customerSource} role="customer" />
                    </td>
                    <td className="px-6 py-4">
                      {customer.phone ? (
                        <div className="text-teal-400 font-medium">{customer.phone}</div>
                      ) : (
                        <span className="text-slate-500 italic">Not provided</span>
                      )}
                      {customer.alternatePhone ? (
                        <div className="text-amber-300 text-xs mt-0.5">
                          Alt: {customer.alternatePhone}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(customer.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
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

      {!loading && filteredCustomers.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
          <div className="text-sm text-slate-400">
            Showing {(safePage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(safePage * itemsPerPage, filteredCustomers.length)} of{" "}
            {filteredCustomers.length} customers
          </div>
          <div className="flex gap-2 items-center">
            <button
              type="button"
              disabled={safePage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 bg-slate-800 text-white rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
            >
              Prev
            </button>
            <span className="px-3 py-1 text-sm text-slate-300">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 bg-slate-800 text-white rounded text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
