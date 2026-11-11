import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getPublicCustomerReviews, type CustomerReviewPayload } from "../lib/api";
import StarRating from "./StarRating";

const SLIDE_MS = 5000;

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const slide = {
  enter: (dir: number) => ({ x: dir > 0 ? 72 : -72, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -72 : 72, opacity: 0 })
};

const HomeReviews = () => {
  const [reviews, setReviews] = useState<CustomerReviewPayload[]>([]);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);

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

  const count = reviews.length;

  useEffect(() => {
    if (count <= 1 || paused) return;
    const timer = window.setInterval(() => {
      setDir(1);
      setIndex((i) => (i + 1) % count);
    }, SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  const avg = useMemo(() => {
    if (count === 0) return 0;
    return reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / count;
  }, [reviews, count]);

  if (count === 0) return null;

  const current = reviews[index] || reviews[0];
  const avgLabel = avg.toFixed(1);

  const goTo = (next: number, direction: number) => {
    if (count <= 1) return;
    setDir(direction);
    setIndex((next + count) % count);
  };

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
                {count} customer {count === 1 ? "review" : "reviews"}
              </p>
            </div>
          </div>
        </div>

        <div
          className="relative mx-auto max-w-3xl px-0 sm:px-14"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          {count > 1 ? (
            <button
              type="button"
              aria-label="Previous review"
              onClick={() => goTo(index - 1, -1)}
              className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full bg-white/15 hover:bg-white/30 text-white border border-white/25 backdrop-blur-sm items-center justify-center text-2xl leading-none"
            >
              ‹
            </button>
          ) : null}

          <div className="relative min-h-[280px] overflow-hidden">
            <AnimatePresence initial={false} custom={dir} mode="wait">
              <motion.article
                key={current._id}
                custom={dir}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="relative rounded-3xl bg-white p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.25)] border-2 border-amber-200/80 flex flex-col gap-4"
              >
                <span className="absolute top-3 right-5 text-7xl leading-none font-serif text-teal-100 select-none" aria-hidden>
                  “
                </span>
                <div className="flex items-center justify-between gap-2 relative z-10">
                  <StarRating value={current.rating} size="md" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
                    Verified customer
                  </span>
                </div>
                <p className="relative z-10 text-cyan-950 text-lg sm:text-xl leading-relaxed font-medium min-h-[4.5rem]">
                  {current.review}
                </p>
                <div className="relative z-10 flex items-center gap-3 pt-2 border-t border-slate-100">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 text-white font-black flex items-center justify-center shadow-md shadow-teal-500/30">
                    {initials(current.name)}
                  </div>
                  <div>
                    <p className="font-black text-cyan-950 text-lg leading-tight">{current.name}</p>
                    {current.place ? (
                      <p className="text-sm text-teal-700 font-medium">{current.place}</p>
                    ) : (
                      <p className="text-sm text-slate-500">FISHFRIENDLY customer</p>
                    )}
                  </div>
                </div>
              </motion.article>
            </AnimatePresence>
          </div>

          {count > 1 ? (
            <button
              type="button"
              aria-label="Next review"
              onClick={() => goTo(index + 1, 1)}
              className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full bg-white/15 hover:bg-white/30 text-white border border-white/25 backdrop-blur-sm items-center justify-center text-2xl leading-none"
            >
              ›
            </button>
          ) : null}

          {count > 1 ? (
            <div className="flex justify-center gap-2 mt-6" role="tablist" aria-label="Review slides">
              {reviews.map((r, i) => (
                <button
                  key={r._id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Show review ${i + 1}`}
                  onClick={() => goTo(i, i > index ? 1 : -1)}
                  className={`h-2.5 rounded-full transition-all ${
                    i === index ? "w-8 bg-amber-300" : "w-2.5 bg-white/35 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default HomeReviews;
