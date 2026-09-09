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
 * Daily route km for delivered assignments (already filtered by partner/date).
 * Point per stop: deliveredLocation || enRouteLocation.
 * 2+ stops: sum consecutive segments.
 * 1 stop: enRoute → delivered if both exist, else 0.
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

module.exports = {
  haversineKm,
  computeRouteKmFromAssignments
};
