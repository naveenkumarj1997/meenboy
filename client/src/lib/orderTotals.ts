/** Order total = subtotal + deliveryFee + addon − discount (never below 0) */
export const computeOrderTotal = (
  subtotal: number,
  deliveryFee = 0,
  discountAmount = 0,
  addonAmount = 0
): number => {
  const total =
    Number(subtotal || 0) +
    Number(deliveryFee || 0) +
    Number(addonAmount || 0) -
    Number(discountAmount || 0);
  return Math.max(0, Math.round(total * 100) / 100);
};

export const parseNonNegativeAmount = (value: unknown): number => {
  if (value == null || value === "") return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
};

export type BookingAdjustments = {
  discountAmount?: number;
  discountNote?: string;
  addonAmount?: number;
  addonNote?: string;
};

export const emptyBookingAdjustments = (): BookingAdjustments => ({
  discountAmount: 0,
  discountNote: "",
  addonAmount: 0,
  addonNote: ""
});

export const bookingAdjustmentsFromUser = (user?: {
  bookingAdjustments?: BookingAdjustments;
}): BookingAdjustments => {
  const adj = user?.bookingAdjustments;
  if (!adj) return emptyBookingAdjustments();
  return {
    discountAmount: parseNonNegativeAmount(adj.discountAmount),
    discountNote: String(adj.discountNote || "").trim(),
    addonAmount: parseNonNegativeAmount(adj.addonAmount),
    addonNote: String(adj.addonNote || "").trim()
  };
};
