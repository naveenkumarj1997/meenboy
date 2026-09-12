import { useState, useEffect } from "react";
import DashboardShell from "./DashboardShell";
import { useAuth } from "../../context/AuthContext";
import { ADMIN_NAV_LINKS } from "../../lib/adminNavLinks";

type PetrolStop = {
  assignmentId: string;
  sequence: number;
  customerName: string;
  hasGps: boolean;
  hasEnRouteGps: boolean;
  hasDeliveredGps: boolean;
};

type PetrolStat = {
  partnerId: string;
  name: string;
  phone?: string;
  deliveredCount: number;
  totalKm: number;
  stopKm?: number;
  tripKm?: number;
  tripStatus?: string | null;
  tripPointCount?: number;
  kmSource?: string;
  amount: number;
  partnerConfirmed?: boolean;
  missingGpsCount?: number;
  stops: PetrolStop[];
};

export default function AdminPetrolAllowance() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [stats, setStats] = useState<PetrolStat[]>([]);
  const [amountInputs, setAmountInputs] = useState<Record<string, number>>({});

  useEffect(() => {
    if (token && selectedDate) {
      fetchData(selectedDate);
    }
  }, [token, selectedDate]);

  const fetchData = async (date: string) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/users/partner-petrol/${date}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch data");
      }

      const rows: PetrolStat[] = data.stats || [];
      setStats(rows);

      const initialInputs: Record<string, number> = {};
      rows.forEach((s) => {
        initialInputs[s.partnerId] = s.amount;
      });
      setAmountInputs(initialInputs);
    } catch (err: any) {
      setError(err.message || "Failed to load petrol data");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (partnerId: string, val: string) => {
    const num = val === "" ? 0 : Number(val);
    setAmountInputs((prev) => ({ ...prev, [partnerId]: num }));
  };

  const handleSave = async (partnerId: string, partnerName: string) => {
    try {
      setError("");
      setSuccess("");

      const amount = amountInputs[partnerId];

      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/users/partner-petrol`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            date: selectedDate,
            partnerId,
            amount
          })
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save allowance");
      }

      setSuccess(`Petrol allowance of ₹${amount} saved for ${partnerName}`);
      setStats((prev) =>
        prev.map((s) => (s.partnerId === partnerId ? { ...s, amount } : s))
      );
    } catch (err: any) {
      setError(err.message || "Failed to save petrol allowance");
    }
  };

  return (
    <DashboardShell
      title="Petrol Allowance"
      description="Hub→hub GPS trail km (Start / End trip + 30s pings). Enter petrol ₹ manually."
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

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-xl font-bold text-white">Select Date</h3>
            <p className="text-sm text-slate-400 mt-1">
              Km from partner hub trip trail (preferred). Stop-to-stop GPS is fallback only.
            </p>
          </div>
          <div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={today}
              className="bg-slate-950 border border-slate-700 text-white px-4 py-2 rounded-lg outline-none focus:border-teal-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading petrol data...</div>
      ) : stats.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-xl">
          <h3 className="text-lg font-bold text-white mb-2">No Deliveries Found</h3>
          <p className="text-slate-400">
            No successful deliveries on {selectedDate}. Km appears after partners mark Delivered
            with location enabled.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {stats.map((partner) => (
            <div
              key={partner.partnerId}
              className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl hover:border-slate-700 transition-colors"
            >
              <div className="bg-slate-800/40 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800/50 gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold text-xl border border-teal-500/30">
                    {partner.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-white">{partner.name}</h3>
                      {partner.amount > 0 &&
                        (partner.partnerConfirmed ? (
                          <span className="text-[10px] uppercase tracking-wider font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                            Partner collected ✅
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wider font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">
                            Ask partner to confirm ⏳
                          </span>
                        ))}
                    </div>
                    <p className="text-xs text-slate-400">{partner.phone || "No phone"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-500">₹</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={amountInputs[partner.partnerId] || ""}
                      onChange={(e) => handleInputChange(partner.partnerId, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-4 py-2 text-white outline-none focus:border-teal-500 transition-colors"
                      placeholder="Petrol allowance"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSave(partner.partnerId, partner.name)}
                    disabled={amountInputs[partner.partnerId] === partner.amount}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-6 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap shadow-lg shadow-teal-500/20"
                  >
                    Save
                  </button>
                </div>
              </div>

              <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Delivered
                  </div>
                  <div className="text-2xl font-black text-teal-400">{partner.deliveredCount}</div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Trip km (hub)
                  </div>
                  <div className="text-2xl font-black text-amber-400">
                    {Number(partner.totalKm || 0).toFixed(2)} km
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {partner.kmSource === "trip_trail"
                      ? `Trail · ${partner.tripPointCount || 0} pts · ${partner.tripStatus || ""}`
                      : partner.kmSource === "stop_fallback"
                        ? `Fallback stop km ${Number(partner.stopKm || 0).toFixed(2)}`
                        : "No trip GPS yet"}
                  </div>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 col-span-2 md:col-span-1">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Saved allowance
                  </div>
                  <div className="text-2xl font-black text-white">
                    ₹{Number(partner.amount || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {(partner.missingGpsCount || 0) > 0 && (
                <div className="px-6 pb-2 text-sm text-amber-400/90">
                  {partner.missingGpsCount} stop(s) missing GPS — ask partner to allow location when
                  marking On the way / Delivered.
                </div>
              )}

              {partner.stops?.length > 0 && (
                <div className="px-6 pb-6">
                  <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">
                    Stops (route order)
                  </p>
                  <ul className="space-y-1.5 text-sm text-slate-300">
                    {partner.stops.map((stop, idx) => (
                      <li
                        key={stop.assignmentId}
                        className="flex flex-wrap items-center gap-2 bg-slate-950/40 border border-slate-800/80 rounded-lg px-3 py-2"
                      >
                        <span className="text-slate-500 font-mono text-xs w-6">{idx + 1}.</span>
                        <span className="font-medium text-white">{stop.customerName}</span>
                        <span
                          className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                            stop.hasGps
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {stop.hasGps ? "GPS ok" : "No GPS"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
