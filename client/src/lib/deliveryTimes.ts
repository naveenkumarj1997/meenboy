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
