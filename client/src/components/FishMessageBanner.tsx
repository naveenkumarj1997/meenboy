import { motion, useReducedMotion } from "framer-motion";

type FishMessageBannerProps = {
  message: string;
};

/** Slow sky helicopter flying right→left, towing a banner behind. */
export default function FishMessageBanner({ message }: FishMessageBannerProps) {
  const text = String(message || "").trim();
  const reduceMotion = useReducedMotion();

  if (!text) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-[5%] sm:top-[7%] z-[15] overflow-hidden h-40 sm:h-44"
      aria-live="polite"
    >
      <motion.div
        className="absolute top-3 flex items-center will-change-transform"
        initial={reduceMotion ? { left: "20%" } : { left: "112%" }}
        animate={
          reduceMotion
            ? { left: "20%", y: 0 }
            : {
                left: ["112%", "-75%"],
                y: [0, -6, 4, -3, 0]
              }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                left: { duration: 36, ease: "linear", repeat: Infinity },
                y: { duration: 4.5, ease: "easeInOut", repeat: Infinity }
              }
        }
      >
        {/* Helicopter facing left (leading) */}
        <div className="relative z-10 shrink-0 drop-shadow-[0_10px_16px_rgba(0,0,0,0.45)] -scale-x-100">
          <svg
            viewBox="0 0 160 90"
            className="w-24 h-14 sm:w-28 sm:h-16"
            aria-hidden
          >
            <defs>
              <linearGradient id="heliBody" x1="40" y1="20" x2="130" y2="70">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="50%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>
              <linearGradient id="heliGlass" x1="100" y1="30" x2="140" y2="55">
                <stop offset="0%" stopColor="#7dd3fc" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
            </defs>

            <ellipse cx="85" cy="82" rx="42" ry="4" fill="#000" opacity="0.2" />

            <motion.g
              animate={reduceMotion ? undefined : { rotate: 360 }}
              transition={
                reduceMotion
                  ? undefined
                  : { duration: 0.28, ease: "linear", repeat: Infinity }
              }
              style={{ transformOrigin: "78px 22px" }}
            >
              <ellipse cx="78" cy="22" rx="52" ry="3.5" fill="#cbd5e1" opacity="0.85" />
              <rect x="26" y="20.5" width="104" height="3" rx="1.5" fill="#f8fafc" opacity="0.7" />
            </motion.g>
            <circle cx="78" cy="22" r="4" fill="#334155" />

            <path d="M55 48 L12 42 L10 46 L55 52 Z" fill="#64748b" />
            <motion.g
              animate={reduceMotion ? undefined : { rotate: -360 }}
              transition={
                reduceMotion
                  ? undefined
                  : { duration: 0.18, ease: "linear", repeat: Infinity }
              }
              style={{ transformOrigin: "12px 44px" }}
            >
              <ellipse cx="12" cy="44" rx="2" ry="10" fill="#e2e8f0" opacity="0.9" />
            </motion.g>
            <circle cx="12" cy="44" r="2.5" fill="#334155" />

            <ellipse cx="95" cy="50" rx="38" ry="18" fill="url(#heliBody)" />
            <path
              d="M108 38 Q128 36 138 48 Q128 58 108 56 Z"
              fill="url(#heliGlass)"
              opacity="0.95"
            />
            <path
              d="M70 66 L70 72 M118 66 L118 72 M62 72 H126"
              stroke="#334155"
              strokeWidth="2.2"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M70 52 H120"
              stroke="#14b8a6"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.9"
            />
          </svg>
        </div>

        {/* Tow rope — heli pulls banner from behind (right side) */}
        <svg
          viewBox="0 0 56 40"
          className="w-12 h-9 sm:w-14 sm:h-10 -ml-1 shrink-0 overflow-visible"
          aria-hidden
        >
          <motion.path
            d="M4 18 Q18 10 28 20 Q40 30 54 18"
            fill="none"
            stroke="#fcd34d"
            strokeWidth="2"
            strokeLinecap="round"
            animate={
              reduceMotion
                ? undefined
                : {
                    d: [
                      "M4 18 Q18 10 28 20 Q40 30 54 18",
                      "M4 18 Q20 26 28 16 Q38 8 54 20",
                      "M4 18 Q18 10 28 20 Q40 30 54 18"
                    ]
                  }
            }
            transition={
              reduceMotion
                ? undefined
                : { duration: 2.8, ease: "easeInOut", repeat: Infinity }
            }
          />
          <circle cx="4" cy="18" r="2" fill="#f59e0b" />
          <circle cx="54" cy="18" r="2" fill="#f59e0b" />
        </svg>

        {/* Banner trailing on the right (behind heli) */}
        <motion.div
          className="relative -ml-1 max-w-[min(72vw,22rem)] sm:max-w-md shrink-0"
          style={{ transformOrigin: "left center" }}
          animate={
            reduceMotion
              ? { rotate: -1 }
              : {
                  rotate: [-2, 1.5, -2.5, 0, -2],
                  y: [0, 3, -2, 2, 0]
                }
          }
          transition={
            reduceMotion
              ? undefined
              : { duration: 3.2, ease: "easeInOut", repeat: Infinity }
          }
        >
          <div className="relative rounded-sm bg-gradient-to-b from-white via-slate-50 to-cyan-50 border border-slate-300/90 px-4 py-2.5 shadow-[0_10px_24px_rgba(15,23,42,0.35)]">
            <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-400/95" aria-hidden />
            <span className="absolute right-0 top-0 bottom-0 w-1.5 bg-amber-400/95" aria-hidden />
            <p className="text-left text-[11px] sm:text-sm font-bold text-slate-900 leading-snug px-1 pointer-events-auto">
              {text}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
