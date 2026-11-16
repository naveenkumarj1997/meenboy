import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardShell from "./DashboardShell";
import PartnerLiveMap from "../../components/PartnerLiveMap";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";
import { useAuth } from "../../context/AuthContext";
import { adminGetPartnerLiveMap, type PartnerLiveMapRow } from "../../lib/api";

const istToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

const timeOf = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "—";

const ageLabel = (iso?: string | null) => {
  if (!iso) return "No GPS yet";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "Just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return hrs === 1 ? "1 hr ago" : `${hrs} hr ago`;
};

const isFresh = (row: PartnerLiveMapRow) => {
  if (!row.capturedAt || row.lat == null) return false;
  return Date.now() - new Date(row.capturedAt).getTime() <= 5 * 60 * 1000;
};

const statusChip = (row: PartnerLiveMapRow) => {
  const fresh = isFresh(row);
  if (row.tripStatus === "active" && fresh) {
    return { label: "Live", className: "bg-teal-500/20 text-teal-300" };
  }
  if (row.lat != null) {
    return { label: "Last seen", className: "bg-amber-500/15 text-amber-300" };
  }
  return { label: "No GPS", className: "bg-slate-800 text-slate-400" };
};

const PartnerCard = ({
  row,
  active,
  compact,
  onSelect
}: {
  row: PartnerLiveMapRow;
  active: boolean;
  compact?: boolean;
  onSelect: (id: string) => void;
}) => {
  const chip = statusChip(row);
  return (
    <button
      type="button"
      onClick={() => onSelect(row.id)}
      className={`rounded-xl border p-3 text-left transition ${
        compact ? "min-w-[16.5rem] snap-start" : "w-full"
      } ${
        active
          ? "border-teal-400/50 bg-teal-500/10"
          : "border-slate-800 bg-slate-950/40 hover:border-slate-600"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-white">{row.name}</div>
          <div className="truncate text-[11px] text-slate-500">{row.phone || "—"}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${chip.className}`}>
          {chip.label}
        </span>
      </div>
      <div className="mt-1.5 line-clamp-2 text-[11px] text-slate-300">
        {row.street || row.label || "Waiting for Start from hub"}
      </div>
      {row.area ? <div className="truncate text-[10px] text-slate-500">{row.area}</div> : null}
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-slate-500">
        <span className="truncate">
          {row.delivered}/{row.total || 0} delivered
          {row.remaining ? ` · ${row.remaining} left` : ""}
        </span>
        <span className="shrink-0">{ageLabel(row.capturedAt)}</span>
      </div>
    </button>
  );
};

const AdminPartnerLocations = () => {
  const { token } = useAuth();
  const [date, setDate] = useState(istToday);
  const [rows, setRows] = useState<PartnerLiveMapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  const load = useCallback(
    async (quiet = false) => {
      if (!token) return;
      if (!quiet) setLoading(true);
      try {
        const res = await adminGetPartnerLiveMap(token, date);
        setRows(res.partners || []);
        setRefreshedAt(res.refreshedAt || new Date().toISOString());
        setError("");
      } catch (err: any) {
        setError(err.message || "Could not load partner locations.");
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [token, date]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void load(true);
    }, 15000);
    return () => window.clearInterval(id);
  }, [load]);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) || null,
    [rows, selectedId]
  );

  const liveCount = rows.filter((r) => r.tripStatus === "active" && isFresh(r)).length;
  const gpsCount = rows.filter((r) => r.lat != null && r.lng != null).length;

  return (
    <DashboardShell
      title="Delivery Partner Location"
      description="See where partners are now. Pins update from GPS after they Start from hub."
      navLinks={ADMIN_NAV_LINKS}
    >
      <div className="space-y-3 sm:space-y-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end">
          <div className="min-w-0">
            <label className="mb-1 block text-xs text-slate-400">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value || istToday());
                setSelectedId(null);
              }}
              className="w-full min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-base text-white sm:py-2 sm:text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-5 min-h-[44px] rounded-lg border border-teal-500/30 bg-teal-500/10 px-3 py-2.5 text-sm font-semibold text-teal-200 hover:bg-teal-500/20 sm:mt-0 sm:min-h-0 sm:py-2"
          >
            Refresh
          </button>
          <div className="col-span-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400 sm:ml-auto sm:text-xs">
            <span>{liveCount} live</span>
            <span>{gpsCount} with GPS</span>
            <span>{rows.length} partners</span>
            {refreshedAt ? <span>updated {timeOf(refreshedAt)}</span> : null}
            <span className="hidden sm:inline">auto every 15s</span>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-4">
          <div className="min-w-0">
            {loading && !rows.length ? (
              <div className="partner-live-map flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50 text-slate-400">
                Loading map…
              </div>
            ) : (
              <PartnerLiveMap
                partners={rows}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
            <p className="mt-2 hidden text-[11px] text-slate-500 sm:block">
              Teal pin = live GPS. Amber = last seen. Partners appear after Start from hub with
              location on.
            </p>
          </div>

          <div className="lg:hidden -mx-4 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:thin]">
            {rows.length === 0 && !loading ? (
              <p className="p-3 text-sm text-slate-400">No delivery partners found.</p>
            ) : (
              <div className="flex w-max gap-2 snap-x snap-mandatory">
                {rows.map((row) => (
                  <PartnerCard
                    key={row.id}
                    row={row}
                    compact
                    active={row.id === selectedId}
                    onSelect={setSelectedId}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="hidden max-h-[min(68vh,620px)] space-y-2 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/40 p-2 lg:block">
            {rows.length === 0 && !loading ? (
              <p className="p-3 text-sm text-slate-400">No delivery partners found.</p>
            ) : null}
            {rows.map((row) => (
              <PartnerCard
                key={row.id}
                row={row}
                active={row.id === selectedId}
                onSelect={setSelectedId}
              />
            ))}
          </div>
        </div>

        {selected && selected.lat != null && selected.lng != null ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 sm:p-4 lg:static sticky bottom-2 z-20 shadow-lg shadow-black/40">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-white">{selected.name}</div>
                <div className="text-xs text-slate-400 line-clamp-2">
                  {selected.street || selected.label}
                  {selected.area ? ` · ${selected.area}` : ""}
                </div>
                <div className="mt-1 font-mono text-[11px] text-slate-500">
                  {ageLabel(selected.capturedAt)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                {selected.phone ? (
                  <a
                    href={`tel:${selected.phone}`}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-600 px-4 py-2 text-sm font-bold text-slate-100"
                  >
                    Call
                  </a>
                ) : null}
                <a
                  href={`https://www.google.com/maps?q=${selected.lat},${selected.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex min-h-[44px] items-center justify-center rounded-lg bg-teal-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-teal-400 ${
                    selected.phone ? "" : "col-span-2"
                  }`}
                >
                  Google Maps
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
};

export default AdminPartnerLocations;
