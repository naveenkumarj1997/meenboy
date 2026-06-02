import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BADGE_STYLES,
  CATEGORIES,
  CATEGORY_ICONS,
  type Product,
} from "../data/products";
import { useCart } from "../context/CartContext";
import { getCatalog } from "../lib/api";

// ─── Sort Options ─────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: "default", label: "✦ Featured" },
  { value: "price-asc", label: "Price: Low → High" },
  { value: "price-desc", label: "Price: High → Low" },
  { value: "rating", label: "⭐ Top Rated" },
  { value: "name", label: "Name A–Z" },
];

// ─── Star Rating ──────────────────────────────────────────────────────────────
const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <svg
        key={star}
        className={`w-3.5 h-3.5 ${
          star <= Math.floor(rating)
            ? "text-amber-400"
            : star <= rating
            ? "text-amber-400/50"
            : "text-white/20"
        }`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
);

// ─── Product Card ─────────────────────────────────────────────────────────────
const ProductCard = ({
  product,
  index,
}: {
  product: Product;
  index: number;
}) => {
  const [added, setAdded] = useState(false);
  const { addToCart } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault(); // prevent link navigation when clicking Add
    
    // Default to the first cut if none selected but cuts exist
    const cutToUse = product.cuts?.[0];
    const price = cutToUse && cutToUse.price > 0 ? cutToUse.price : product.priceRange.min;
    
    addToCart({
      productId: String(product.id),
      name: product.name,
      price: price,
      quantity: 1,
      image: product.image,
      category: product.category,
      cutName: cutToUse?.name,
      unit: product.unit,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.4) }}
      className="group relative flex flex-col bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:border-teal-500/50 hover:shadow-2xl hover:shadow-teal-500/10 transition-all duration-300"
    >
      {/* ── Image (clickable → details) ── */}
      <Link
        to={`/products/${product.id}`}
        className="block relative aspect-[4/3] overflow-hidden bg-cyan-900/40 shrink-0"
        tabIndex={-1}
      >
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://placehold.co/600x400/0e7490/e0f2fe?text=${encodeURIComponent(
              product.name
            )}`;
          }}
        />
        {/* Bottom gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-950/80 via-transparent to-transparent" />

        {/* Badge */}
        {product.badge && (
          <span
            className={`absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full ${
              BADGE_STYLES[product.badge] ?? "bg-white text-black"
            }`}
          >
            {product.badge}
          </span>
        )}

        {/* Category */}
        <span className="absolute top-3 right-3 flex items-center gap-1 bg-cyan-950/75 backdrop-blur-sm text-white/90 text-xs font-medium px-2.5 py-1 rounded-full">
          <span>{CATEGORY_ICONS[product.category]}</span>
          <span>{product.category}</span>
        </span>
      </Link>

      {/* ── Content ── */}
      <div className="flex flex-col flex-1 p-5">
        {/* Title (clickable → details) */}
        <Link
          to={`/products/${product.id}`}
          className="block mb-0.5"
        >
          <h3 className="text-sm font-bold text-white truncate hover:text-teal-400 transition-colors">
            {product.name}
          </h3>
        </Link>
        <p className="text-xs text-white/45 mb-3 line-clamp-1">
          {product.description}
        </p>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mb-4">
          <StarRating rating={product.rating} />
          <span className="text-xs text-white/50">
            {product.rating}&nbsp;
            <span className="text-white/30">({product.reviews})</span>
          </span>
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between mt-auto">
          <div className="leading-tight">
            <span className="text-[10px] text-white/35 uppercase tracking-wide block">
              from / {product.unit}
            </span>
            <span className="text-xl font-black text-teal-400">
              ₹{product.priceRange.min.toFixed(2)}
            </span>
          </div>

          <motion.button
            id={`add-to-cart-${product.id}`}
            onClick={handleAddToCart}
            whileTap={{ scale: 0.88 }}
            aria-label={`Add ${product.name} to cart`}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-200 ${
              added
                ? "bg-emerald-500 text-white"
                : "bg-teal-500 hover:bg-teal-400 text-white"
            }`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {added ? (
                <motion.span
                  key="check"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  className="flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Added!
                </motion.span>
              ) : (
                <motion.span
                  key="cart"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  className="flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Add
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* View Details link */}
        <Link
          to={`/products/${product.id}`}
          className="mt-3 text-xs text-teal-500/70 hover:text-teal-400 transition-colors flex items-center gap-1 self-end"
        >
          View Details
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </motion.div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const ProductsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState("default");
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoading(true);
        const res = await getCatalog();
        const mappedProducts: Product[] = res.data.products.map(p => ({
          id: p._id,
          name: p.name,
          category: p.category,
          price: p.minPrice,
          priceRange: { min: p.minPrice, max: p.maxPrice },
          unit: p.unit || "kg",
          rating: 4.5, // Fallback mock value
          reviews: Math.floor(Math.random() * 200) + 50, // Fallback mock value
          badge: "", // No badge by default
          description: p.description || "Freshly sourced product",
          longDescription: p.description || "Freshly sourced product directly from the markets.",
          image: p.image?.startsWith('/uploads') ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${p.image}` : (p.image || "https://placehold.co/600x400/0e7490/e0f2fe?text=No+Image"),
          cuts: p.availableCuts?.map((c: any) => ({
            id: c.name,
            name: c.name,
            price: c.price,
            description: c.description || ""
          })) || [],
          origin: "Local Market",
          nutritionHighlights: ["High Quality", "Freshly Packed"],
        }));
        setProducts(mappedProducts);
      } catch (err) {
        console.error("Failed to load catalog", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase();
    let results = products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      const matchesCategory =
        selectedCategory === "All" || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    switch (sortBy) {
      case "price-asc":
        return [...results].sort((a, b) => a.price - b.price);
      case "price-desc":
        return [...results].sort((a, b) => b.price - a.price);
      case "rating":
        return [...results].sort((a, b) => b.rating - a.rating);
      case "name":
        return [...results].sort((a, b) => a.name.localeCompare(b.name));
      default:
        return results;
    }
  }, [searchTerm, selectedCategory, sortBy, products]);

  const categoryCount = (cat: string) =>
    cat === "All"
      ? products.length
      : products.filter((p) => p.category === cat).length;

  const hasActiveFilters =
    searchTerm !== "" || selectedCategory !== "All" || sortBy !== "default";

  const clearAll = () => {
    setSearchTerm("");
    setSelectedCategory("All");
    setSortBy("default");
  };

  return (
    <div className="min-h-screen bg-cyan-950">
      {/* ════════════════════════ Hero ════════════════════════ */}
      <div className="relative overflow-hidden bg-gradient-to-br from-cyan-900 via-cyan-950 to-teal-950 border-b border-white/5 py-14 px-4">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/30 text-teal-400 text-sm font-semibold px-4 py-1.5 rounded-full mb-5">
              🐟 Sourced Fresh Every Day
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4 leading-tight">
              Fresh Catch &amp;{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-300">
                Premium Cuts
              </span>
            </h1>
            <p className="text-white/55 text-lg max-w-2xl mx-auto">
              From the ocean to your table — shop the freshest seafood, tender
              meats, and specialty cuts delivered right to your door.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-wrap items-center justify-center gap-10 mt-10"
          >
            {[
              { icon: "📦", value: `${products.length}+`, label: "Products" },
              { icon: "🏷️", value: "5", label: "Categories" },
              { icon: "✅", value: "100%", label: "Fresh Daily" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-black text-teal-400">
                  {stat.icon} {stat.value}
                </div>
                <div className="text-xs text-white/40 uppercase tracking-widest mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ════════════════════ Sticky Filter Bar ════════════════════ */}
      <div className="sticky top-16 z-40 bg-cyan-950/95 backdrop-blur-xl border-b border-white/5 shadow-xl shadow-cyan-950/80">
        <div className="max-w-7xl mx-auto px-4 py-3.5">
          <div className="flex flex-col md:flex-row gap-3">

            {/* Search */}
            <div className="relative flex-none md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-white/35" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                id="product-search"
                type="text"
                placeholder="Search products…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-teal-500/60 focus:ring-2 focus:ring-teal-500/20 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/35 hover:text-white/70 transition-colors"
                  aria-label="Clear search"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div
              className="flex items-center gap-2 overflow-x-auto flex-1 min-w-0"
              style={{ scrollbarWidth: "none" }}
            >
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  id={`filter-${cat.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex-none flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    selectedCategory === cat
                      ? "bg-teal-500 text-white shadow-lg shadow-teal-500/25"
                      : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/10 hover:border-white/20"
                  }`}
                >
                  <span>{CATEGORY_ICONS[cat]}</span>
                  <span className="whitespace-nowrap">{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      selectedCategory === cat
                        ? "bg-white/20 text-white"
                        : "bg-white/10 text-white/50"
                    }`}
                  >
                    {categoryCount(cat)}
                  </span>
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex-none">
              <select
                id="sort-products"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white/80 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-teal-500/50 cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-cyan-900 text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════ Content ════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 py-10">

        {/* Results bar */}
        <motion.div layout className="flex items-center justify-between mb-7">
          <p className="text-white/50 text-sm">
            Showing{" "}
            <span className="text-white font-semibold">{filteredProducts.length}</span>{" "}
            of{" "}
            <span className="text-white font-semibold">{products.length}</span>{" "}
            products
            {selectedCategory !== "All" && (
              <span className="text-teal-400"> in {selectedCategory}</span>
            )}
            {searchTerm && (
              <span className="text-white/40"> for &ldquo;{searchTerm}&rdquo;</span>
            )}
          </p>

          {hasActiveFilters && (
            <motion.button
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={clearAll}
              className="text-xs text-teal-400 hover:text-teal-300 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filters
            </motion.button>
          )}
        </motion.div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center items-center py-20"
            >
              <div className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
            </motion.div>
          ) : filteredProducts.length > 0 ? (
            <motion.div
              key="grid"
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              <AnimatePresence>
                {filteredProducts.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} />
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            /* ── Empty State ── */
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
              className="text-center py-28"
            >
              <div className="text-7xl mb-5 select-none">🔍</div>
              <h3 className="text-2xl font-bold text-white mb-2">No products found</h3>
              <p className="text-white/45 mb-8 max-w-sm mx-auto">
                We couldn&apos;t find anything matching your search. Try adjusting the filters.
              </p>
              <button
                onClick={clearAll}
                className="px-7 py-3 border border-teal-500 text-teal-400 font-semibold rounded-full hover:bg-teal-500/10 transition-colors"
              >
                Clear All Filters
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProductsPage;
