/** After this hour (local), same-day website orders must contact the shop. */
const SAME_DAY_ONLINE_CUTOFF_HOUR = 9;

const pad2 = (n) => String(n).padStart(2, "0");

const localYmd = (date = new Date()) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

/** Parse "07:00 AM - 07:30 AM" → start minutes from midnight */
const parseSlotStartMinutes = (slot) => {
  const match = String(slot || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = String(match[3] || "").toUpperCase();
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (period === "AM") {
    if (hour === 12) hour = 0;
  } else if (hour !== 12) {
    hour += 12;
  }
  return hour * 60 + minute;
};

/**
 * Website same-day rules:
 * - After 9:00 AM: block self-serve (contact admin)
 * - Before 9:00 AM: slot start must still be in the future
 */
const validateSameDayDeliverySlot = (deliveryDate, deliveryTime, now = new Date()) => {
  const date = String(deliveryDate || "").trim();
  const slot = String(deliveryTime || "").trim();
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: true };
  }
  if (date !== localYmd(now)) {
    return { ok: true };
  }

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  if (minutesNow >= SAME_DAY_ONLINE_CUTOFF_HOUR * 60) {
    return {
      ok: false,
      message:
        "Same-day online orders after 9:00 AM need shop confirmation. Please call or WhatsApp the shop to place this order."
    };
  }

  const start = parseSlotStartMinutes(slot);
  if (start == null) {
    return { ok: false, message: "Invalid delivery time slot." };
  }

  if (start <= minutesNow) {
    return {
      ok: false,
      message: "That delivery slot has already started. Please pick a later morning slot."
    };
  }

  return { ok: true };
};

module.exports = {
  SAME_DAY_ONLINE_CUTOFF_HOUR,
  parseSlotStartMinutes,
  validateSameDayDeliverySlot
};
