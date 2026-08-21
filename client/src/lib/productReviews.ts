/**
 * Deterministic mock rating/reviews from product id,
 * so /products and /products/:id always show the same values.
 */
export const getProductReviewStats = (productId: string | number) => {
  const id = String(productId || "");
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }

  // Rating between 4.0 and 4.9 (one decimal)
  const rating = Number((4 + ((hash % 10) / 10)).toFixed(1));
  // Review count between 5 and 49
  const reviews = 5 + (hash % 45);

  return { rating, reviews };
};
