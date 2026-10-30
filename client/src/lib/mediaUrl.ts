const API_ORIGIN =
  (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "") ||
  "http://localhost:5000";

export const mediaUrl = (path?: string | null) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/uploads")) return `${API_ORIGIN}${path}`;
  return path;
};
