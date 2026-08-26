import { useState, useEffect } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import {
  getAllUsers,
  updateUser,
  fetchPartnerDocumentBlob,
  deletePartnerDocument
} from "../../lib/api";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";

export default function AdminPartnerApprovals() {
  const { token } = useAuth();
  const [pendingPartners, setPendingPartners] = useState<any[]>([]);
  const [partnersWithDocs, setPartnersWithDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchPendingPartners = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getAllUsers(token!, "delivery_partner");
      const all = res.users || [];
      setPendingPartners(all.filter((u: any) => u.status === "pending"));
      setPartnersWithDocs(
        all.filter((u: any) => u.hasDocument && u.status !== "pending")
      );
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
      setBusyId(userId);
      await updateUser(token!, userId, { status: action });
      setSuccess(`User ${name} has been ${action === "active" ? "approved" : "rejected"}!`);
      fetchPendingPartners();
    } catch (err: any) {
      setError(err.message || `Failed to ${action} user`);
    } finally {
      setBusyId(null);
    }
  };

  const handleViewDocument = async (partner: any) => {
    try {
      setError("");
      setBusyId(partner._id);
      const blob = await fetchPartnerDocumentBlob(token!, partner._id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err: any) {
      setError(err.message || "Failed to open document");
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteDocument = async (partner: any) => {
    if (
      !window.confirm(
        `Delete ${partner.name}'s uploaded document from the database to free storage? You can still keep Approve/Reject status.`
      )
    ) {
      return;
    }

    try {
      setError("");
      setSuccess("");
      setBusyId(partner._id);
      await deletePartnerDocument(token!, partner._id);
      setSuccess(`Document for ${partner.name} deleted from database.`);
      fetchPendingPartners();
    } catch (err: any) {
      setError(err.message || "Failed to delete document");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardShell
      title="Partner Approvals"
      description="Review partner PDF proof (Aadhaar / DL / RC / Voter ID), then approve or reject. Delete docs after review to save DB space."
      navLinks={ADMIN_NAV_LINKS}
    >
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">{error}</div>
      )}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">{success}</div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Applicant Details</th>
                <th className="px-6 py-4 font-medium">Phone</th>
                <th className="px-6 py-4 font-medium">Applied</th>
                <th className="px-6 py-4 font-medium">Document</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Loading pending applications...
                  </td>
                </tr>
              ) : pendingPartners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    <div className="text-4xl mb-3">✅</div>
                    <div>You're all caught up! No pending applications.</div>
                  </td>
                </tr>
              ) : (
                pendingPartners.map((partner) => {
                  const hasDoc = Boolean(partner.hasDocument);
                  const busy = busyId === partner._id;
                  return (
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
                        {hasDoc ? (
                          <div className="space-y-2">
                            <div className="text-xs text-slate-300">
                              {partner.documentTypeLabel || partner.documentType || "PDF"}
                              {partner.documentFileName ? (
                                <span className="text-slate-500"> · {partner.documentFileName}</span>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleViewDocument(partner)}
                                className="px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-bold hover:bg-blue-500/25 disabled:opacity-40"
                              >
                                View PDF
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleDeleteDocument(partner)}
                                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-700 disabled:opacity-40"
                                title="Remove PDF from database to free storage"
                              >
                                Delete Doc
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-amber-500/80 text-xs italic">Waiting for upload</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2 items-center">
                          <button
                            onClick={() => handleAction(partner._id, "active", partner.name)}
                            disabled={!hasDoc || busy}
                            className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-lg font-bold transition-colors shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
                            title={!hasDoc ? "Cannot approve until document is uploaded" : ""}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(partner._id, "rejected", partner.name)}
                            disabled={busy}
                            className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg font-bold transition-colors shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {partnersWithDocs.length > 0 && (
        <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800">
            <h3 className="text-white font-bold">Stored documents (cleanup)</h3>
            <p className="text-xs text-slate-500 mt-1">
              Already reviewed partners still have PDFs in the database. Delete them to free space.
            </p>
          </div>
          <div className="divide-y divide-slate-800/60">
            {partnersWithDocs.map((partner) => (
              <div
                key={partner._id}
                className="px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="text-white font-medium">{partner.name}</div>
                  <div className="text-xs text-slate-500">
                    {partner.status} · {partner.documentTypeLabel || partner.documentType || "PDF"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === partner._id}
                    onClick={() => handleViewDocument(partner)}
                    className="px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-bold"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    disabled={busyId === partner._id}
                    onClick={() => handleDeleteDocument(partner)}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold"
                  >
                    Delete Doc
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
