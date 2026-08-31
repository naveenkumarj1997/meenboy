/** Order total = subtotal + deliveryFee + addon − discount (never below 0) */
const computeOrderTotal = (
  subtotal,
  deliveryFee = 0,
  discountAmount = 0,
  addonAmount = 0
) => {
  const total =
    Number(subtotal || 0) +
    Number(deliveryFee || 0) +
    Number(addonAmount || 0) -
    Number(discountAmount || 0);
  return Math.max(0, Math.round(total * 100) / 100);
};

const parseNonNegativeAmount = (value) => {
  if (value == null || value === "") return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
};

module.exports = {
  computeOrderTotal,
  parseNonNegativeAmount
};
