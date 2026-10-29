export const WEIGHT_OPTIONS = [
  { value: 0.25, label: "250 gram" },
  { value: 0.5, label: "500 gram" },
  { value: 0.75, label: "750 gram" },
  { value: 1, label: "1 kg" },
  { value: 1.5, label: "1.5 kg" },
  { value: 2, label: "2 kg" }
] as const;

export const DEFAULT_WEIGHT_KG = 1;

/** Whole-fish / weighed-on-scale range for manual booking. */
export const CUSTOM_WEIGHT_MIN_KG = 0.1;
export const CUSTOM_WEIGHT_MAX_KG = 4;

/** Grams → kg at 1-gram precision (575 gram = 0.575 kg). */
export const kgFromGrams = (grams: number) => Math.round(Number(grams) || 0) / 1000;

/**
 * Parse a typed whole-fish weight. `unit` is "gram" (575) or "kg" (0.575).
 * Returns kg, or null if empty / not a number / outside 100 gram–4 kg.
 */
export const parseCustomWeightKg = (raw: string, unit: "gram" | "kg"): number | null => {
  const n = Number(String(raw || "").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  const kg = unit === "gram" ? kgFromGrams(n) : Math.round(n * 1000) / 1000;
  if (kg + 1e-9 < CUSTOM_WEIGHT_MIN_KG || kg - 1e-9 > CUSTOM_WEIGHT_MAX_KG) return null;
  return kg;
};

/** Display quantity as "250 gram", "575 gram", "1 kg", or "2 pieces". */
export const formatQuantityLabel = (quantity: number, unit?: string) => {
  const qty = Number(quantity);
  const u = String(unit || "kg").toLowerCase();
  if (u !== "kg") {
    const label = u === "piece" ? (qty === 1 ? "piece" : "pieces") : u;
    return `${qty} ${label}`;
  }
  const known = WEIGHT_OPTIONS.find((opt) => Math.abs(opt.value - qty) < 0.0005);
  if (known) return known.label;
  const grams = Math.round(qty * 1000);
  if (grams <= 0) return "0 kg";
  if (grams % 1000 === 0) return `${grams / 1000} kg`;
  if (grams < 1000) return `${grams} gram`;
  return `${grams / 1000} kg`;
};

/** Snap any kg quantity to the closest allowed weight option. */
export const snapToWeightOption = (kg: number): number => {
  let best = DEFAULT_WEIGHT_KG;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const opt of WEIGHT_OPTIONS) {
    const diff = Math.abs(opt.value - kg);
    if (diff < bestDiff) {
      best = opt.value;
      bestDiff = diff;
    }
  }
  return best;
};
