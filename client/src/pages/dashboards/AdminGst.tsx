import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import {
  downloadGstSalesRegisterPdf,
  downloadGstSummaryPdf,
  getGstReport,
  getGstSettings,
  updateGstSettings
} from "../../lib/api";

const money = (n: unknown) => {
  const v = Number(n);
  return Number.isFinite(v) ? `₹${v.toFixed(2)}` : "₹0.00";
};

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Tab = "overview" | "register" | "settings";
type Period = "today" | "week" | "month" | "all" | "custom";

const saveBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export default function AdminGst() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [period, setPeriod] = useState<Period>("month");
  const [from, setFrom] = useState(localToday());
  const [to, setTo] = useState(localToday());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [report, setReport] = useState<any>(null);
  const [settingsForm, setSettingsForm] = useState<any>(null);

  const queryParams = () => ({
    period,
    from: period === "custom" ? from : undefined,
    to: period === "custom" ? to : undefined
  });

  const loadReport = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError("");
      const data = await getGstReport(token, queryParams());
      setReport(data);
      if (!settingsForm) setSettingsForm(data.settings);
    } catch (err: any) {
      setError(err.message || "Failed to load GST report");
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    if (!token) return;
    try {
      const res = await getGstSettings(token);
      setSettingsForm(res.settings);
    } catch (err: any) {
      setError(err.message || "Failed to load GST settings");
    }
  };

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, period]);

  useEffect(() => {
    if (tab === "settings" && !settingsForm) loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleSaveSettings = async () => {
    if (!token || !settingsForm) return;
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const res = await updateGstSettings(token, settingsForm);
      setSettingsForm(res.settings);
      setSuccess("GST settings saved");
      await loadReport();
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadRegister = async () => {
    if (!token) return;
    try {
      setError("");
      const blob = await downloadGstSalesRegisterPdf(token, queryParams());
      saveBlob(blob, `GST-Sales-Register.pdf`);
    } catch (err: any) {
      setError(err.message || "Download failed");
    }
  };

  const handleDownloadSummary = async () => {
    if (!token) return;
    try {
      setError("");
      const blob = await downloadGstSummaryPdf(token, queryParams());
      saveBlob(blob, `GST-Summary.pdf`);
    } catch (err: any) {
      setError(err.message || "Download failed");
    }
  };

  const summary = report?.summary;
  const rangeLabel = report ? `${report.range.from} → ${report.range.to}` : "";

  return (
    <DashboardShell
      title="GST"
      description="GSTIN settings, sales register, CGST/SGST summary and PDFs for your CA. Helper records only — does not file returns."
      navLinks={ADMIN_NAV_LINKS}
    >
      <div className="space-y-4 sm:space-y-5 min-w-0">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin">
          {(
            [
              ["overview", "Overview & PDFs"],
              ["register", "Sales register"],
              ["settings", "GST settings"]
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`snap-start shrink-0 px-3 py-2.5 rounded-lg text-sm font-bold border whitespace-nowrap ${
                tab === id
                  ? "bg-teal-500/20 text-teal-200 border-teal-500/40"
                  : "bg-slate-950 text-slate-400 border-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4 space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
            {(
              [
                ["today", "Today"],
                ["week", "Week"],
                ["month", "Month"],
                ["all", "All"],
                ["custom", "Custom"]
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPeriod(id)}
                className={`shrink-0 px-3 py-2 rounded-lg text-xs font-bold border ${
                  period === id
                    ? "bg-slate-100 text-slate-900 border-slate-100"
                    : "bg-slate-950 text-slate-400 border-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {period === "custom" ? (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:flex-wrap sm:items-end gap-3">
              <div className="min-w-0 sm:min-w-[9rem]">
                <label className="block text-[10px] uppercase text-slate-500 mb-1">From</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white"
                />
              </div>
              <div className="min-w-0 sm:min-w-[9rem]">
                <label className="block text-[10px] uppercase text-slate-500 mb-1">To</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white"
                />
              </div>
              <button
                type="button"
                onClick={loadReport}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-bold bg-teal-500 text-slate-950"
              >
                Apply
              </button>
            </div>
          ) : null}
          {rangeLabel ? <p className="text-xs text-slate-500 break-all">Range {rangeLabel}</p> : null}
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-200 text-sm px-4 py-3 break-words">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 text-teal-200 text-sm px-4 py-3">
            {success}
          </div>
        ) : null}

        {loading && !report ? (
          <div className="text-center text-slate-400 py-16 text-sm">Loading GST data…</div>
        ) : null}

        {tab === "overview" && report ? (
          <div className="space-y-4 sm:space-y-5 min-w-0">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              <Card label="Gross sales" value={money(summary?.gross)} hint="Delivery + walk-in (excl. family)" />
              <Card label="Taxable value" value={money(summary?.taxable)} hint="After inclusive GST split" />
              <Card label="CGST + SGST" value={money(summary?.tax)} hint={`${money(summary?.cgst)} + ${money(summary?.sgst)}`} />
              <Card label="Purchase record" value={money(summary?.purchaseTotal)} hint="Daily purchase totals (not vendor tax invoices)" />
            </div>

            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 sm:px-4 py-3 text-xs text-amber-100/90 leading-relaxed">
              {report.disclaimer}
              {!report.settings?.gstin ? (
                <span className="block mt-2 text-amber-200 font-semibold">
                  GSTIN not set yet — open GST settings and enter your GSTIN / HSN rates.
                </span>
              ) : null}
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleDownloadRegister}
                className="w-full sm:w-auto px-4 py-3 rounded-xl text-sm font-bold bg-teal-500 text-slate-950 hover:bg-teal-400"
              >
                Download sales register PDF
              </button>
              <button
                type="button"
                onClick={handleDownloadSummary}
                className="w-full sm:w-auto px-4 py-3 rounded-xl text-sm font-bold border border-teal-500/40 text-teal-200 hover:bg-teal-500/10"
              >
                Download rate / HSN summary PDF
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 min-w-0">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4 min-w-0">
                <h3 className="text-sm font-bold text-white mb-3">Rate-wise (GSTR helper)</h3>
                <div className="space-y-2 text-xs">
                  {(report.rateWise || []).length === 0 ? (
                    <p className="text-slate-500">No sales in this range.</p>
                  ) : (
                    report.rateWise.map((r: any) => (
                      <div key={r.rate} className="flex justify-between gap-2 text-slate-300">
                        <span className="min-w-0 truncate">{r.rate}% · taxable {money(r.taxable)}</span>
                        <span className="text-teal-300 shrink-0">Tax {money(r.tax)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4 min-w-0">
                <h3 className="text-sm font-bold text-white mb-3">HSN-wise</h3>
                <div className="space-y-2 text-xs max-h-48 overflow-y-auto">
                  {(report.hsnWise || []).length === 0 ? (
                    <p className="text-slate-500">No HSN lines yet.</p>
                  ) : (
                    report.hsnWise.map((r: any) => (
                      <div
                        key={`${r.hsn}-${r.rate}`}
                        className="flex justify-between gap-2 text-slate-300"
                      >
                        <span className="min-w-0 truncate">
                          {r.hsn} @ {r.rate}%
                        </span>
                        <span className="shrink-0">{money(r.gross)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "register" && report ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden min-w-0">
            <div className="px-3 sm:px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white">
                Sales register · {summary?.lines || 0} lines · {summary?.docs || 0} docs
              </h3>
              <button
                type="button"
                onClick={handleDownloadRegister}
                className="text-xs font-bold px-3 py-2 rounded-lg bg-teal-500/15 text-teal-300 border border-teal-500/30"
              >
                PDF
              </button>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-800/70 max-h-[70vh] overflow-y-auto">
              {(report.sales || []).length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-500 text-sm">
                  No delivered / walk-in sales in this range.
                </div>
              ) : (
                report.sales.map((row: any, idx: number) => (
                  <div key={`${row.docNo}-${idx}`} className="px-3 py-3 space-y-1.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate">{row.productName}</div>
                        <div className="text-slate-500 mt-0.5">
                          {row.date} · {row.docType} · {row.docNo}
                        </div>
                        <div className="text-slate-400 truncate">{row.customerName}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-white">{money(row.gross)}</div>
                        <div className="text-slate-500">{row.rate}% GST</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-slate-400">
                      <span>HSN {row.hsn}</span>
                      <span>Taxable {money(row.taxable)}</span>
                      <span>CGST {money(row.cgst)}</span>
                      <span>SGST {money(row.sgst)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto max-h-[70vh]">
              <table className="w-full text-left text-xs text-slate-300 min-w-[900px]">
                <thead className="sticky top-0 bg-slate-900 text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Doc</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">HSN</th>
                    <th className="px-3 py-2">Rate</th>
                    <th className="px-3 py-2">Taxable</th>
                    <th className="px-3 py-2">CGST</th>
                    <th className="px-3 py-2">SGST</th>
                    <th className="px-3 py-2">Gross</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(report.sales || []).length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-3 py-8 text-center text-slate-500">
                        No delivered / walk-in sales in this range.
                      </td>
                    </tr>
                  ) : (
                    report.sales.map((row: any, idx: number) => (
                      <tr key={`${row.docNo}-${idx}`} className="hover:bg-slate-800/30">
                        <td className="px-3 py-2 whitespace-nowrap">{row.date}</td>
                        <td className="px-3 py-2">{row.docType}</td>
                        <td className="px-3 py-2 font-mono text-[10px]">{row.docNo}</td>
                        <td className="px-3 py-2 max-w-[120px] truncate">{row.customerName}</td>
                        <td className="px-3 py-2 max-w-[140px] truncate">{row.productName}</td>
                        <td className="px-3 py-2">{row.hsn}</td>
                        <td className="px-3 py-2">{row.rate}%</td>
                        <td className="px-3 py-2">{money(row.taxable)}</td>
                        <td className="px-3 py-2">{money(row.cgst)}</td>
                        <td className="px-3 py-2">{money(row.sgst)}</td>
                        <td className="px-3 py-2 font-semibold text-white">{money(row.gross)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === "settings" && settingsForm ? (
          <div className="space-y-4 sm:space-y-5 min-w-0">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3 sm:p-5 grid gap-3 sm:grid-cols-2">
              <Field
                label="Legal name"
                value={settingsForm.legalName || ""}
                onChange={(v) => setSettingsForm({ ...settingsForm, legalName: v })}
              />
              <Field
                label="Trade name"
                value={settingsForm.tradeName || ""}
                onChange={(v) => setSettingsForm({ ...settingsForm, tradeName: v })}
              />
              <Field
                label="GSTIN"
                value={settingsForm.gstin || ""}
                onChange={(v) => setSettingsForm({ ...settingsForm, gstin: v.toUpperCase() })}
                placeholder="33XXXXXXXXXX1Z5"
              />
              <div className="min-w-0">
                <label className="block text-[10px] uppercase text-slate-500 mb-1">Registration</label>
                <select
                  value={settingsForm.registrationType || "unregistered"}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, registrationType: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white"
                >
                  <option value="unregistered">Not registered yet</option>
                  <option value="regular">Regular</option>
                  <option value="composition">Composition</option>
                </select>
              </div>
              <Field
                label="Address line 1"
                value={settingsForm.addressLine1 || ""}
                onChange={(v) => setSettingsForm({ ...settingsForm, addressLine1: v })}
              />
              <Field
                label="Address line 2"
                value={settingsForm.addressLine2 || ""}
                onChange={(v) => setSettingsForm({ ...settingsForm, addressLine2: v })}
              />
              <Field
                label="City"
                value={settingsForm.city || ""}
                onChange={(v) => setSettingsForm({ ...settingsForm, city: v })}
              />
              <Field
                label="Pincode"
                value={settingsForm.postalCode || ""}
                onChange={(v) => setSettingsForm({ ...settingsForm, postalCode: v })}
              />
              <Field
                label="Delivery fee GST %"
                value={String(settingsForm.deliveryFeeGstRatePercent ?? 0)}
                onChange={(v) =>
                  setSettingsForm({
                    ...settingsForm,
                    deliveryFeeGstRatePercent: Number(v) || 0
                  })
                }
              />
              <Field
                label="Delivery fee HSN"
                value={settingsForm.deliveryFeeHsn || ""}
                onChange={(v) => setSettingsForm({ ...settingsForm, deliveryFeeHsn: v })}
              />
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3 sm:p-5">
              <h3 className="text-sm font-bold text-white mb-1">Category HSN &amp; GST %</h3>
              <p className="text-xs text-slate-500 mb-4">
                Fresh fish/meat often uses low or nil rates — set after CA advice. Defaults are 0% for
                now.
              </p>
              <div className="space-y-3">
                {(settingsForm.categoryRates || []).map((row: any, idx: number) => (
                  <div
                    key={row.category || idx}
                    className="grid gap-2 sm:grid-cols-3 items-end border border-slate-800 rounded-xl p-3"
                  >
                    <div className="text-sm font-semibold text-teal-200">{row.category}</div>
                    <div className="min-w-0">
                      <label className="block text-[10px] uppercase text-slate-500 mb-1">HSN</label>
                      <input
                        value={row.hsnCode || ""}
                        onChange={(e) => {
                          const next = [...settingsForm.categoryRates];
                          next[idx] = { ...next[idx], hsnCode: e.target.value };
                          setSettingsForm({ ...settingsForm, categoryRates: next });
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white"
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="block text-[10px] uppercase text-slate-500 mb-1">
                        GST %
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={28}
                        step={0.1}
                        value={row.gstRatePercent ?? 0}
                        onChange={(e) => {
                          const next = [...settingsForm.categoryRates];
                          next[idx] = {
                            ...next[idx],
                            gstRatePercent: Number(e.target.value) || 0
                          };
                          setSettingsForm({ ...settingsForm, categoryRates: next });
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={handleSaveSettings}
              className="w-full sm:w-auto px-5 py-3 rounded-xl text-sm font-bold bg-teal-500 text-slate-950 hover:bg-teal-400 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save GST settings"}
            </button>
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-3 sm:p-4 min-w-0">
      <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">{label}</div>
      <div className="text-xl sm:text-2xl font-black text-teal-200 mt-1 break-all">{value}</div>
      <div className="text-[11px] text-slate-500 mt-2 leading-snug">{hint}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="min-w-0">
      <label className="block text-[10px] uppercase text-slate-500 mb-1">{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white"
      />
    </div>
  );
}
