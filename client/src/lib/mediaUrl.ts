const API_ORIGIN =
  (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "") ||
  "http://localhost:5000";

/** Turn a Google Drive share/view link into a direct-ish image URL (still often blocked). */
export const normalizeExternalImageUrl = (raw: string) => {
  const s = String(raw || "").trim();
  if (!s) return "";
  const driveId =
    s.match(/drive\.google\.com\/file\/d\/([^/?#]+)/)?.[1] ||
    (s.includes("drive.google.com") ? s.match(/[?&]id=([^&]+)/)?.[1] : null);
  if (driveId) {
    return `https://drive.google.com/uc?export=view&id=${driveId}`;
  }
  return s;
};

export const mediaUrl = (path?: string | null) => {
  if (!path) return "";
  const normalized = normalizeExternalImageUrl(path);
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) return normalized;
  if (normalized.startsWith("/uploads") || normalized.startsWith("/api/")) return `${API_ORIGIN}${normalized}`;
  return normalized;
};
