// Short share links (maps.app.goo.gl, goo.gl/maps, share.google) are opened by the
// iOS Google Maps app as "unsupported link", so they are expanded server-side and
// replaced with the official cross-platform URL format.

const SHORT_HOSTS = ["maps.app.goo.gl", "goo.gl", "share.google", "g.co"];
const RESOLVE_TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 6;
const MAX_CACHE = 2000;

const cache = new Map();
const pending = new Map();

const toNumberPair = (lat, lng) => {
  const a = Number(lat);
  const b = Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (Math.abs(a) > 90 || Math.abs(b) > 180) return null;
  return { lat: a, lng: b };
};

const extractCoords = (rawUrl) => {
  let url = String(rawUrl || "");
  try {
    url = decodeURIComponent(url);
  } catch {
    // keep raw
  }
  const num = "(-?\\d{1,3}(?:\\.\\d+)?)";
  const patterns = [
    new RegExp(`!3d${num}!4d${num}`),
    new RegExp(`[?&](?:q|query|ll|daddr|destination|center)=(?:loc:)?${num}\\s*,\\s*${num}`),
    new RegExp(`/(?:search|place|dir)/${num}\\s*,\\s*\\+?${num}`),
    new RegExp(`@${num},${num}`)
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) {
      const pair = toNumberPair(m[1], m[2]);
      if (pair) return pair;
    }
  }
  return null;
};

const buildNavUrl = ({ lat, lng }) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

const searchQueryOf = (url) => {
  try {
    const parsed = new URL(url);
    if (!/(^|\.)google\.[a-z.]+$/i.test(parsed.hostname)) return "";
    if (!parsed.pathname.startsWith("/search")) return "";
    return (parsed.searchParams.get("q") || "").trim();
  } catch {
    return "";
  }
};

const isShortLink = (url) => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return SHORT_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
};

const followRedirects = async (startUrl) => {
  let current = startUrl;
  for (let i = 0; i < MAX_REDIRECTS; i += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RESOLVE_TIMEOUT_MS);
    let res;
    try {
      res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
      });
    } finally {
      clearTimeout(timer);
    }
    const location = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !location) break;
    current = new URL(location, current).toString();
    if (extractCoords(current)) break;
  }
  return current;
};

const remember = (key, value) => {
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
  cache.set(key, value);
  return value;
};

/** Returns a link that opens correctly in Google Maps on both Android and iOS. */
const resolveNavUrl = async (rawUrl) => {
  const url = String(rawUrl || "").trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) return url;

  const direct = extractCoords(url);
  if (direct) return buildNavUrl(direct);
  if (!isShortLink(url)) return url;

  if (cache.has(url)) return cache.get(url);
  if (pending.has(url)) return pending.get(url);

  const job = (async () => {
    try {
      const finalUrl = await followRedirects(url);
      const coords = extractCoords(finalUrl);
      if (coords) return remember(url, buildNavUrl(coords));
      const placeQuery = searchQueryOf(finalUrl);
      if (placeQuery) {
        return remember(
          url,
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeQuery)}`
        );
      }
      if (finalUrl && finalUrl !== url && !isShortLink(finalUrl)) return remember(url, finalUrl);
      return url;
    } catch {
      return url;
    } finally {
      pending.delete(url);
    }
  })();
  pending.set(url, job);
  return job;
};

module.exports = { resolveNavUrl, extractCoords };
