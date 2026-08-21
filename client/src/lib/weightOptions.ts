export const WEIGHT_OPTIONS = [
  { value: 0.25, label: "250 gram" },
  { value: 0.5, label: "500 gram" },
  { value: 1, label: "1 kg" },
  { value: 1.5, label: "1.5 kg" },
  { value: 2, label: "2 kg" }
] as const;

export const DEFAULT_WEIGHT_KG = 1;

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
