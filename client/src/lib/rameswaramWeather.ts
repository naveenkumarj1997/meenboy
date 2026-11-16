/** Live Rameswaram weather for the homepage ocean scene. Remove this file to drop the feature. */
export type RameswaramMood = "fair" | "cloudy" | "rain" | "wind" | "storm" | "tornado";

export type RameswaramWeather = {
  mood: RameswaramMood;
  isDay: boolean;
  label: string;
  tempC: number | null;
};

const RAMESWARAM = { lat: 9.2876, lng: 79.3129 };
const CACHE_KEY = "ff_rameswaram_weather_v2";
const CACHE_MS = 15 * 60 * 1000;

const OPEN_METEO = `https://api.open-meteo.com/v1/forecast?latitude=${RAMESWARAM.lat}&longitude=${RAMESWARAM.lng}&current=temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m,precipitation,is_day&timezone=Asia%2FKolkata`;

export const guessRameswaramIsDay = (): boolean => {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      hour12: false
    }).format(new Date())
  );
  return hour >= 6 && hour < 18;
};

const weatherWord = (mood: RameswaramMood, isDay: boolean) => {
  switch (mood) {
    case "fair":
      return isDay ? "Sunny" : "Clear";
    case "cloudy":
      return "Cloudy";
    case "rain":
      return "Rain";
    case "wind":
      return "Windy";
    case "storm":
      return "Thunderstorm";
    case "tornado":
      return "Severe storm";
    default:
      return "Sea weather";
  }
};

const pickMood = (opts: {
  code: number;
  wind: number;
  gust: number;
  precip: number;
}): RameswaramMood => {
  const { code, wind, gust, precip } = opts;
  if (code === 96 || code === 99 || gust >= 85) return "tornado";
  if (code === 95 || gust >= 58) return "storm";
  if (precip >= 0.2 || (code >= 51 && code <= 82)) return "rain";
  if (wind >= 28 || gust >= 40) return "wind";
  if (code <= 1) return "fair";
  return "cloudy";
};

const readCache = (): RameswaramWeather | null => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; data: RameswaramWeather };
    if (!parsed?.data || typeof parsed.data.isDay !== "boolean") return null;
    if (Date.now() - parsed.at > CACHE_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
};

const writeCache = (data: RameswaramWeather) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* ignore */
  }
};

export const fetchRameswaramWeather = async (): Promise<RameswaramWeather | null> => {
  const cached = readCache();
  if (cached) return cached;

  const res = await fetch(OPEN_METEO);
  if (!res.ok) return null;
  const json = await res.json();
  const cur = json?.current || {};
  const code = Number(cur.weather_code);
  const wind = Number(cur.wind_speed_10m);
  const gust = Number(cur.wind_gusts_10m);
  const precip = Number(cur.precipitation);
  const isDay = Number(cur.is_day) === 1;
  const tempC = Number.isFinite(Number(cur.temperature_2m))
    ? Math.round(Number(cur.temperature_2m))
    : null;

  const mood = pickMood({
    code: Number.isFinite(code) ? code : 2,
    wind: Number.isFinite(wind) ? wind : 0,
    gust: Number.isFinite(gust) ? gust : 0,
    precip: Number.isFinite(precip) ? precip : 0
  });

  const period = isDay ? "Day" : "Night";
  const data: RameswaramWeather = {
    mood,
    isDay,
    tempC,
    label: `${period} · ${weatherWord(mood, isDay)}${tempC != null ? ` · ${tempC}°C` : ""}`
  };
  writeCache(data);
  return data;
};
