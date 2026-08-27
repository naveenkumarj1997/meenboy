import { useState, useEffect } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { getPartnerAssignments, updateDeliveryStatus, reorderAssignments, uploadPartnerDocument } from "../../lib/api";
import { formatQuantityLabel } from "../../lib/weightOptions";

const NAV_LINKS = [
  { label: "Deliveries", href: "/dashboard/delivery" },
  { label: "Earnings", href: "/dashboard/delivery/earnings" }
];

function DocumentUploadForm({ token, onSuccess }: { token: string, onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [phone, setPhone] = useState("");
  const [documentType, setDocumentType] = useState("aadhaar");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !phone || !documentType) return;

    if (file.size > 200 * 1024) {
      setError("PDF must be under 200 KB. Compress the file and try again.");
      return;
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("File must be a PDF.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await uploadPartnerDocument(token, file, phone, documentType);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to upload document");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 mt-10">
      <h2 className="text-xl font-bold text-white mb-4">Required Document</h2>
      <p className="text-sm text-slate-400 mb-6">
        Upload <span className="text-teal-300 font-medium">any one</span> PDF proof:
        Aadhaar, Driving License, RC Book, or Voter ID.
        File must be under <span className="text-amber-300 font-medium">200 KB</span>.
      </p>

      {error && <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>}

      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">Phone Number</label>
          <input 
            type="text" 
            required
            placeholder="e.g. 9876543210"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-teal-500"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">Document Type</label>
          <select
            required
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-teal-500"
          >
            <option value="aadhaar">Aadhaar</option>
            <option value="dl">Driving License (DL)</option>
            <option value="rc">RC Book</option>
            <option value="voter_id">Voter ID</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">PDF Document (max 200 KB)</label>
          <input 
            type="file" 
            accept="application/pdf,.pdf"
            required
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-teal-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-teal-500/20 file:text-teal-400 hover:file:bg-teal-500/30 cursor-pointer"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file && (
            <p className={`text-xs mt-2 ${file.size > 200 * 1024 ? "text-rose-400" : "text-slate-500"}`}>
              Selected: {file.name} ({Math.round(file.size / 1024)} KB)
            </p>
          )}
        </div>

        <button 
          type="submit"
          disabled={loading || !file || !phone}
          className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors mt-4"
        >
          {loading ? "Uploading..." : "Submit Document"}
        </button>
      </form>
    </div>
  );
}

function getLocalDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DeliveryDashboard() {
  const { token, user } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"queue" | "collections">("queue");
  const [queueFilter, setQueueFilter] = useState<"today" | "tomorrow">("today");

  const [pastDate, setPastDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Status form state
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [statusForm, setStatusForm] = useState({
    status: "",
    notes: "",
    paymentCollected: 0,
    paymentMethod: "none"
  });

  useEffect(() => {
    if (token) fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await getPartnerAssignments(token!);
      // Ensure sorted by sequence
      const sorted = res.assignments.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
      setAssignments(sorted);
    } catch (err: any) {
      setError(err.message || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    // Must reorder within the visible day queue — not the full assignments array
    const dateStr = queueFilter === "today" ? getLocalDateStr(0) : getLocalDateStr(1);
    const dayList = assignments
      .filter((a) => {
        if (["delivered", "failed", "cancelled"].includes(a.status)) return false;
        return a.order?.deliveryDate === dateStr;
      })
      .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === dayList.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const reorderedDay = [...dayList];
    [reorderedDay[index], reorderedDay[targetIndex]] = [
      reorderedDay[targetIndex],
      reorderedDay[index]
    ];

    // Sequence only needs to be correct within this day's queue
    const sequenceById = new Map(reorderedDay.map((a, i) => [a._id, i]));

    const updatedAssignments = assignments
      .map((a) =>
        sequenceById.has(a._id) ? { ...a, sequence: sequenceById.get(a._id) } : a
      )
      .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

    setAssignments(updatedAssignments);

    try {
      const payload = reorderedDay.map((a, i) => ({ id: a._id, sequence: i }));
      await reorderAssignments(token!, payload);
    } catch (err) {
      console.error("Failed to sync reorder", err);
      setError("Could not save new route order. Try again.");
      fetchAssignments();
    }
  };

  const openStatusModal = (assignment: any) => {
    setSelectedAssignment(assignment);
    setStatusForm({
      status: "delivered",
      notes: "",
      paymentCollected: assignment.order?.total || 0,
      paymentMethod: "cash"
    });
  };

  const applyPaymentMethod = (method: string) => {
    if (method === "cash" || method === "upi") {
      setStatusForm((prev) => ({
        ...prev,
        paymentMethod: method,
        paymentCollected: Number(selectedAssignment?.order?.total || 0)
      }));
      return;
    }
    if (method === "partial_cash" || method === "partial_upi") {
      setStatusForm((prev) => ({
        ...prev,
        paymentMethod: method,
        paymentCollected: 0
      }));
      return;
    }
    // pay_later / none
    setStatusForm((prev) => ({
      ...prev,
      paymentMethod: method,
      paymentCollected: 0
    }));
  };

  const submitStatus = async () => {
    if (!selectedAssignment) return;

    if (statusForm.status === "failed" && !statusForm.notes.trim()) {
      setError("Please enter a reason for failed delivery.");
      return;
    }

    let collected = Number(statusForm.paymentCollected) || 0;
    const total = Number(selectedAssignment.order?.total || 0);
    const method = statusForm.paymentMethod;

    if (statusForm.status === "delivered") {
      if (method === "cash" || method === "upi") {
        collected = total;
      } else if (method === "pay_later" || method === "none") {
        collected = 0;
      } else if (method === "partial_cash" || method === "partial_upi") {
        if (collected <= 0) {
          setError("Enter how much cash/UPI you collected for this partial payment.");
          return;
        }
        if (collected >= total) {
          setError("Partial amount must be less than the full order total. Use Full Cash/UPI if fully paid.");
          return;
        }
      }
    }

    try {
      setUpdatingId(selectedAssignment._id);
      setError("");
      setSuccess("");

      const payload: any = { status: statusForm.status };
      if (statusForm.status === "failed") {
        payload.notes = statusForm.notes;
      }
      if (statusForm.status === "delivered") {
        payload.paymentCollected = collected;
        payload.paymentMethod = method;
      }
      if (statusForm.status === "delivered" || statusForm.status === "en_route") {
        payload.actualArrival = statusForm.status === "delivered" ? new Date().toISOString() : undefined;
      }

      await updateDeliveryStatus(token!, selectedAssignment._id, payload);
      setSuccess(`Assignment marked as ${statusForm.status.replace(/_/g, " ")}`);
      setSelectedAssignment(null);
      fetchAssignments();
    } catch (err: any) {
      setError(err.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const [localHasDocument, setLocalHasDocument] = useState<boolean>(
    Boolean((user as any)?.hasDocument || (user as any)?.documentUrl || (user as any)?.documentUploadedAt)
  );

  if (user?.status === "pending") {
    if (!localHasDocument) {
      return (
        <DashboardShell title="Delivery Partner Dashboard" description={`Welcome, ${user?.name}.`} navLinks={NAV_LINKS}>
          <DocumentUploadForm 
            token={token!} 
            onSuccess={() => setLocalHasDocument(true)} 
          />
        </DashboardShell>
      );
    }

    return (
      <DashboardShell title="Delivery Partner Dashboard" description={`Welcome, ${user?.name}.`} navLinks={NAV_LINKS}>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-500 text-3xl rounded-full flex items-center justify-center mb-6 border border-amber-500/20">
            ⏳
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Waiting for Admin Approval</h2>
          <p className="text-slate-400 max-w-md mx-auto">
            Your verification document has been submitted. You will be able to access your deliveries once an admin approves your account.
          </p>
        </div>
      </DashboardShell>
    );
  }

  if (loading && assignments.length === 0) {
    return (
      <DashboardShell title="Delivery Dashboard" description="Loading your deliveries..." navLinks={NAV_LINKS}>
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  const getTodayDateStr = () => getLocalDateStr(0);

  const getTomorrowDateStr = () => getLocalDateStr(1);

  const todayStr = getTodayDateStr();
  const tomorrowStr = getTomorrowDateStr();

  const todayAssignments = assignments
    .filter(a => {
      if (["delivered", "failed", "cancelled"].includes(a.status)) return false;
      return a.order?.deliveryDate === todayStr;
    })
    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

  const tomorrowAssignments = assignments
    .filter(a => {
      if (["delivered", "failed", "cancelled"].includes(a.status)) return false;
      return a.order?.deliveryDate === tomorrowStr;
    })
    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

  const activeAssignments = queueFilter === "today" ? todayAssignments : tomorrowAssignments;
  
  const pastAssignments = assignments.filter(a => 
    ["delivered", "failed", "cancelled"].includes(a.status) &&
    a.order?.deliveryDate === pastDate
  );

  // Compute collections (include partial cash/UPI)
  const today = new Date().toLocaleDateString();
  const todayDelivered = assignments.filter(a => a.status === "delivered" && new Date(a.updatedAt).toLocaleDateString() === today);
  const totalCash = todayDelivered
    .filter((a) => a.paymentMethod === "cash" || a.paymentMethod === "partial_cash")
    .reduce((sum, a) => sum + (a.paymentCollected || 0), 0);
  const totalUPI = todayDelivered
    .filter((a) => a.paymentMethod === "upi" || a.paymentMethod === "partial_upi")
    .reduce((sum, a) => sum + (a.paymentCollected || 0), 0);

  const formatPaymentMethod = (method?: string) => {
    switch (method) {
      case "cash": return "Cash (Full)";
      case "upi": return "UPI (Full)";
      case "partial_cash": return "Partial Cash";
      case "partial_upi": return "Partial UPI";
      case "pay_later": return "Pay Later";
      case "none": return "Already Paid / None";
      default: return method || "-";
    }
  };

  return (
    <DashboardShell
      title="Delivery Partner Dashboard"
      description={`Welcome back, ${user?.name}.`}
      navLinks={NAV_LINKS}
    >
      {error && <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">{error}</div>}
      {success && <div className="mb-6 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">{success}</div>}

      <div className="flex space-x-4 mb-8">
        <button
          onClick={() => setActiveTab("queue")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "queue" ? "bg-teal-500 text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
        >
          Active Queue
        </button>
        <button
          onClick={() => setActiveTab("collections")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "collections" ? "bg-teal-500 text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
        >
          My Collections
        </button>
      </div>

      {activeTab === "queue" && (
        <div className="space-y-6">
          <div className="flex space-x-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800 w-fit">
            <button
              onClick={() => setQueueFilter("today")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${queueFilter === "today" ? "bg-teal-500 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
            >
              Today ({todayStr})
            </button>
            <button
              onClick={() => setQueueFilter("tomorrow")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${queueFilter === "tomorrow" ? "bg-teal-500 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
            >
              Tomorrow ({tomorrowStr})
            </button>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Deliveries for {queueFilter === "today" ? "Today" : "Tomorrow"} ({activeAssignments.length})</h2>
            <div className="text-xs text-slate-400">Rearrange the cards to plan your route</div>
          </div>

          {activeAssignments.length === 0 ? (
             <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
               No active deliveries assigned right now.
             </div>
          ) : (
            <div className="space-y-4">
              {activeAssignments.map((a, index) => {
                const order = a.order || {};
                const isNext = index === 0;
                
                return (
                  <div key={a._id} className={`bg-slate-900/50 border ${isNext ? 'border-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.2)]' : 'border-slate-800'} rounded-xl p-5 flex flex-col md:flex-row gap-4 items-center`}>
                    
                    {/* Reorder controls */}
                    <div className="flex flex-row md:flex-col gap-2 mr-0 md:mr-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMove(index, "up")}
                        disabled={index === 0}
                        aria-label="Move up in route"
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 disabled:hover:text-slate-200"
                      >
                        ▲
                      </button>
                      <span className="min-w-[44px] min-h-[44px] flex items-center justify-center font-bold text-slate-400 text-sm">
                        {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMove(index, "down")}
                        disabled={index === activeAssignments.length - 1}
                        aria-label="Move down in route"
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 disabled:hover:text-slate-200"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 w-full">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        {isNext && <span className="bg-teal-500 text-teal-950 text-xs font-bold px-2 py-0.5 rounded animate-pulse">UP NEXT</span>}
                        <span className="text-white font-bold">Order #{String(order._id).slice(-6).toUpperCase()}</span>
                        <span className="text-slate-400 text-sm">{order.deliveryDate} • {order.deliveryTime}</span>
                      </div>
                      
                      <div className="text-slate-300 text-sm mb-3">
                        <div className="font-medium text-white mb-1">{order.address?.line1}, {order.address?.line2}</div>
                        <div>{order.address?.city}, {order.address?.postalCode}</div>
                        {order.address?.phone && <div className="text-teal-400 mt-1 flex items-center gap-1">📞 {order.address.phone}</div>}
                      </div>

                      {order.mapUrl && (
                        <a href={order.mapUrl} target="_blank" rel="noreferrer" className="text-teal-400 text-sm flex items-center gap-1 hover:underline mb-3 inline-flex">
                          📍 Open in Google Maps
                        </a>
                      )}
                      
                      <div className="text-white text-sm bg-slate-800/50 p-3 rounded-lg border border-slate-800 space-y-2">
                        <div className="font-medium">
                          To Collect:{" "}
                          <span className="text-emerald-400 font-bold">
                            ₹{order.total?.toFixed(2)}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                            Order items
                          </div>
                          {(order.items || []).length === 0 ? (
                            <div className="text-xs text-slate-500">No items</div>
                          ) : (
                            (order.items || []).map((item: any, idx: number) => (
                              <div
                                key={idx}
                                className="text-sm text-slate-200 bg-slate-900/60 border border-slate-700/60 rounded-lg px-2.5 py-2"
                              >
                                <div className="font-semibold text-white">
                                  {idx + 1}. {item.productName}
                                  {item.cutName ? (
                                    <span className="text-teal-300 font-medium"> · {item.cutName}</span>
                                  ) : null}
                                </div>
                                <div className="text-xs text-slate-400 mt-0.5">
                                  Qty: {formatQuantityLabel(item.quantity, item.unit)}
                                </div>
                                {item.notes?.trim() && (
                                  <div className="text-xs text-amber-300 mt-1">
                                    Note: {item.notes}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                        {String(order.customerNotes || "").trim() && (
                          <div className="text-sm text-amber-100 bg-amber-500/15 border border-amber-500/30 rounded-lg px-2.5 py-2">
                            <div className="text-[10px] uppercase tracking-wider font-bold text-amber-300 mb-1">
                              Cutting / cleaning notes
                            </div>
                            <div className="whitespace-pre-wrap break-words">
                              {order.customerNotes}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    <div className="shrink-0 flex flex-col gap-3 w-full md:w-auto">
                      <div className="text-center w-full mb-1">
                        <span className={`text-xs font-black px-3 py-1.5 rounded uppercase tracking-wider block text-center w-full shadow-lg ${
                          ['en_route', 'picked_up'].includes(a.status) ? 'bg-blue-500 text-white shadow-blue-500/30' :
                          a.status === 'delivered' ? 'bg-emerald-500 text-white shadow-emerald-500/30' :
                          a.status === 'failed' ? 'bg-rose-500 text-white shadow-rose-500/30' :
                          'bg-amber-500 text-white shadow-amber-500/30'
                        }`}>
                          {a.status.replace('_', ' ')}
                        </span>
                      </div>
                      <button 
                        onClick={() => openStatusModal(a)}
                        className="bg-teal-500 hover:bg-teal-400 text-white font-bold py-3 px-6 rounded-lg transition-colors w-full whitespace-nowrap shadow-lg shadow-teal-500/20"
                      >
                        Update Status
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "collections" && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white mb-4">Today's Collections ({today})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 flex flex-col justify-center items-center">
              <h3 className="text-emerald-400/80 text-sm font-medium mb-2">Cash Collected</h3>
              <div className="text-5xl font-black text-emerald-400 mb-2">₹{totalCash.toFixed(2)}</div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 flex flex-col justify-center items-center">
              <h3 className="text-blue-400/80 text-sm font-medium mb-2">UPI / Online Collected</h3>
              <div className="text-5xl font-black text-blue-400 mb-2">₹{totalUPI.toFixed(2)}</div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            <h3 className="font-bold text-white">Past Deliveries</h3>
            <div className="flex gap-2">
              <input 
                type="date"
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white outline-none focus:border-teal-500 text-sm [color-scheme:dark]"
                value={pastDate}
                onChange={e => setPastDate(e.target.value)}
              />
            </div>
          </div>
          
          {pastAssignments.length === 0 ? (
             <div className="text-slate-400 text-center py-8 bg-slate-900/30 rounded-xl border border-slate-800">
               No past deliveries found for this date.
             </div>
          ) : (
            <div className="space-y-4">
              {pastAssignments.map((a) => (
                <div key={a._id} className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                  <div className="w-full">
                    <div className="flex justify-between items-center mb-3">
                      <div className="font-bold text-white text-lg">Order #{String(a.order?._id).slice(-6).toUpperCase()}</div>
                      <div className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${a.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {a.status}
                      </div>
                    </div>
                    
                    <div className="text-slate-300 text-sm">
                      <div className="font-medium text-white mb-1">{a.order?.customer?.name || 'Guest'}</div>
                      <div>{a.order?.address?.line1}, {a.order?.address?.line2}</div>
                      <div>{a.order?.address?.city}, {a.order?.address?.postalCode}</div>
                      {a.order?.address?.phone && <div className="text-teal-400 mt-1 flex items-center gap-1">📞 {a.order.address.phone}</div>}
                    </div>
                  </div>
                  
                  <div className="w-full md:w-auto shrink-0 md:text-right bg-slate-950 p-4 rounded-lg border border-slate-800">
                    <div className="text-xs text-slate-500 mb-1">Delivered At</div>
                    <div className="text-sm text-slate-300 mb-3">{new Date(a.updatedAt).toLocaleTimeString()}</div>
                    
                    {a.status === 'delivered' ? (
                       <>
                         <div className="text-xs text-slate-500 mb-1">Collected Amount</div>
                         <div className="text-white font-black text-xl mb-1">₹{a.paymentCollected?.toFixed(2)}</div>
                         <div className="text-xs uppercase font-bold text-slate-400 bg-slate-800 inline-block px-2 py-0.5 rounded">
                           {formatPaymentMethod(a.paymentMethod)}
                         </div>
                         {Number(a.order?.total || 0) > Number(a.paymentCollected || 0) && a.status === "delivered" && (
                           <div className="text-[11px] text-amber-400 mt-2">
                             Pending: ₹{(Number(a.order?.total || 0) - Number(a.paymentCollected || 0)).toFixed(2)}
                           </div>
                         )}
                       </>
                    ) : (
                       <div className="text-rose-400 text-sm">Failed / Cancelled</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Status Update Modal */}
      {selectedAssignment && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-1">Update Delivery</h3>
            <div className="text-slate-400 text-sm mb-2">
              Order #{String(selectedAssignment.order?._id).slice(-6).toUpperCase()}
            </div>
            <div className="text-teal-300 text-sm font-semibold mb-6">
              Order total: ₹{Number(selectedAssignment.order?.total || 0).toFixed(2)}
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">Status</label>
                <select 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-teal-500"
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({...statusForm, status: e.target.value})}
                >
                  <option value="delivered">Delivered Successfully</option>
                  <option value="failed">Failed / Could not deliver</option>
                  <option value="en_route">En Route (On the way)</option>
                </select>
              </div>

              {statusForm.status === "delivered" && (
                <>
                  <div>
                    <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">Payment Method</label>
                    <select 
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-teal-500"
                      value={statusForm.paymentMethod}
                      onChange={(e) => applyPaymentMethod(e.target.value)}
                    >
                      <option value="cash">Cash (Full)</option>
                      <option value="upi">UPI / Online (Full)</option>
                      <option value="partial_cash">Partial Payment (Cash)</option>
                      <option value="partial_upi">Partial Payment (UPI)</option>
                      <option value="pay_later">Pay Later (Full Amount Pending)</option>
                      <option value="none">Already Paid / None</option>
                    </select>
                  </div>

                  {(statusForm.paymentMethod === "cash" || statusForm.paymentMethod === "upi") && (
                    <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-300 text-sm">
                      Full amount collected: <span className="font-black text-white">₹{Number(selectedAssignment.order?.total || 0).toFixed(2)}</span>
                    </div>
                  )}

                  {(statusForm.paymentMethod === "partial_cash" || statusForm.paymentMethod === "partial_upi") && (
                    <div className="space-y-2">
                      <label className="block text-amber-300 text-xs mb-1 uppercase tracking-wider font-bold">
                        Amount collected now (₹)
                      </label>
                      <input 
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        placeholder="Enter collected amount"
                        className="w-full bg-slate-950 border-2 border-amber-500/50 rounded-lg p-3 text-white outline-none focus:border-amber-400 text-lg font-bold"
                        value={statusForm.paymentCollected || ""}
                        onChange={(e) => setStatusForm({
                          ...statusForm,
                          paymentCollected: e.target.value === "" ? 0 : Number(e.target.value)
                        })}
                      />
                      <p className="text-xs text-slate-400">
                        Enter only the amount you collected now. Remaining goes to pending payments.
                      </p>
                      {statusForm.paymentCollected > 0 && statusForm.paymentCollected < Number(selectedAssignment.order?.total || 0) && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-sm">
                          Pending for customer: ₹{(Number(selectedAssignment.order?.total || 0) - Number(statusForm.paymentCollected || 0)).toFixed(2)}
                        </div>
                      )}
                    </div>
                  )}

                  {statusForm.paymentMethod === "pay_later" && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-sm">
                      Nothing collected now. Full amount ₹{Number(selectedAssignment.order?.total || 0).toFixed(2)} will be added to customer pending payments.
                    </div>
                  )}

                  {statusForm.paymentMethod === "none" && (
                    <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-lg text-slate-300 text-sm">
                      Marked as already paid / no collection needed.
                    </div>
                  )}
                </>
              )}

              {statusForm.status === "failed" && (
                <div>
                  <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">Reason for Failure</label>
                  <textarea 
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-teal-500"
                    placeholder="Customer not available, wrong address, etc."
                    value={statusForm.notes}
                    onChange={(e) => setStatusForm({...statusForm, notes: e.target.value})}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-8 sticky bottom-0 bg-slate-900 pt-2">
              <button 
                onClick={() => setSelectedAssignment(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={submitStatus}
                disabled={updatingId === selectedAssignment._id || (statusForm.status === "failed" && !statusForm.notes)}
                className="flex-1 bg-teal-500 hover:bg-teal-400 text-white py-3 rounded-lg font-bold transition-colors disabled:opacity-50"
              >
                {updatingId === selectedAssignment._id ? "Saving..." : "Save Status"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
