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
