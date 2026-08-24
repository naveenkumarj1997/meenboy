export const WEIGHT_OPTIONS = [
  { value: 0.25, label: "250 gram" },
  { value: 0.5, label: "500 gram" },
  { value: 1, label: "1 kg" },
  { value: 1.5, label: "1.5 kg" },
  { value: 2, label: "2 kg" }
] as const;

export const DEFAULT_WEIGHT_KG = 1;

/** Display quantity as "250 gram", "1 kg", or "2 pieces". */
export const formatQuantityLabel = (quantity: number, unit?: string) => {
  const qty = Number(quantity);
  const u = String(unit || "kg").toLowerCase();
  if (u !== "kg") {
    const label = u === "piece" ? (qty === 1 ? "piece" : "pieces") : u;
    return `${qty} ${label}`;
  }
  const known = WEIGHT_OPTIONS.find((opt) => Math.abs(opt.value - qty) < 0.001);
  if (known) return known.label;
  if (qty > 0 && qty < 1) return `${Math.round(qty * 1000)} gram`;
  return `${Math.round(qty * 100) / 100} kg`;
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
