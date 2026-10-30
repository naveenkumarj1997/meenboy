import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getPublicCustomerReviews, type CustomerReviewPayload } from "../lib/api";
import StarRating from "./StarRating";

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const HomeReviews = () => {
  const [reviews, setReviews] = useState<CustomerReviewPayload[]>([]);

  useEffect(() => {
    let cancelled = false;
    getPublicCustomerReviews()
      .then((res) => {
        if (!cancelled) setReviews(res.reviews || []);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const avg = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length;
  }, [reviews]);

  if (reviews.length === 0) return null;

  const avgLabel = avg.toFixed(1);

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-br from-cyan-950 via-teal-950 to-cyan-900 py-20 sm:py-24 px-4 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-10 h-80 w-80 rounded-full bg-teal-400/25 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-[size:22px_22px]" />

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center mb-10 sm:mb-14">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-400/15 px-4 py-1.5 text-amber-200 text-xs sm:text-sm font-bold uppercase tracking-[0.2em] mb-5 shadow-[0_0_24px_rgba(251,191,36,0.25)]">
            <span className="text-amber-300 text-base leading-none">★</span>
            Loved by our customers
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg">
            What families say about FISHFRIENDLY
          </h2>
          <p className="mt-4 text-cyan-100/90 text-base sm:text-lg max-w-2xl mx-auto">
            Honest reviews from people who order our catch every week.
          </p>
          <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 px-5 py-3">
            <StarRating value={Math.round(avg)} size="lg" />
            <div className="text-left">
              <p className="text-white text-2xl font-black leading-none">{avgLabel}</p>
              <p className="text-amber-200 text-xs font-semibold mt-1">
                {reviews.length} customer {reviews.length === 1 ? "review" : "reviews"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible sm:pb-0">
          {reviews.map((r, i) => (
            <motion.article
              key={r._id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.08, 0.32) }}
              className="relative snap-center shrink-0 w-[85vw] max-w-sm sm:w-auto sm:max-w-none rounded-3xl bg-white p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.25)] border-2 border-amber-200/80 flex flex-col gap-4"
            >
              <span className="absolute top-3 right-5 text-7xl leading-none font-serif text-teal-100 select-none" aria-hidden>
                “
              </span>
              <div className="flex items-center justify-between gap-2 relative z-10">
                <StarRating value={r.rating} size="md" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
                  Verified customer
                </span>
              </div>
              <p className="relative z-10 text-cyan-950 text-lg leading-relaxed font-medium flex-1">
                {r.review}
              </p>
              <div className="relative z-10 flex items-center gap-3 pt-2 border-t border-slate-100">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 text-white font-black flex items-center justify-center shadow-md shadow-teal-500/30">
                  {initials(r.name)}
                </div>
                <div>
                  <p className="font-black text-cyan-950 text-lg leading-tight">{r.name}</p>
                  {r.place ? <p className="text-sm text-teal-700 font-medium">{r.place}</p> : <p className="text-sm text-slate-500">FISHFRIENDLY customer</p>}
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeReviews;
