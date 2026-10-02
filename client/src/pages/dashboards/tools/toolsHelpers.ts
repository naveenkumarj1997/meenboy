import type { ToolProduct, ToolsSettings } from "../../../lib/api";

export type ToolProps = {
  token: string;
  settings: ToolsSettings;
  products: ToolProduct[];
  onSettingsSaved: (settings: ToolsSettings) => void;
  openSettings: () => void;
};

export const todayIst = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

export const addDaysYmd = (ymd: string, days: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const prettyDate = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}/.test(s || "")) return s || "-";
  const [y, m, d] = s.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

export const money = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const qtyText = (n: number, unit: string) => {
  const shown = Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);
  return `${shown} ${unit === "piece" ? "pcs" : unit || ""}`.trim();
};

/** Short name for bilingual product names like "Seer Fish | வஞ்சரம்". */
export const shortName = (name: string) => String(name || "").split("|")[0].trim();

/** Indian mobile number in the 91XXXXXXXXXX form wa.me expects, or "" if not usable. */
export const waNumber = (phone: string) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 10) return "";
  return `91${digits.slice(-10)}`;
};

export const waLink = (phone: string, text: string) =>
  `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;

export const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
};

export const inputCls =
  "h-10 w-full bg-white/5 border border-white/10 rounded-xl px-3 text-white placeholder:text-slate-500 focus:border-teal-500 focus:outline-none";
export const selectCls = `${inputCls} [&>option]:bg-slate-900`;
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-teal-500 text-slate-950 text-sm font-bold hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-white/10 bg-white/5 text-slate-200 text-sm font-bold hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed";
export const btnSmall =
  "inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg border border-white/10 bg-white/5 text-slate-200 text-xs font-bold hover:bg-white/10 disabled:opacity-50";
