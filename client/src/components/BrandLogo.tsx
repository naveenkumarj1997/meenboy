type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeMap = {
  sm: { text: "text-lg" },
  md: { text: "text-xl sm:text-2xl" },
  lg: { text: "text-2xl" }
};

/** Shiny FISHFRIENDLY wordmark */
const BrandLogo = ({ size = "md", className = "" }: BrandLogoProps) => {
  const s = sizeMap[size];

  return (
    <span className={`inline-flex items-center ${className}`}>
      <span className={`brand-logo-text ${s.text} font-black tracking-wider uppercase leading-none`}>
        FISHFRIENDLY
      </span>
    </span>
  );
};

export default BrandLogo;
