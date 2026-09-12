const geoCache = new Map(); // key -> { label, street, area, at }

const cacheKey = (lat, lng) =>
  `${Number(lat).toFixed(3)},${Number(lng).toFixed(3)}`;

/**
 * Reverse geocode lat/lng → street + area via OpenStreetMap Nominatim.
 * Soft-fail; caches by ~100m grid. Max ~1 req/sec policy — callers should throttle.
 */
const reverseGeocode = async (lat, lng) => {
  const latN = Number(lat);
  const lngN = Number(lng);
  if (!Number.isFinite(latN) || !Number.isFinite(lngN)) return null;

  const key = cacheKey(latN, lngN);
  const hit = geoCache.get(key);
  if (hit && Date.now() - hit.at < 30 * 60 * 1000) {
    return hit;
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(latN));
    url.searchParams.set("lon", String(lngN));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("zoom", "18");

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "FishFriendlyDeliveryAdmin/1.0 (admin tracking; contact via app support)",
        Accept: "application/json",
        "Accept-Language": "en"
      }
    });

    if (!res.ok) return hit || null;
    const data = await res.json();
    const addr = data.address || {};
    const street = [addr.house_number, addr.road || addr.pedestrian || addr.path]
      .filter(Boolean)
      .join(" ")
      .trim();
    const area =
      addr.suburb ||
      addr.neighbourhood ||
      addr.quarter ||
      addr.village ||
      addr.town ||
      addr.city_district ||
      addr.city ||
      "";
    const label = [street, area].filter(Boolean).join(", ") || data.display_name || "";

    const shaped = {
      lat: latN,
      lng: lngN,
      street: street || "",
      area: area || "",
      label: label || `${latN.toFixed(5)}, ${lngN.toFixed(5)}`,
      at: Date.now()
    };
    geoCache.set(key, shaped);
    return shaped;
  } catch {
    return hit || null;
  }
};

module.exports = { reverseGeocode };
