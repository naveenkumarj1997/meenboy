/** Format minutes from midnight as "05:00 AM" / "05:30 AM" */
const formatSlotLabel = (minutesFromMidnight: number) => {
  const h = Math.floor(minutesFromMidnight / 60);
  const m = minutesFromMidnight % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${String(displayHour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
};

/** 30-minute delivery slots from 5:00 AM through 10:30 AM – 11:00 AM */
export const DELIVERY_TIMES = (() => {
  const slots: string[] = [];
  const startMinutes = 5 * 60; // 5:00 AM
  const endMinutes = 11 * 60; // 11:00 AM

  for (let start = startMinutes; start < endMinutes; start += 30) {
    slots.push(`${formatSlotLabel(start)} - ${formatSlotLabel(start + 30)}`);
  }

  return slots;
})();

export const DEFAULT_DELIVERY_TIME = DELIVERY_TIMES[0];

/** After this hour (local), same-day website checkout must contact admin. */
export const SAME_DAY_ONLINE_CUTOFF_HOUR = 9;

/** Approximate delivery = order time + this many hours (messaging). */
export const SAME_DAY_ETA_HOURS = 2;

const localYmd = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/** Parse leading "07:00 AM" from "07:00 AM - 07:30 AM" → minutes from midnight, or null. */
export const parseSlotStartMinutes = (slot: string): number | null => {
  const match = String(slot || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (period === "AM") {
    if (hour === 12) hour = 0;
  } else if (hour !== 12) {
    hour += 12;
  }
  return hour * 60 + minute;
};

export const formatClockLabel = (date: Date) => {
  let h = date.getHours();
  const m = date.getMinutes();
  const period = h >= 12 ? "PM" : "AM";
  const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${String(displayHour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
};

export const isSameDayDeliveryDate = (deliveryDate: string, now = new Date()) =>
  Boolean(deliveryDate) && deliveryDate === localYmd(now);

/** Same-day after 9:00 AM → customer must contact admin (no self-serve place order). */
export const mustContactAdminForSameDay = (deliveryDate: string, now = new Date()) => {
  if (!isSameDayDeliveryDate(deliveryDate, now)) return false;
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  return minutesNow >= SAME_DAY_ONLINE_CUTOFF_HOUR * 60;
};

/** Expected delivery ≈ now + ETA hours (e.g. 9:30 → 11:30). */
export const getExpectedDeliveryAround = (
  now = new Date(),
  leadHours = SAME_DAY_ETA_HOURS
) => {
  const t = new Date(now.getTime() + leadHours * 60 * 60 * 1000);
  return {
    at: t,
    label: formatClockLabel(t),
    dateLabel: localYmd(t)
  };
};

/**
 * Slots for self-serve checkout.
 * - Future date: all slots
 * - Same day before 9 AM: slots that still start after now
 * - Same day after 9 AM: empty (contact admin flow)
 */
export const getAvailableDeliveryTimes = (
  deliveryDate: string,
  now = new Date()
): string[] => {
  const today = localYmd(now);
  if (!deliveryDate || deliveryDate !== today) {
    return [...DELIVERY_TIMES];
  }

  if (mustContactAdminForSameDay(deliveryDate, now)) {
    return [];
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return DELIVERY_TIMES.filter((slot) => {
    const start = parseSlotStartMinutes(slot);
    if (start == null) return false;
    return start > nowMinutes;
  });
};
