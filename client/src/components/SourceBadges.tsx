/** Badge for order booking channel */
export function BookingSourceBadge({ source }: { source?: string }) {
  const isManual = source === "manual";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
        isManual
          ? "bg-violet-500/15 text-violet-300 border-violet-500/30"
          : "bg-sky-500/15 text-sky-300 border-sky-500/30"
      }`}
      title={isManual ? "Booked by admin (Manual Booking)" : "Booked by customer on website"}
    >
      {isManual ? "Manual booking" : "Website booking"}
    </span>
  );
}

export function RealUserBadge({ isRealUser }: { isRealUser?: boolean }) {
  const real = Boolean(isRealUser);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
        real
          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
          : "bg-slate-500/15 text-slate-400 border-slate-500/30"
      }`}
    >
      {real ? "Real user" : "Test user"}
    </span>
  );
}

/** Badge for how the customer account was created */
export function CustomerSourceBadge({ source, role }: { source?: string; role?: string }) {
  if (role && role !== "customer") return null;
  const isManual = source === "manual";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
        isManual
          ? "bg-violet-500/15 text-violet-300 border-violet-500/30"
          : "bg-sky-500/15 text-sky-300 border-sky-500/30"
      }`}
      title={
        isManual
          ? "Account created via admin Manual Booking"
          : "Account registered on the website"
      }
    >
      {isManual ? "Manual booking customer" : "Website customer"}
    </span>
  );
}
