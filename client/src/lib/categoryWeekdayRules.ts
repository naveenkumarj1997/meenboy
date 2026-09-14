/** Client mirror of server weekday/cutoff rules (IST). */

export type CategoryWeekdayRule = {
  category: string;
  deliveryWeekdays: number[];
  cutoffEnabled: boolean;
  cutoffDaysBefore: number;
  cutoffHour: number;
  cutoffMinute: number;
};

export type CategoryWeekdayConfig = {
  enabled: boolean;
  rules: CategoryWeekdayRule[];
  updatedAt?: string | null;
};

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

const pad2 = (n: number) => String(n).padStart(2, "0");

export const WEEKDAY_OPTIONS = WEEKDAY_LONG.map((label, value) => ({ label, value }));

export const istWeekdayFromYmd = (ymd: string): number => {
  const dt = new Date(`${ymd}T12:00:00+05:30`);
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short"
  }).format(dt);
  const idx = WEEKDAY_SHORT.indexOf(short);
  return idx >= 0 ? idx : dt.getUTCDay();
};

const addDaysYmd = (ymd: string, delta: number) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
};

const formatCutoffClock = (hour: number, minute: number) => {
  const h = Number(hour);
  const m = Number(minute) || 0;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad2(m)} ${ampm}`;
};

export const weekdayListLabel = (weekdays: number[]) => {
  const sorted = [...new Set((weekdays || []).map(Number))].sort((a, b) => a - b);
  if (sorted.length === 0) return "no days";
  if (sorted.length === 7) return "every day";
  return sorted.map((d) => WEEKDAY_LONG[d]).join(" & ");
};

export const evaluateCategoryForDate = (
  config: CategoryWeekdayConfig | null | undefined,
  category: string | undefined,
  deliveryYmd: string | undefined,
  now = new Date()
): { code: string; message: string } | null => {
  if (!config?.enabled || !category || !deliveryYmd || !/^\d{4}-\d{2}-\d{2}$/.test(deliveryYmd)) {
    return null;
  }

  const rule = config.rules?.find((r) => r.category === category);
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
    const daysBefore = Number(rule.cutoffDaysBefore) || 0;
    const cutoffYmd = addDaysYmd(deliveryYmd, -daysBefore);
    const hour = Number(rule.cutoffHour);
    const minute = Number(rule.cutoffMinute) || 0;
    const at = new Date(`${cutoffYmd}T${pad2(hour)}:${pad2(minute)}:00+05:30`);
    if (now.getTime() > at.getTime()) {
      const cutoffWd = istWeekdayFromYmd(cutoffYmd);
      return {
        code: "cutoff",
        message: `${category} for ${WEEKDAY_LONG[wd]} must be ordered before ${WEEKDAY_LONG[cutoffWd]} ${formatCutoffClock(hour, minute)} IST. Please choose another date.`
      };
    }
  }

  return null;
};

export const buildCustomerNotices = (
  config: CategoryWeekdayConfig | null | undefined,
  categories: string[]
): string[] => {
  if (!config?.enabled) return [];
  const cats = [...new Set((categories || []).filter(Boolean))];
  const notices: string[] = [];

  for (const category of cats) {
    const rule = config.rules?.find((r) => r.category === category);
    if (!rule) continue;
    const days = weekdayListLabel(rule.deliveryWeekdays);
    const restrictedDays = (rule.deliveryWeekdays || []).length < 7;

    if (!rule.cutoffEnabled) {
      if (restrictedDays) {
        notices.push(`${category}: delivered on ${days}.`);
      }
      continue;
    }

    const clock = formatCutoffClock(rule.cutoffHour, rule.cutoffMinute);
    const parts = (rule.deliveryWeekdays || []).map((wd) => {
      const cutoffWd = (((Number(wd) - Number(rule.cutoffDaysBefore)) % 7) + 7) % 7;
      return `${WEEKDAY_LONG[wd]} → order before ${WEEKDAY_LONG[cutoffWd]} ${clock}`;
    });
    notices.push(`${category}: only ${days}. Website booking: ${parts.join("; ")} (IST).`);
  }

  return notices;
};
