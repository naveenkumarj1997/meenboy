const toRad = (deg) => (deg * Math.PI) / 180;

/** Great-circle distance in km between two WGS84 points. */
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const isValidPoint = (p) =>
  p &&
  Number.isFinite(Number(p.lat)) &&
  Number.isFinite(Number(p.lng));

/**
 * Sum consecutive GPS trail points.
 * Skips tiny moves (default 20m) so waiting at meat shop barely adds km.
 */
const computeTrailKm = (points, minMoveMeters = 20) => {
  if (!Array.isArray(points) || points.length < 2) return 0;
  const minKm = minMoveMeters / 1000;
  let total = 0;
  let prev = null;
  for (const raw of points) {
    if (!isValidPoint(raw)) continue;
    const point = { lat: Number(raw.lat), lng: Number(raw.lng) };
    if (!prev) {
      prev = point;
      continue;
    }
    const seg = haversineKm(prev.lat, prev.lng, point.lat, point.lng);
    if (seg >= minKm) {
      total += seg;
      prev = point;
    }
  }
  return Math.round(total * 100) / 100;
};

/**
 * Daily route km for delivered assignments (legacy stop-to-stop).
 */
const computeRouteKmFromAssignments = (assignments) => {
  const sorted = [...assignments].sort((a, b) => {
    const seqDiff = Number(a.sequence || 0) - Number(b.sequence || 0);
    if (seqDiff !== 0) return seqDiff;
    const aTime = new Date(
      a.deliveredLocation?.capturedAt || a.actualArrival || a.updatedAt || 0
    ).getTime();
    const bTime = new Date(
      b.deliveredLocation?.capturedAt || b.actualArrival || b.updatedAt || 0
    ).getTime();
    return aTime - bTime;
  });

  const stopPoints = sorted.map((a) => {
    if (isValidPoint(a.deliveredLocation)) {
      return {
        lat: Number(a.deliveredLocation.lat),
        lng: Number(a.deliveredLocation.lng),
        source: "delivered"
      };
    }
    if (isValidPoint(a.enRouteLocation)) {
      return {
        lat: Number(a.enRouteLocation.lat),
        lng: Number(a.enRouteLocation.lng),
        source: "en_route"
      };
    }
    return null;
  });

  if (sorted.length === 1) {
    const a = sorted[0];
    if (isValidPoint(a.enRouteLocation) && isValidPoint(a.deliveredLocation)) {
      const km = haversineKm(
        Number(a.enRouteLocation.lat),
        Number(a.enRouteLocation.lng),
        Number(a.deliveredLocation.lat),
        Number(a.deliveredLocation.lng)
      );
      return Math.round(km * 100) / 100;
    }
    return 0;
  }

  let total = 0;
  let prev = null;
  for (const point of stopPoints) {
    if (!point) continue;
    if (prev) {
      total += haversineKm(prev.lat, prev.lng, point.lat, point.lng);
    }
    prev = point;
  }

  return Math.round(total * 100) / 100;
};

/** Current calendar date in Asia/Kolkata as YYYY-MM-DD */
const istYmd = (d = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
};

/** Minutes from midnight in Asia/Kolkata */
const istMinutesNow = (d = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(d);
  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
  return hour * 60 + minute;
};

/** Auto-end active trips after 1:00 PM IST (13:00). */
const AUTO_END_AFTER_MINUTES = 13 * 60;

module.exports = {
  haversineKm,
  isValidPoint,
  computeRouteKmFromAssignments,
  computeTrailKm,
  istYmd,
  istMinutesNow,
  AUTO_END_AFTER_MINUTES
};
