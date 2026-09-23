import { useState, useEffect, useRef } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import {
  getPartnerAssignments,
  updateDeliveryStatus,
  reorderAssignments,
  uploadPartnerDocument,
  getMyDeliveryTripToday,
  startMyDeliveryTrip,
  pingMyDeliveryTrip,
  endMyDeliveryTrip,
  submitPartnerNda,
  downloadPartnerNdaPdf,
  type DeliveryTripPayload
} from "../../lib/api";
import { formatQuantityLabel } from "../../lib/weightOptions";
import { BookingSourceBadge } from "../../components/SourceBadges";
import {
  releaseScreenWakeLock,
  requestScreenWakeLock,
  type WakeLockState
} from "../../lib/screenWakeLock";

const NAV_LINKS = [
  { label: "Deliveries", href: "/dashboard/delivery" },
  { label: "Earnings", href: "/dashboard/delivery/earnings" }
];

const formatMoney = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

const formatUnitPriceLabel = (item: { unitPrice?: number; unit?: string }) => {
  const unit = String(item.unit || "kg").toLowerCase();
  const label = unit === "piece" ? "piece" : unit;
  return `₹${formatMoney(item.unitPrice)}/${label}`;
};

/** Soft-fail GPS for petrol km tracking (en_route / delivered). */
const capturePartnerGps = (): Promise<{ lat: number; lng: number } | undefined> =>
  new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(undefined);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });

function PartnerNdaForm({
  token,
  initialPhone,
  onSuccess
}: {
  token: string;
  initialPhone?: string;
  onSuccess: () => void;
}) {
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [dlNumber, setDlNumber] = useState("");
  const [bikeRcNumber, setBikeRcNumber] = useState("");
  const [bikeNumber, setBikeNumber] = useState("");
  const [phone, setPhone] = useState(initialPhone || "");
  const [downloaded, setDownloaded] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const draft = {
    aadhaarNumber: aadhaarNumber.trim(),
    dlNumber: dlNumber.trim(),
    bikeRcNumber: bikeRcNumber.trim(),
    bikeNumber: bikeNumber.trim().toUpperCase(),
    phone: phone.trim()
  };

  const handleDownload = async () => {
    if (!draft.aadhaarNumber || !draft.dlNumber || !draft.bikeRcNumber || !draft.bikeNumber) {
      setError("Fill Aadhaar, DL, bike RC, and bike number before downloading the NDA PDF.");
      return;
    }
    try {
      setDownloading(true);
      setError("");
      const blob = await downloadPartnerNdaPdf(token, draft);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "FishFriendly-Partner-NDA.pdf";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Mobile browsers often ignore download= — open PDF so partner can save/share/print
      window.setTimeout(() => {
        window.open(url, "_blank", "noopener,noreferrer");
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }, 250);
      setDownloaded(true);
      setInfo(
        "NDA PDF ready. On phone: open the PDF, save or share to print, sign by hand, and give the copy to admin."
      );
    } catch (err: any) {
      setError(err.message || "Failed to download NDA PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!downloaded) {
      setError("Open / download the NDA PDF first, then accept the agreement.");
      return;
    }
    if (!accepted) {
      setError("Please accept the NDA agreement to continue.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      await submitPartnerNda(token, {
        ...draft,
        accepted: true,
        downloaded: true
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to submit NDA details");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg px-3 py-3 text-base text-white outline-none focus:border-teal-500";

  return (
    <div className="w-full max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-8 mt-2 sm:mt-6 mb-8">
      <p className="text-[11px] font-bold uppercase tracking-wider text-teal-400 mb-2">
        Step 1 of 2 · Hire &amp; NDA
      </p>
      <h2 className="text-lg sm:text-xl font-bold text-white mb-2">Partner hire &amp; NDA</h2>
      <p className="text-sm text-slate-400 mb-5 leading-relaxed">
        Enter your details, open the NDA PDF, print and sign it by hand, then accept here. Next you
        upload ID proof for admin approval.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm break-words">
          {error}
        </div>
      )}
      {info && (
        <div className="mb-4 p-3 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-300 text-sm break-words">
          {info}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">
            Aadhaar number
          </label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            placeholder="XXXX XXXX XXXX"
            className={inputClass}
            value={aadhaarNumber}
            onChange={(e) => setAadhaarNumber(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">
            DL number
          </label>
          <input
            type="text"
            autoComplete="off"
            required
            placeholder="Driving licence number"
            className={inputClass}
            value={dlNumber}
            onChange={(e) => setDlNumber(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">
            Bike RC number
          </label>
          <input
            type="text"
            autoComplete="off"
            required
            placeholder="RC book number"
            className={inputClass}
            value={bikeRcNumber}
            onChange={(e) => setBikeRcNumber(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">
            Bike number
          </label>
          <input
            type="text"
            autoComplete="off"
            required
            placeholder="e.g. TN 58 AB 1234"
            className={`${inputClass} uppercase`}
            value={bikeNumber}
            onChange={(e) => setBikeNumber(e.target.value.toUpperCase())}
          />
        </div>
        <div>
          <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">
            Phone number
          </label>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="e.g. 9876543210"
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="w-full min-h-12 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors text-sm sm:text-base"
        >
          {downloading
            ? "Preparing PDF..."
            : downloaded
              ? "Open NDA PDF again"
              : "Open / download NDA PDF"}
        </button>

        <label className="flex items-start gap-3 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 accent-teal-500"
            checked={downloaded}
            onChange={(e) => setDownloaded(e.target.checked)}
          />
          <span className="leading-snug">
            I opened or saved the NDA PDF on this phone (ready to print and sign).
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 accent-teal-500"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <span className="leading-snug">
            I will print and sign the NDA by hand and give it to the admin. I accept the
            confidentiality and hire terms.
          </span>
        </label>

        <button
          type="submit"
          disabled={loading || !downloaded || !accepted}
          className="w-full min-h-12 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors text-sm sm:text-base"
        >
          {loading ? "Saving..." : "Accept & continue"}
        </button>
      </form>
    </div>
  );
}

function DocumentUploadForm({ token, onSuccess }: { token: string; onSuccess: () => void }) {
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

  const inputClass =
    "w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg px-3 py-3 text-base text-white outline-none focus:border-teal-500";

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-8 mt-2 sm:mt-6 mb-8">
      <p className="text-[11px] font-bold uppercase tracking-wider text-teal-400 mb-2">
        Step 2 of 2 · ID proof
      </p>
      <h2 className="text-lg sm:text-xl font-bold text-white mb-4">Required Document</h2>
      <p className="text-sm text-slate-400 mb-5 leading-relaxed">
        Upload <span className="text-teal-300 font-medium">any one</span> PDF proof: Aadhaar,
        Driving License, RC Book, or Voter ID. File must be under{" "}
        <span className="text-amber-300 font-medium">200 KB</span>.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm break-words">
          {error}
        </div>
      )}

      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">
            Phone Number
          </label>
          <input
            type="tel"
            inputMode="tel"
            required
            placeholder="e.g. 9876543210"
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">
            Document Type
          </label>
          <select
            required
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className={inputClass}
          >
            <option value="aadhaar">Aadhaar</option>
            <option value="dl">Driving License (DL)</option>
            <option value="rc">RC Book</option>
            <option value="voter_id">Voter ID</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">
            PDF Document (max 200 KB)
          </label>
          <input
            type="file"
            accept="application/pdf,.pdf"
            required
            className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white outline-none focus:border-teal-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-teal-500/20 file:text-teal-400"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file && (
            <p
              className={`text-xs mt-2 break-all ${file.size > 200 * 1024 ? "text-rose-400" : "text-slate-500"}`}
            >
              Selected: {file.name} ({Math.round(file.size / 1024)} KB)
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !file || !phone}
          className="w-full min-h-12 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors mt-2"
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
  const { token, user, refreshUser } = useAuth();
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

  const [trip, setTrip] = useState<DeliveryTripPayload | null>(null);
  const [tripBusy, setTripBusy] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(true);
  const [gpsOffWarning, setGpsOffWarning] = useState(false);
  const [wakeLockState, setWakeLockState] = useState<WakeLockState>("off");
  const pingLock = useRef(false);
  const wakeLockRef = useRef<{
    released: boolean;
    release: () => Promise<void>;
    addEventListener: (type: "release", listener: () => void) => void;
    removeEventListener: (type: "release", listener: () => void) => void;
  } | null>(null);

  const refreshTrip = async () => {
    if (!token) return;
    try {
      const res = await getMyDeliveryTripToday(token);
      setTrip(res.trip);
      setTrackingOpen(Boolean(res.window?.trackingOpen));
    } catch {
      /* keep last */
    }
  };

  useEffect(() => {
    if (!token) return;
    if (user?.status === "pending") {
      setLoading(false);
      return;
    }
    fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.status]);

  useEffect(() => {
    if (token && user?.status === "active") refreshTrip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.status]);

  // Auto GPS every 15s while trip is active (tighter trail for curves / bends)
  useEffect(() => {
    if (!token || trip?.status !== "active") {
      if (trip?.status !== "active") setGpsOffWarning(false);
      return;
    }

    const sendPing = async () => {
      if (pingLock.current) return;
      pingLock.current = true;
      try {
        const location = await capturePartnerGps();
        if (!location) {
          setGpsOffWarning(true);
          return;
        }
        setGpsOffWarning(false);
        const res = await pingMyDeliveryTrip(token, location);
        setTrip(res.trip);
      } catch {
        /* ignore transient ping errors */
      } finally {
        pingLock.current = false;
      }
    };

    sendPing();
    const id = window.setInterval(sendPing, 15000);
    return () => window.clearInterval(id);
  }, [token, trip?.status]);

  // Keep phone screen on while trip is active so GPS pings don't stop when screen sleeps
  useEffect(() => {
    const tripActive = trip?.status === "active";
    if (!tripActive) {
      void releaseScreenWakeLock(wakeLockRef.current);
      wakeLockRef.current = null;
      setWakeLockState("off");
      return;
    }

    let cancelled = false;

    const acquire = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      await releaseScreenWakeLock(wakeLockRef.current);
      wakeLockRef.current = null;
      const { sentinel, state } = await requestScreenWakeLock();
      if (cancelled) {
        await releaseScreenWakeLock(sentinel);
        return;
      }
      wakeLockRef.current = sentinel;
      setWakeLockState(state);
      if (sentinel) {
        const onRelease = () => {
          if (wakeLockRef.current === sentinel) {
            wakeLockRef.current = null;
            setWakeLockState((prev) => (prev === "active" ? "off" : prev));
          }
        };
        sentinel.addEventListener("release", onRelease);
      }
    };

    void acquire();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void acquire();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void releaseScreenWakeLock(wakeLockRef.current);
      wakeLockRef.current = null;
    };
  }, [trip?.status]);

  const handleStartTrip = async () => {
    if (!token) return;
    try {
      setTripBusy(true);
      setError("");
      const location = await capturePartnerGps();
      if (!location) {
        setError("Turn on location / GPS to start from hub.");
        return;
      }
      const res = await startMyDeliveryTrip(token, location);
      setTrip(res.trip);
      setSuccess(res.message || "Trip started from hub.");
    } catch (err: any) {
      setError(err.message || "Could not start trip");
      refreshTrip();
    } finally {
      setTripBusy(false);
    }
  };

  const handleEndTrip = async () => {
    if (!token) return;
    try {
      setTripBusy(true);
      setError("");
      const location = await capturePartnerGps();
      if (!location) {
        setGpsOffWarning(true);
      } else {
        setGpsOffWarning(false);
      }
      const res = await endMyDeliveryTrip(token, location);
      setTrip(res.trip);
      setSuccess(res.message || "Trip ended. Petrol km saved.");
    } catch (err: any) {
      setError(err.message || "Could not end trip");
      refreshTrip();
    } finally {
      setTripBusy(false);
    }
  };

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
    const tripActive = trip?.status === "active";
    const onTheWay = ["en_route", "picked_up"].includes(String(assignment.status || ""));
    let nextStatus = "en_route";
    if (onTheWay) nextStatus = "delivered";
    else if (!tripActive) nextStatus = "en_route";
    setStatusForm({
      status: nextStatus,
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

    const tripActive = trip?.status === "active";
    const onTheWay = ["en_route", "picked_up"].includes(
      String(selectedAssignment.status || "")
    );

    if (statusForm.status === "en_route" && !tripActive) {
      setError("Tap Start from hub first, then mark On the way.");
      return;
    }

    if (
      (statusForm.status === "delivered" || statusForm.status === "failed") &&
      !onTheWay
    ) {
      setError("Mark On the way first, then you can set Delivered or Failed.");
      return;
    }

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
        const location = await capturePartnerGps();
        if (location) {
          payload.location = location;
          setGpsOffWarning(false);
        } else if (trip?.status === "active") {
          setGpsOffWarning(true);
        }
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
  const [localHasNda, setLocalHasNda] = useState<boolean>(
    Boolean(user?.hasNdaAccepted || user?.ndaAcceptedAt)
  );

  useEffect(() => {
    setLocalHasNda(Boolean(user?.hasNdaAccepted || user?.ndaAcceptedAt));
    setLocalHasDocument(
      Boolean(
        (user as any)?.hasDocument ||
          (user as any)?.documentUrl ||
          (user as any)?.documentUploadedAt
      )
    );
  }, [user]);

  if (user?.status === "pending") {
    if (!localHasNda) {
      return (
        <DashboardShell
          title="Delivery Partner Dashboard"
          description={`Welcome, ${user?.name}. Complete your hire form below.`}
          navLinks={NAV_LINKS}
        >
          <PartnerNdaForm
            token={token!}
            initialPhone={user?.phone}
            onSuccess={async () => {
              setLocalHasNda(true);
              try {
                await refreshUser();
              } catch {
                /* keep local gate */
              }
            }}
          />
        </DashboardShell>
      );
    }

    if (!localHasDocument) {
      return (
        <DashboardShell
          title="Delivery Partner Dashboard"
          description={`Welcome, ${user?.name}. Upload your ID proof next.`}
          navLinks={NAV_LINKS}
        >
          <DocumentUploadForm
            token={token!}
            onSuccess={async () => {
              setLocalHasDocument(true);
              try {
                await refreshUser();
              } catch {
                /* keep local gate */
              }
            }}
          />
        </DashboardShell>
      );
    }

    return (
      <DashboardShell
        title="Delivery Partner Dashboard"
        description={`Welcome, ${user?.name}.`}
        navLinks={NAV_LINKS}
      >
        <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center px-2">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-amber-500/10 text-amber-500 text-2xl sm:text-3xl rounded-full flex items-center justify-center mb-6 border border-amber-500/20">
            ⏳
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Waiting for Admin Approval</h2>
          <p className="text-slate-400 max-w-md mx-auto text-sm sm:text-base leading-relaxed">
            Your NDA details and verification document have been submitted. Give the signed NDA
            printout to admin. You will access deliveries once an admin approves your account.
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
      {gpsOffWarning && trip?.status === "active" ? (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-100">
          <div className="font-bold text-amber-200">GPS is off now</div>
          <p className="text-sm mt-1 text-amber-100/90">
            Your petrol allowance is not calculated correctly. Please turn on location / GPS.
            You can continue deliveries — turn GPS on whenever you can.
          </p>
        </div>
      ) : null}

      {/* Hub trip petrol tracking — one trip/day, auto-end after 1 PM IST */}
      <div className="mb-6 rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-slate-900/80 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-white">Petrol trip (hub → deliveries → hub)</h3>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">
              You must tap <span className="text-teal-300 font-semibold">Start from hub</span>, then
              mark <span className="text-teal-300 font-semibold">On the way</span> first. Only after
              that can you set <span className="text-teal-300 font-semibold">Delivered</span> or{" "}
              <span className="text-teal-300 font-semibold">Failed</span>.
              Keep this page open — the screen stays on during the trip so GPS can save every 15s.
              Waiting at chicken/mutton shop is OK (same place barely adds km). End when you return
              to hub. Auto-ends after 1:00 PM if you forget.
            </p>
            {trip?.status === "active" ? (
              <p
                className={`text-sm mt-2 font-semibold ${
                  wakeLockState === "active"
                    ? "text-emerald-300"
                    : wakeLockState === "unsupported" || wakeLockState === "denied"
                      ? "text-amber-300"
                      : "text-teal-300"
                }`}
              >
                {wakeLockState === "active"
                  ? "Screen stay-on: ON — phone should not sleep while this page is open."
                  : wakeLockState === "unsupported" || wakeLockState === "denied"
                    ? "Screen stay-on not available on this phone. Keep Fish Friendly open and set Display → sleep to Never while delivering."
                    : "Screen stay-on: reconnecting… keep this tab open in front."}
              </p>
            ) : null}
            {gpsOffWarning && trip?.status === "active" ? (
              <p className="text-sm text-amber-300 mt-2 font-semibold">
                GPS off — petrol km may be wrong until you turn it on.
              </p>
            ) : null}
            {trip ? (
              <p className="text-sm text-teal-300 mt-2 font-medium">
                Status: {trip.status.replace("_", " ")} · {Number(trip.totalKm || 0).toFixed(2)} km ·{" "}
                {trip.pointCount} GPS points
              </p>
            ) : (
              <p className="text-sm text-amber-300 mt-2 font-medium">
                No trip started — Start from hub, then On the way, then Delivered / Failed.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {!trip && (
              <button
                type="button"
                onClick={handleStartTrip}
                disabled={tripBusy || !trackingOpen}
                className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-40 text-white font-bold text-sm"
              >
                {tripBusy ? "…" : "Start from hub"}
              </button>
            )}
            {trip?.status === "active" && (
              <button
                type="button"
                onClick={handleEndTrip}
                disabled={tripBusy}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-sm"
              >
                {tripBusy ? "…" : "End at hub (return)"}
              </button>
            )}
            {trip && trip.status !== "active" && (
              <span className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-bold">
                Trip closed for today
              </span>
            )}
          </div>
        </div>
        {!trackingOpen && !trip && (
          <p className="text-xs text-amber-300/90 mt-3">
            Tracking window is 5:00 AM – 1:00 PM IST.
          </p>
        )}
      </div>

      <div className="flex gap-2 sm:gap-4 mb-8 overflow-x-auto overscroll-contain pb-1 -mx-1 px-1">
        <button
          type="button"
          onClick={() => setActiveTab("queue")}
          className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
            activeTab === "queue"
              ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
              : "bg-slate-900 text-slate-400 border border-slate-800"
          }`}
        >
          Active Queue
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("collections")}
          className={`shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
            activeTab === "collections"
              ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
              : "bg-slate-900 text-slate-400 border border-slate-800"
          }`}
        >
          My Collections
        </button>
      </div>

      {activeTab === "queue" && (
        <div className="space-y-6">
          <div className="flex space-x-2 bg-slate-900/50 p-1.5 rounded-xl border border-slate-800 w-full sm:w-fit overflow-x-auto">
            <button
              onClick={() => setQueueFilter("today")}
              className={`shrink-0 px-3 sm:px-4 py-2 rounded-lg text-sm font-bold transition-all ${queueFilter === "today" ? "bg-teal-500 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
            >
              Today ({todayStr})
            </button>
            <button
              onClick={() => setQueueFilter("tomorrow")}
              className={`shrink-0 px-3 sm:px-4 py-2 rounded-lg text-sm font-bold transition-all ${queueFilter === "tomorrow" ? "bg-teal-500 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
            >
              Tomorrow ({tomorrowStr})
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Deliveries for {queueFilter === "today" ? "Today" : "Tomorrow"} ({activeAssignments.length})
            </h2>
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
                        <BookingSourceBadge source={order.bookingSource} />
                        <span className="text-slate-400 text-sm">{order.deliveryDate} • {order.deliveryTime}</span>
                      </div>

                      <div className="text-lg font-bold text-teal-300 mb-2">
                        {order.customer?.name || "Customer"}
                      </div>
                      
                      <div className="text-slate-300 text-sm mb-3">
                        <div className="font-medium text-white mb-1">{order.address?.line1}, {order.address?.line2}</div>
                        <div>{order.address?.city}, {order.address?.postalCode}</div>
                      {(order.address?.phone || order.customer?.phone) && (
                        <div className="text-teal-400 mt-1 flex items-center gap-1">
                          📞 {order.address?.phone || order.customer?.phone}
                        </div>
                      )}
                      {(order.address?.alternatePhone || order.customer?.alternatePhone) && (
                        <div className="text-amber-300 mt-1 flex items-center gap-1">
                          📞 Alt: {order.address?.alternatePhone || order.customer?.alternatePhone}
                        </div>
                      )}
                      </div>

                      {(order.mapUrl || order.customer?.mapUrl) && (
                        <a href={order.mapUrl || order.customer?.mapUrl} target="_blank" rel="noreferrer" className="text-teal-400 text-sm flex items-center gap-1 hover:underline mb-3 inline-flex">
                          📍 Open in Google Maps
                        </a>
                      )}
                      
                      <div className="text-white text-sm bg-slate-800/50 p-3 rounded-lg border border-slate-800 space-y-2">
                        <div className="space-y-1">
                          <div className="font-medium">
                            To Collect:{" "}
                            <span className="text-emerald-400 font-bold">
                              ₹{formatMoney(order.total)}
                            </span>
                          </div>
                          {(Number(order.subtotal) > 0 || Number(order.deliveryFee) > 0) && (
                            <div className="text-xs text-slate-400 space-y-0.5">
                              {Number(order.subtotal) > 0 && (
                                <div>Items subtotal: ₹{formatMoney(order.subtotal)}</div>
                              )}
                              {Number(order.deliveryFee) > 0 && (
                                <div>Delivery fee: ₹{formatMoney(order.deliveryFee)}</div>
                              )}
                              {Number(order.addonAmount) > 0 && (
                                <div className="text-amber-300">
                                  Addon: +₹{formatMoney(order.addonAmount)}
                                  {order.addonNote ? ` (${order.addonNote})` : ""}
                                </div>
                              )}
                              {Number(order.discountAmount) > 0 && (
                                <div className="text-emerald-300">
                                  Discount: −₹{formatMoney(order.discountAmount)}
                                  {order.discountNote ? ` (${order.discountNote})` : ""}
                                </div>
                              )}
                            </div>
                          )}
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
                                <div className="flex items-start justify-between gap-2">
                                  <div className="font-semibold text-white min-w-0">
                                    {idx + 1}. {item.productName}
                                    {item.cutName ? (
                                      <span className="text-teal-300 font-medium"> · {item.cutName}</span>
                                    ) : null}
                                  </div>
                                  <span className="text-teal-300 font-bold text-sm shrink-0">
                                    ₹{formatMoney(item.totalPrice)}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-400 mt-0.5">
                                  Qty: {formatQuantityLabel(item.quantity, item.unit)}
                                  {" · "}
                                  {formatUnitPriceLabel(item)}
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
                      {trip?.status !== "active" &&
                      a.order?.deliveryDate === todayStr &&
                      !["delivered", "failed", "cancelled", "en_route", "picked_up"].includes(
                        a.status
                      ) ? (
                        <p className="text-[10px] text-amber-300/90 text-center leading-snug">
                          Flow: Start hub → On the way → Delivered/Failed
                        </p>
                      ) : null}
                      {trip?.status === "active" &&
                      a.order?.deliveryDate === todayStr &&
                      !["delivered", "failed", "cancelled", "en_route", "picked_up"].includes(
                        a.status
                      ) ? (
                        <p className="text-[10px] text-teal-300/90 text-center leading-snug">
                          Next: mark On the way
                        </p>
                      ) : null}
                      {["en_route", "picked_up"].includes(a.status) ? (
                        <p className="text-[10px] text-blue-300/90 text-center leading-snug">
                          Next: Delivered or Failed
                        </p>
                      ) : null}
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
                    <div className="flex justify-between items-center mb-3 gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-bold text-white text-lg">Order #{String(a.order?._id).slice(-6).toUpperCase()}</div>
                        <BookingSourceBadge source={a.order?.bookingSource} />
                      </div>
                      <div className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${a.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {a.status}
                      </div>
                    </div>
                    
                    <div className="text-slate-300 text-sm">
                      <div className="font-medium text-white mb-1">{a.order?.customer?.name || 'Guest'}</div>
                      <div>{a.order?.address?.line1}, {a.order?.address?.line2}</div>
                      <div>{a.order?.address?.city}, {a.order?.address?.postalCode}</div>
                      {(a.order?.address?.phone || a.order?.customer?.phone) && (
                        <div className="text-teal-400 mt-1 flex items-center gap-1">
                          📞 {a.order?.address?.phone || a.order?.customer?.phone}
                        </div>
                      )}
                      {(a.order?.address?.alternatePhone || a.order?.customer?.alternatePhone) && (
                        <div className="text-amber-300 mt-1 flex items-center gap-1">
                          📞 Alt: {a.order?.address?.alternatePhone || a.order?.customer?.alternatePhone}
                        </div>
                      )}
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
            <div className="text-slate-400 text-sm mb-1 flex items-center gap-2 flex-wrap">
              <span>Order #{String(selectedAssignment.order?._id).slice(-6).toUpperCase()}</span>
              <BookingSourceBadge source={selectedAssignment.order?.bookingSource} />
            </div>
            <div className="text-teal-300 font-bold text-base mb-2">
              {selectedAssignment.order?.customer?.name || "Customer"}
            </div>
            <div className="text-teal-300 text-sm font-semibold mb-6">
              Order total: ₹{Number(selectedAssignment.order?.total || 0).toFixed(2)}
            </div>
            
            <div className="space-y-4">
              {(() => {
                const tripActive = trip?.status === "active";
                const onTheWay = ["en_route", "picked_up"].includes(
                  String(selectedAssignment.status || "")
                );
                return (
                  <>
                    {!tripActive && !onTheWay ? (
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
                        <span className="font-bold">Start from hub</span> first, then mark{" "}
                        <span className="font-bold">On the way</span>.
                      </div>
                    ) : null}
                    {tripActive && !onTheWay ? (
                      <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-100 text-sm">
                        Step 1: mark <span className="font-bold">On the way</span>. Delivered / Failed
                        unlock after that.
                      </div>
                    ) : null}
                    {onTheWay ? (
                      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-100 text-sm">
                        On the way is set. Now choose <span className="font-bold">Delivered</span> or{" "}
                        <span className="font-bold">Failed</span>.
                      </div>
                    ) : null}
                    <div>
                      <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">
                        Status
                      </label>
                      <select
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-teal-500"
                        value={statusForm.status}
                        onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                      >
                        <option value="en_route" disabled={!tripActive || onTheWay}>
                          En Route (On the way)
                          {!tripActive ? " — start hub first" : onTheWay ? " — already on the way" : ""}
                        </option>
                        <option value="delivered" disabled={!onTheWay}>
                          Delivered Successfully
                          {!onTheWay ? " — mark on the way first" : ""}
                        </option>
                        <option value="failed" disabled={!onTheWay}>
                          Failed / Could not deliver
                          {!onTheWay ? " — mark on the way first" : ""}
                        </option>
                      </select>
                    </div>
                  </>
                );
              })()}

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
