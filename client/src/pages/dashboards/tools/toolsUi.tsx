import type { ReactNode } from "react";
import { addDaysYmd, btnGhost, inputCls, todayIst } from "./toolsHelpers";

export function Card({ title, subtitle, actions, children }: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-base font-bold text-white">{title}</h3>}
            {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success" | "warn"; children: ReactNode }) {
  const cls = {
    info: "bg-sky-500/10 border-sky-400/30 text-sky-200",
    error: "bg-red-500/10 border-red-400/30 text-red-200",
    success: "bg-emerald-500/10 border-emerald-400/30 text-emerald-200",
    warn: "bg-amber-500/10 border-amber-400/30 text-amber-200"
  }[tone];
  return <div className={`rounded-xl border px-3 py-2 text-sm ${cls}`}>{children}</div>;
}

export function DateNav({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={`${btnGhost} w-10 px-0`} onClick={() => onChange(addDaysYmd(value, -1))} aria-label="Previous day">
        ‹
      </button>
      <input type="date" value={value} onChange={(e) => e.target.value && onChange(e.target.value)} className={`${inputCls} w-auto`} />
      <button type="button" className={`${btnGhost} w-10 px-0`} onClick={() => onChange(addDaysYmd(value, 1))} aria-label="Next day">
        ›
      </button>
      <button type="button" className={btnGhost} onClick={() => onChange(todayIst())}>
        Today
      </button>
    </div>
  );
}
