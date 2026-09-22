import { useState, useEffect } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import {
  getAllUsers,
  updateUser,
  fetchPartnerDocumentBlob,
  deletePartnerDocument,
  downloadPartnerNdaPdf
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
      const res = await getAllUsers(token!, { role: "delivery_partner", realOnly: true });
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

  const handleDownloadNda = async (partner: any) => {
    try {
      setError("");
      setBusyId(partner._id);
      const blob = await downloadPartnerNdaPdf(token!, { partnerId: partner._id });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NDA-${String(partner.name || "partner").replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => {
        window.open(url, "_blank", "noopener,noreferrer");
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }, 250);
    } catch (err: any) {
      setError(err.message || "Failed to download NDA PDF");
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

  const renderPartnerCard = (partner: any) => {
    const hasDoc = Boolean(partner.hasDocument);
    const hasNda = Boolean(partner.hasNdaAccepted);
    const canApprove = hasDoc && hasNda;
    const busy = busyId === partner._id;

    return (
      <div
        key={partner._id}
        className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-4"
      >
        <div>
          <div className="font-bold text-white break-words">{partner.name}</div>
          <div className="text-xs text-slate-400 break-all">{partner.email}</div>
          <div className="text-xs text-slate-500 mt-1">
            {partner.phone ? (
              <span className="text-teal-400">📞 {partner.phone}</span>
            ) : (
              <span className="italic">No phone</span>
            )}
            {" · "}
            {new Date(partner.createdAt).toLocaleString()}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-1 text-xs">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">NDA / Hire</div>
          {hasNda ? (
            <>
              <div className="text-emerald-400 font-medium">NDA accepted online</div>
              <div className="text-slate-400 break-all">Aadhaar: {partner.aadhaarNumber || "—"}</div>
              <div className="text-slate-400 break-all">DL: {partner.dlNumber || "—"}</div>
              <div className="text-slate-400 break-all">RC: {partner.bikeRcNumber || "—"}</div>
              <div className="text-slate-400 break-all">Bike: {partner.bikeNumber || "—"}</div>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleDownloadNda(partner)}
                className="mt-2 w-full min-h-10 px-3 py-2 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-bold hover:bg-teal-500/25 disabled:opacity-40"
              >
                Download NDA PDF
              </button>
            </>
          ) : (
            <span className="text-amber-500/80 italic">Waiting for NDA</span>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2 text-xs">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Document</div>
          {hasDoc ? (
            <>
              <div className="text-slate-300 break-words">
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
                  className="flex-1 min-h-10 px-3 py-2 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-bold hover:bg-blue-500/25 disabled:opacity-40"
                >
                  View PDF
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDeleteDocument(partner)}
                  className="flex-1 min-h-10 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-700 disabled:opacity-40"
                >
                  Delete Doc
                </button>
              </div>
            </>
          ) : (
            <span className="text-amber-500/80 italic">Waiting for upload</span>
          )}
        </div>

        <div className="flex flex-col xs:flex-row gap-2">
          <button
            onClick={() => handleAction(partner._id, "active", partner.name)}
            disabled={!canApprove || busy}
            className="flex-1 min-h-11 px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-lg font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={
              !canApprove
                ? "Need NDA accepted + document uploaded before approve"
                : "Collect signed NDA paper, then approve"
            }
          >
            Approve
          </button>
          <button
            onClick={() => handleAction(partner._id, "rejected", partner.name)}
            disabled={busy}
            className="flex-1 min-h-11 px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Reject
          </button>
        </div>
      </div>
    );
  };

  return (
    <DashboardShell
      title="Partner Approvals"
      description="Review NDA hire details + PDF proof (Aadhaar / DL / RC / Voter ID), collect signed NDA printout, then approve or reject."
      navLinks={ADMIN_NAV_LINKS}
    >
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 break-words">{error}</div>
      )}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 break-words">{success}</div>
      )}

      {/* Mobile: stacked cards */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-10 text-center text-slate-500 text-sm">
            Loading pending applications...
          </div>
        ) : pendingPartners.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-10 text-center text-slate-500 text-sm">
            <div className="text-3xl mb-2">✅</div>
            You&apos;re all caught up! No pending applications.
          </div>
        ) : (
          pendingPartners.map(renderPartnerCard)
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300 min-w-[720px]">
            <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Applicant Details</th>
                <th className="px-6 py-4 font-medium">NDA / Hire</th>
                <th className="px-6 py-4 font-medium">Document</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    Loading pending applications...
                  </td>
                </tr>
              ) : pendingPartners.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    <div className="text-4xl mb-3">✅</div>
                    <div>You&apos;re all caught up! No pending applications.</div>
                  </td>
                </tr>
              ) : (
                pendingPartners.map((partner) => {
                  const hasDoc = Boolean(partner.hasDocument);
                  const hasNda = Boolean(partner.hasNdaAccepted);
                  const canApprove = hasDoc && hasNda;
                  const busy = busyId === partner._id;
                  return (
                    <tr key={partner._id} className="hover:bg-slate-800/20">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white">{partner.name}</div>
                        <div className="text-xs text-slate-400">{partner.email}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {partner.phone ? (
                            <span className="text-teal-400">📞 {partner.phone}</span>
                          ) : (
                            <span className="italic">No phone</span>
                          )}
                          {" · "}
                          {new Date(partner.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {hasNda ? (
                          <div className="space-y-1 text-xs">
                            <div className="text-emerald-400 font-medium">NDA accepted online</div>
                            <div className="text-slate-400">Aadhaar: {partner.aadhaarNumber || "—"}</div>
                            <div className="text-slate-400">DL: {partner.dlNumber || "—"}</div>
                            <div className="text-slate-400">RC: {partner.bikeRcNumber || "—"}</div>
                            <div className="text-slate-400">Bike: {partner.bikeNumber || "—"}</div>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleDownloadNda(partner)}
                              className="mt-2 px-3 py-1.5 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-bold hover:bg-teal-500/25 disabled:opacity-40"
                            >
                              Download NDA PDF
                            </button>
                          </div>
                        ) : (
                          <span className="text-amber-500/80 text-xs italic">Waiting for NDA</span>
                        )}
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
                            disabled={!canApprove || busy}
                            className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-lg font-bold transition-colors shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
                            title={
                              !canApprove
                                ? "Need NDA accepted + document uploaded before approve"
                                : "Collect signed NDA paper, then approve"
                            }
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
          <div className="px-4 sm:px-6 py-4 border-b border-slate-800">
            <h3 className="text-white font-bold">Stored documents (cleanup)</h3>
            <p className="text-xs text-slate-500 mt-1">
              Already reviewed partners still have PDFs in the database. Delete them to free space.
            </p>
          </div>
          <div className="divide-y divide-slate-800/60">
            {partnersWithDocs.map((partner) => (
              <div
                key={partner._id}
                className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-white font-medium break-words">{partner.name}</div>
                  <div className="text-xs text-slate-500">
                    {partner.status} · {partner.documentTypeLabel || partner.documentType || "PDF"}
                    {partner.hasNdaAccepted ? " · NDA ok" : ""}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {partner.hasNdaAccepted && (
                    <button
                      type="button"
                      disabled={busyId === partner._id}
                      onClick={() => handleDownloadNda(partner)}
                      className="px-3 py-1.5 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-bold"
                    >
                      NDA PDF
                    </button>
                  )}
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
