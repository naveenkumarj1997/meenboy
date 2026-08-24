import { useEffect, useMemo, useState } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { getAdminInvoices, downloadInvoice } from "../../lib/api";
import { triggerPdfDownload } from "../../lib/downloadPdf";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";

const toWhatsAppNumber = (phone?: string) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return digits;
  return digits;
};

export default function AdminInvoices() {
  const { token } = useAuth();
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!token) return;
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, deliveryDate]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      setSelectedOrderId("");
      const res = await getAdminInvoices(token!, deliveryDate);
      setInvoices(res.invoices || []);
    } catch (err: any) {
      setError(err.message || "Failed to load invoices for this date.");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const selected = useMemo(
    () => invoices.find((inv) => String(inv.orderId) === selectedOrderId) || null,
    [invoices, selectedOrderId]
  );

  const handleDownload = async () => {
    if (!selected) {
      setError("Please choose a customer first.");
      return;
    }
    try {
      setDownloading(true);
      setError("");
      const blob = await downloadInvoice(token!, selected.orderId);
      const shortId = String(selected.orderId).slice(-8).toUpperCase();
      triggerPdfDownload(blob, `Invoice-${selected.customerName}-${shortId}.pdf`);
      setSuccess(`Invoice downloaded for ${selected.customerName}. You can send it on WhatsApp.`);
    } catch (err: any) {
      setError(err.message || "Failed to download invoice.");
    } finally {
      setDownloading(false);
    }
  };

  const whatsappUrl = selected
    ? `https://wa.me/${toWhatsAppNumber(selected.customerPhone)}?text=${encodeURIComponent(
        `Hi ${selected.customerName}, here is your Fish Friendly invoice for ${deliveryDate}. Order #${String(selected.orderId).slice(-8).toUpperCase()}.`
      )}`
    : "";

  return (
    <DashboardShell
      title="Customer Invoices"
      description="Choose a delivery date and customer, then download the invoice to send on WhatsApp."
      navLinks={ADMIN_NAV_LINKS}
    >
      <div className="mb-6 rounded-xl border border-teal-500/20 bg-teal-500/10 p-4">
        <p className="text-teal-200 text-sm">
          Download the PDF, then open WhatsApp and attach that file to the customer chat.
        </p>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Delivery date</label>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-teal-500 [color-scheme:dark]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Customer</label>
          {loading ? (
            <p className="text-slate-400 text-sm">Loading customers...</p>
          ) : invoices.length === 0 ? (
            <p className="text-slate-400 text-sm">No orders for this date.</p>
          ) : (
            <select
              value={selectedOrderId}
              onChange={(e) => {
                setSelectedOrderId(e.target.value);
                setSuccess("");
                setError("");
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white outline-none focus:border-teal-500"
            >
              <option value="">Select customer</option>
              {invoices.map((inv) => (
                <option key={inv.orderId} value={inv.orderId}>
                  {inv.customerName} · #{String(inv.orderId).slice(-6).toUpperCase()} · ₹{Number(inv.total || 0).toFixed(2)}
                  {inv.deliveryTime ? ` · ${inv.deliveryTime}` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {selected && (
          <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-300 space-y-1">
            <p><span className="text-slate-500">Customer:</span> <span className="text-white font-semibold">{selected.customerName}</span></p>
            <p><span className="text-slate-500">Phone:</span> {selected.customerPhone || "Not saved"}</p>
            <p><span className="text-slate-500">Total:</span> ₹{Number(selected.total || 0).toFixed(2)}</p>
            <p><span className="text-slate-500">Status:</span> {String(selected.status || "").replace(/_/g, " ")}</p>
          </div>
        )}

        {error && <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">{error}</div>}
        {success && <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">{success}</div>}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!selected || downloading}
            className="flex-1 bg-teal-500 hover:bg-teal-400 text-white font-semibold py-2.5 px-4 rounded-lg disabled:opacity-50"
          >
            {downloading ? "Downloading..." : "Download invoice"}
          </button>
          {selected && toWhatsAppNumber(selected.customerPhone) ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-center bg-[#25D366] hover:bg-[#1ebe57] text-white font-semibold py-2.5 px-4 rounded-lg"
            >
              Open WhatsApp chat
            </a>
          ) : (
            <button type="button" disabled className="flex-1 bg-slate-800 text-slate-500 font-semibold py-2.5 px-4 rounded-lg cursor-not-allowed">
              WhatsApp number missing
            </button>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
