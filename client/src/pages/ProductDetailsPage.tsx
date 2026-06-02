import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BADGE_STYLES,
  CATEGORY_ICONS,
  type Cut,
  type Product,
} from "../data/products";
import { useCart } from "../context/CartContext";
import { getProductById, getCatalog } from "../lib/api";

// ─── Star Rating ──────────────────────────────────────────────────────────────
const StarRating = ({ rating, size = "md" }: { rating: number; size?: "sm" | "md" }) => {
  const cls = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${cls} ${
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
};

// ─── Wave Divider ─────────────────────────────────────────────────────────────
const WaveDivider = () => (
  <div className="w-full overflow-hidden leading-[0] my-10 opacity-60">
    <svg
      viewBox="0 0 1200 48"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full"
      preserveAspectRatio="none"
    >
      <path
        d="M0,24 C150,48 350,0 600,24 C850,48 1050,0 1200,24 L1200,48 L0,48 Z"
        className="fill-teal-500/8"
      />
      <path
        d="M0,32 C200,12 400,48 600,32 C800,16 1000,48 1200,32 L1200,48 L0,48 Z"
        className="fill-cyan-500/5"
      />
    </svg>
  </div>
);

// ─── Feature Pills ────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: "🐟", title: "Fresh Today", desc: "Same-day sourced" },
  { icon: "🚚", title: "Fast Delivery", desc: "2-hour doorstep" },
  { icon: "✅", title: "Hand Inspected", desc: "Quality assured" },
];

// ─── Nutrition Icons ──────────────────────────────────────────────────────────
const NUTRITION_ICONS = ["💪", "🔬", "🧬", "⚡"];

// ─── Related Product Card ─────────────────────────────────────────────────────
const RelatedCard = ({ product }: { product: Product }) => (
  <Link
    to={`/products/${product.id}`}
    className="group flex gap-0 bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-teal-500/40 hover:shadow-xl hover:shadow-teal-500/10 transition-all duration-300"
  >
    {/* Thumbnail */}
    <div className="relative w-28 shrink-0 overflow-hidden bg-cyan-900/40">
      <img
        src={product.image}
        alt={product.name}
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://placehold.co/200x200/0e7490/e0f2fe?text=${encodeURIComponent(product.name)}`;
        }}
      />
    </div>
    {/* Info */}
    <div className="py-3 px-4 flex flex-col justify-center">
      <span className="text-[10px] text-white/35 uppercase tracking-wider mb-0.5">
        {product.category}
      </span>
      <h4 className="text-sm font-semibold text-white group-hover:text-teal-400 transition-colors leading-snug">
        {product.name}
      </h4>
      <div className="flex items-center gap-1 mt-1">
        <StarRating rating={product.rating} size="sm" />
        <span className="text-xs text-white/40">{product.rating}</span>
      </div>
      <span className="text-sm font-bold text-teal-400 mt-1.5">
        from ₹{product.priceRange.min.toFixed(2)}
        <span className="text-xs text-white/35 font-normal">/{product.unit}</span>
      </span>
    </div>
  </Link>
);

// ─── Not Found ────────────────────────────────────────────────────────────────
const NotFound = () => (
  <div className="min-h-screen bg-cyan-950 flex items-center justify-center text-center px-4">
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-7xl mb-5 select-none">🐟</div>
      <h1 className="text-3xl font-black text-white mb-3">Product Not Found</h1>
      <p className="text-white/50 mb-8 max-w-sm mx-auto leading-relaxed">
        This product doesn&apos;t exist or may have been removed from our catalogue.
      </p>
      <Link
        to="/products"
        className="inline-flex items-center gap-2 px-8 py-3.5 bg-teal-500 hover:bg-teal-400 text-white rounded-2xl font-bold transition-colors shadow-lg shadow-teal-500/25"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Browse All Products
      </Link>
    </motion.div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const ProductDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCut, setSelectedCut] = useState<Cut | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [cartAdded, setCartAdded] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        // Fetch current product
        const prodRes = await getProductById(id);
        const p = prodRes.data.product;
        
        const mappedProduct: Product = {
          id: p._id,
          name: p.name,
          category: p.category,
          price: p.minPrice,
          priceRange: { min: p.minPrice, max: p.maxPrice },
          unit: p.unit || "kg",
          rating: 4.8,
          reviews: Math.floor(Math.random() * 200) + 50,
          badge: "",
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
        };

        setProduct(mappedProduct);
        if (mappedProduct.cuts?.length) {
          setSelectedCut(mappedProduct.cuts[0]);
        } else {
          setSelectedCut(null);
        }

        // Fetch catalog for related products
        const catRes = await getCatalog();
        const mappedRelated = catRes.data.products
          .filter((cp: any) => cp.category === mappedProduct.category && cp._id !== mappedProduct.id)
          .slice(0, 3)
          .map((cp: any) => ({
            id: cp._id,
            name: cp.name,
            category: cp.category,
            price: cp.minPrice,
            priceRange: { min: cp.minPrice, max: cp.maxPrice },
            unit: cp.unit || "kg",
            rating: 4.5,
            reviews: 50,
            description: cp.description || "Fresh product",
            longDescription: cp.description || "",
            image: cp.image?.startsWith('/uploads') ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${cp.image}` : (cp.image || "https://placehold.co/600x400/0e7490/e0f2fe?text=No+Image"),
            cuts: [],
            origin: "Local",
            nutritionHighlights: []
          }));
        
        setRelatedProducts(mappedRelated);
      } catch (err) {
        console.error(err);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    setQuantity(1);
    setNotes("");
    setCartAdded(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    
    // Default to the first cut if none selected but cuts exist
    const cutToUse = selectedCut || product.cuts?.[0];
    const price = cutToUse && cutToUse.price > 0 ? cutToUse.price : product.priceRange.min;
    
    addToCart({
      productId: String(product.id),
      name: product.name,
      price: price,
      quantity: quantity,
      image: product.image,
      category: product.category,
      cutName: cutToUse?.name,
      notes: notes.trim() || undefined,
      unit: product.unit,
    });

    setCartAdded(true);
    setTimeout(() => setCartAdded(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cyan-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) return <NotFound />;

  return (
    <div className="min-h-screen bg-cyan-950">

      {/* ═══════════════════════ Breadcrumb ═══════════════════════ */}
      <div className="bg-gradient-to-r from-cyan-900/60 to-teal-900/20 border-b border-white/5 py-3.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-white/50 hover:text-teal-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <span className="text-white/20">/</span>
          <Link to="/products" className="text-white/40 hover:text-teal-400 transition-colors">
            Products
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-white/30">{product.category}</span>
          <span className="text-white/20">/</span>
          <span className="text-white/70 truncate max-w-[180px] font-medium">
            {product.name}
          </span>
        </div>
      </div>

      {/* ═══════════════════════ Main Hero ═══════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 py-10 lg:py-14">
        <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-start">

          {/* ══ LEFT: Image Panel ══ */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            {/* Hero Image */}
            <div className="relative rounded-3xl overflow-hidden aspect-square bg-cyan-900/40 ring-1 ring-white/10 shadow-2xl shadow-cyan-950">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://placehold.co/800x800/0e7490/e0f2fe?text=${encodeURIComponent(product.name)}`;
                }}
              />

              {/* Bottom gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-cyan-950/75 via-transparent to-transparent" />
              {/* Teal tint overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-cyan-500/5" />

              {/* Top Left — Badge */}
              {product.badge && (
                <span
                  className={`absolute top-4 left-4 text-sm font-bold px-3.5 py-1.5 rounded-full shadow-lg ${
                    BADGE_STYLES[product.badge] ?? "bg-white text-black"
                  }`}
                >
                  {product.badge}
                </span>
              )}

              {/* Top Right — Category */}
              <span className="absolute top-4 right-4 flex items-center gap-1.5 bg-cyan-950/80 backdrop-blur-sm text-white/90 text-sm font-medium px-3.5 py-1.5 rounded-full">
                <span>{CATEGORY_ICONS[product.category]}</span>
                <span>{product.category}</span>
              </span>

              {/* Bottom — Freshness Strip */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-black/45 backdrop-blur-md rounded-2xl px-4 py-3 flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <div className="absolute inset-0 rounded-full bg-emerald-400/40 animate-ping" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-white font-semibold text-sm">
                      Fresh Today
                    </span>
                    <span className="text-white/50 text-xs ml-2 truncate">
                      — {product.origin}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Cards Row */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center hover:border-teal-500/30 hover:bg-teal-500/5 transition-all"
                >
                  <div className="text-2xl mb-1.5">{f.icon}</div>
                  <div className="text-xs font-bold text-white">{f.title}</div>
                  <div className="text-[10px] text-white/35 mt-0.5">{f.desc}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ══ RIGHT: Info Panel ══ */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
          >
            {/* Category + Badge pills */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="flex items-center gap-1.5 bg-teal-500/15 border border-teal-500/25 text-teal-400 text-xs font-bold px-3.5 py-1.5 rounded-full">
                {CATEGORY_ICONS[product.category]}&nbsp;{product.category}
              </span>
              {product.badge && (
                <span
                  className={`text-xs font-bold px-3.5 py-1.5 rounded-full ${
                    BADGE_STYLES[product.badge] ?? ""
                  }`}
                >
                  {product.badge}
                </span>
              )}
            </div>

            {/* Product Name */}
            <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-3">
              {product.name}
            </h1>

            {/* Rating Row */}
            <div className="flex items-center gap-2.5 mb-5">
              <StarRating rating={product.rating} />
              <span className="text-base font-bold text-amber-400">
                {product.rating}
              </span>
              <span className="text-sm text-white/40">
                ({product.reviews.toLocaleString()} reviews)
              </span>
            </div>

            {/* Short description */}
            <p className="text-white/60 leading-relaxed text-base mb-4">
              {product.description}
            </p>

            {/* Origin */}
            <div className="flex items-center gap-2 text-sm text-white/35 mb-6">
              <span className="text-base">📍</span>
              <span>Sourced from {product.origin}</span>
            </div>

            {/* Divider */}
            <div className="border-t border-white/8 mb-6" />

            {/* ── Price Range Panel ── */}
            <div className="relative bg-gradient-to-br from-teal-500/12 to-cyan-500/5 border border-teal-500/20 rounded-2xl p-5 mb-6 overflow-hidden">
              {/* Decorative blob */}
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

              <p className="text-xs text-white/40 uppercase tracking-widest mb-1.5">
                Expected Price Range
              </p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-black text-teal-400">
                  ₹{product.priceRange.min.toFixed(2)}
                </span>
                <span className="text-white/30 font-medium text-lg">—</span>
                <span className="text-2xl font-black text-teal-300">
                  ₹{product.priceRange.max.toFixed(2)}
                </span>
                <span className="text-sm text-white/35 font-medium ml-0.5">
                  /{product.unit}
                </span>
              </div>
              <p className="text-xs text-white/30">Price varies by cut selection below</p>

              {/* Selected cut price */}
              <AnimatePresence mode="wait">
                {selectedCut && (
                  <motion.div
                    key={selectedCut.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between"
                  >
                    <div className="text-sm">
                      <span className="text-white/35">Selected: </span>
                      <span className="font-semibold text-teal-300">
                        {selectedCut.name}
                      </span>
                    </div>
                    <span className="text-xl font-black text-teal-400">
                      ₹{selectedCut.price > 0 ? selectedCut.price.toFixed(2) : product.priceRange.min.toFixed(2)}
                      <span className="text-sm text-white/35 font-normal">
                        /{product.unit}
                      </span>
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Available Cuts ── */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-white/55 uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="text-sm">🔪</span>
                Available Cuts
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {product.cuts.map((cut) => (
                  <button
                    key={cut.id}
                    id={`cut-${cut.id}`}
                    onClick={() => setSelectedCut(cut)}
                    className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                      selectedCut?.id === cut.id
                        ? "border-teal-500 bg-teal-500/15 shadow-md shadow-teal-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
                    }`}
                  >
                    <div
                      className={`font-semibold text-sm leading-snug ${
                        selectedCut?.id === cut.id ? "text-white" : "text-white/65"
                      }`}
                    >
                      {cut.name}
                    </div>
                    <div className="text-xs text-white/35 mt-0.5 line-clamp-1">
                      {cut.description}
                    </div>
                    <div
                      className={`text-sm font-black mt-2 ${
                        selectedCut?.id === cut.id
                          ? "text-teal-400"
                          : "text-white/35"
                      }`}
                    >
                      ₹{cut.price > 0 ? cut.price.toFixed(2) : product.priceRange.min.toFixed(2)}
                      <span className="text-xs font-normal">/{product.unit}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Customization (Quantity & Notes) ── */}
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/55 uppercase tracking-widest mb-2">
                  Quantity
                </label>
                <div className="inline-flex items-center bg-cyan-950/50 rounded-xl p-1.5 border border-white/10">
                  <button
                    onClick={() => setQuantity((q) => {
                      if (product.unit === "kg") {
                        const next = q - 0.1;
                        return next >= 0.1 ? Number(next.toFixed(1)) : 0.1;
                      }
                      return Math.max(1, q - 1);
                    })}
                    className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-lg font-medium"
                  >
                    -
                  </button>
                  <span className="w-16 text-center font-bold text-white text-sm">
                    {product.unit === "kg" 
                      ? (quantity < 1 ? `${Math.round(quantity * 1000)}g` : `${quantity}kg`) 
                      : quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => {
                      if (product.unit === "kg") {
                        const next = q + 0.1;
                        return next <= 5.0 ? Number(next.toFixed(1)) : 5.0;
                      }
                      return q + 1;
                    })}
                    className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-lg font-medium"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="block text-xs font-bold text-white/55 uppercase tracking-widest mb-2">
                  Special Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Extra ice, specific cleaning instructions..."
                  className="w-full bg-cyan-950/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-teal-500/50 transition-colors resize-none h-20"
                />
              </div>
            </div>

            {/* ── Add to Cart CTA ── */}
            <motion.button
              id="add-to-cart-detail"
              onClick={handleAddToCart}
              whileTap={{ scale: 0.97 }}
              className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-200 flex items-center justify-center gap-2.5 ${
                cartAdded
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                  : "bg-teal-500 hover:bg-teal-400 text-white shadow-xl shadow-teal-500/30 hover:shadow-teal-400/30"
              }`}
            >
              <AnimatePresence mode="wait" initial={false}>
                {cartAdded ? (
                  <motion.span
                    key="added"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Added to Cart!
                  </motion.span>
                ) : (
                  <motion.span
                    key="cart"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Add to Cart
                    {selectedCut && (
                      <span className="text-sm opacity-75 font-medium">
                        · {selectedCut.name}
                      </span>
                    )}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </motion.div>
        </div>

        {/* ═══════════════════════ Wave ═══════════════════════ */}
        <WaveDivider />

        {/* ═══════════════════════ About Section ═══════════════════════ */}
        <motion.section
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/25 flex items-center justify-center text-base">
              🌊
            </div>
            <h2 className="text-2xl font-bold text-white">About This Product</h2>
          </div>
          <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-6 md:p-8">
            <p className="text-white/65 leading-[1.9] text-base">
              {product.longDescription}
            </p>
          </div>
        </motion.section>

        {/* ═══════════════════════ Nutrition ═══════════════════════ */}
        <motion.section
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mt-10"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/25 flex items-center justify-center text-base">
              💊
            </div>
            <h2 className="text-xl font-bold text-white">Nutrition Highlights</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {product.nutritionHighlights.map((highlight, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="group bg-white/[0.04] border border-white/8 rounded-2xl p-5 text-center hover:border-teal-500/30 hover:bg-teal-500/5 transition-all cursor-default"
              >
                <div className="text-3xl mb-2.5 group-hover:scale-110 transition-transform">
                  {NUTRITION_ICONS[i]}
                </div>
                <div className="text-sm text-white/65 font-medium leading-snug">
                  {highlight}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ═══════════════════════ Wave 2 ═══════════════════════ */}
        {relatedProducts.length > 0 && <WaveDivider />}

        {/* ═══════════════════════ Related Products ═══════════════════════ */}
        {relatedProducts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/25 flex items-center justify-center text-base">
                  {CATEGORY_ICONS[product.category]}
                </div>
                <h2 className="text-xl font-bold text-white">
                  More {product.category}
                </h2>
              </div>
              <Link
                to="/products"
                onClick={() => window.scrollTo(0, 0)}
                className="text-sm text-teal-400 hover:text-teal-300 transition-colors flex items-center gap-1"
              >
                View All
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedProducts.map((rp, i) => (
                <motion.div
                  key={rp.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                >
                  <RelatedCard product={rp} />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
};

export default ProductDetailsPage;
