const { PRODUCT_CATEGORIES } = require("../models/Product");

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

const FISH_LIKE = new Set(["Fish", "Seafood"]);

const defaultRules = () =>
  PRODUCT_CATEGORIES.map((category) => {
    if (FISH_LIKE.has(category)) {
      return {
        category,
        deliveryWeekdays: [0, 3], // Sunday, Wednesday
        cutoffEnabled: true,
        cutoffDaysBefore: 2,
        cutoffHour: 21,
        cutoffMinute: 0
      };
    }
    return {
      category,
      deliveryWeekdays: [0, 1, 2, 3, 4, 5, 6],
      cutoffEnabled: false,
      cutoffDaysBefore: 2,
      cutoffHour: 21,
      cutoffMinute: 0
    };
  });

const pad2 = (n) => String(n).padStart(2, "0");

const addDaysYmd = (ymd, delta) => {
  const [y, m, d] = String(ymd).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + Number(delta || 0)));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
};

const istWeekdayFromYmd = (ymd) => {
  const dt = new Date(`${ymd}T12:00:00+05:30`);
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short"
  }).format(dt);
  const idx = WEEKDAY_SHORT.indexOf(short);
  return idx >= 0 ? idx : dt.getUTCDay();
};

const formatCutoffClock = (hour, minute) => {
  const h = Number(hour);
  const m = Number(minute) || 0;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad2(m)} ${ampm}`;
};

const weekdayListLabel = (weekdays) => {
  const sorted = [...new Set((weekdays || []).map(Number))].sort((a, b) => a - b);
  if (sorted.length === 0) return "no days";
  if (sorted.length === 7) return "every day";
  return sorted.map((d) => WEEKDAY_LONG[d]).join(" & ");
};

const shapeRule = (rule) => {
  const deliveryWeekdays = [...new Set((rule.deliveryWeekdays || []).map(Number))]
    .filter((n) => n >= 0 && n <= 6)
    .sort((a, b) => a - b);
  return {
    category: rule.category,
    deliveryWeekdays,
    cutoffEnabled: Boolean(rule.cutoffEnabled),
    cutoffDaysBefore: Number.isFinite(Number(rule.cutoffDaysBefore))
      ? Math.max(0, Math.min(14, Number(rule.cutoffDaysBefore)))
      : 2,
    cutoffHour: Number.isFinite(Number(rule.cutoffHour))
      ? Math.max(0, Math.min(23, Number(rule.cutoffHour)))
      : 21,
    cutoffMinute: Number.isFinite(Number(rule.cutoffMinute))
      ? Math.max(0, Math.min(59, Number(rule.cutoffMinute)))
      : 0
  };
};

const shapeConfig = (doc) => {
  const raw = doc?.toObject ? doc.toObject() : doc || {};
  const byCat = new Map((raw.rules || []).map((r) => [r.category, shapeRule(r)]));
  const rules = defaultRules().map((fallback) => byCat.get(fallback.category) || fallback);
  return {
    enabled: raw.enabled !== false,
    rules,
    updatedAt: raw.updatedAt || null
  };
};

const cutoffDeadline = (deliveryYmd, rule) => {
  const daysBefore = Number(rule.cutoffDaysBefore) || 0;
  const cutoffYmd = addDaysYmd(deliveryYmd, -daysBefore);
  const hour = Number(rule.cutoffHour);
  const minute = Number(rule.cutoffMinute) || 0;
  return {
    cutoffYmd,
    at: new Date(`${cutoffYmd}T${pad2(hour)}:${pad2(minute)}:00+05:30`),
    label: `${WEEKDAY_LONG[istWeekdayFromYmd(cutoffYmd)]} ${formatCutoffClock(hour, minute)}`
  };
};

/**
 * Evaluate website booking for one category on a delivery date (IST).
 * Returns null if allowed; otherwise { code, message }.
 */
const evaluateCategoryForDate = (config, category, deliveryYmd, now = new Date()) => {
  if (!config?.enabled) return null;
  if (!category || !deliveryYmd || !/^\d{4}-\d{2}-\d{2}$/.test(deliveryYmd)) return null;

  const rule = (config.rules || []).find((r) => r.category === category);
  if (!rule) return null;

  const wd = istWeekdayFromYmd(deliveryYmd);
  const allowed = (rule.deliveryWeekdays || []).map(Number);
  if (!allowed.includes(wd)) {
    return {
      code: "weekday",
      message: `${category} is delivered only on ${weekdayListLabel(allowed)} (not on ${WEEKDAY_LONG[wd]}).`
    };
  }

  if (rule.cutoffEnabled) {
    const { at, label } = cutoffDeadline(deliveryYmd, rule);
    if (now.getTime() > at.getTime()) {
      return {
        code: "cutoff",
        message: `${category} for ${WEEKDAY_LONG[wd]} must be ordered before ${label} IST. Please choose another date.`
      };
    }
  }

  return null;
};

const evaluateItemsForDate = (config, products, deliveryYmd, now = new Date()) => {
  const blocked = [];
  for (const p of products || []) {
    const result = evaluateCategoryForDate(config, p.category, deliveryYmd, now);
    if (result) {
      blocked.push({ product: p, ...result });
    }
  }
  return blocked;
};

/** Customer-facing notice when cart has fish/seafood (or any cutoff-restricted category). */
const buildCustomerNotices = (config, categories) => {
  if (!config?.enabled) return [];
  const cats = [...new Set((categories || []).filter(Boolean))];
  const notices = [];

  for (const category of cats) {
    const rule = (config.rules || []).find((r) => r.category === category);
    if (!rule) continue;
    const days = weekdayListLabel(rule.deliveryWeekdays);
    if (!rule.cutoffEnabled) {
      if (FISH_LIKE.has(category) || (rule.deliveryWeekdays || []).length < 7) {
        notices.push(`${category}: delivered on ${days}.`);
      }
      continue;
    }
    const clock = formatCutoffClock(rule.cutoffHour, rule.cutoffMinute);
    const parts = (rule.deliveryWeekdays || []).map((wd) => {
      // Approximate: cutoff weekday = delivery weekday - daysBefore
      const cutoffWd = (((Number(wd) - Number(rule.cutoffDaysBefore)) % 7) + 7) % 7;
      return `${WEEKDAY_LONG[wd]} → order before ${WEEKDAY_LONG[cutoffWd]} ${clock}`;
    });
    notices.push(`${category}: only ${days}. Website booking: ${parts.join("; ")} (IST).`);
  }

  return notices;
};

module.exports = {
  WEEKDAY_SHORT,
  WEEKDAY_LONG,
  FISH_LIKE,
  defaultRules,
  shapeRule,
  shapeConfig,
  istWeekdayFromYmd,
  evaluateCategoryForDate,
  evaluateItemsForDate,
  buildCustomerNotices,
  weekdayListLabel,
  formatCutoffClock
};
