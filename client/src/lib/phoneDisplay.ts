/** Format main + optional alternate phone for UI / reports */
export const formatPhoneWithAlternate = (
  phone?: string | null,
  alternatePhone?: string | null
): string => {
  const main = String(phone || "").trim();
  const alt = String(alternatePhone || "").trim();
  if (main && alt) return `${main} · Alt ${alt}`;
  return main || alt || "";
};
