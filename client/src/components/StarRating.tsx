type StarRatingProps = {
  value: number;
  onChange?: (next: number) => void;
  size?: "sm" | "md" | "lg";
};

const StarRating = ({ value, onChange, size = "md" }: StarRatingProps) => {
  const cls = size === "lg" ? "text-2xl sm:text-3xl" : size === "sm" ? "text-base" : "text-xl";
  return (
    <div className={`flex items-center gap-0.5 ${onChange ? "cursor-pointer" : ""}`} role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={`${cls} leading-none ${n <= value ? "text-amber-400" : "text-slate-300"} ${onChange ? "hover:scale-110" : "cursor-default"} disabled:cursor-default`}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
};

export default StarRating;
