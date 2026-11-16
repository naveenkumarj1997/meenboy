import { Component, useEffect, useRef, type ErrorInfo, type ReactNode } from "react";
import type { PartnerLiveMapRow } from "../lib/api";

type LeafletNS = {
  map: (el: HTMLElement, opts?: object) => LeafletMap;
  tileLayer: (url: string, opts?: object) => { addTo: (map: LeafletMap) => unknown };
  layerGroup: () => LeafletLayerGroup;
  marker: (latlng: [number, number], opts?: object) => LeafletMarker;
  polyline: (latlngs: [number, number][], opts?: object) => { addTo: (layer: LeafletLayerGroup) => unknown };
  divIcon: (opts: object) => unknown;
  latLngBounds: (latlngs: [number, number][]) => { pad: (n: number) => unknown };
};

type LeafletMap = {
  setView: (latlng: [number, number], zoom: number) => LeafletMap;
  remove: () => void;
  invalidateSize: () => void;
  fitBounds: (bounds: unknown, opts?: object) => void;
  panTo: (latlng: [number, number]) => void;
  _loaded?: boolean;
};

type LeafletLayerGroup = {
  addTo: (map: LeafletMap) => LeafletLayerGroup;
  clearLayers: () => void;
};

type LeafletMarker = {
  addTo: (layer: LeafletLayerGroup) => LeafletMarker;
  on: (ev: string, fn: () => void) => void;
  bindTooltip: (text: string, opts?: object) => void;
};

const MADURAI: [number, number] = [9.9252, 78.1198];
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

const toCoord = (lat: unknown, lng: unknown): [number, number] | null => {
  if (lat == null || lng == null) return null;
  const a = typeof lat === "number" ? lat : Number(lat);
  const b = typeof lng === "number" ? lng : Number(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a < -90 || a > 90 || b < -180 || b > 180) return null;
  if (a === 0 && b === 0) return null;
  return [a, b];
};

const loadLeaflet = (): Promise<LeafletNS> => {
  const existing = (window as unknown as { L?: LeafletNS }).L;
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve, reject) => {
    if (!document.querySelector(`link[data-leaflet-css]`)) {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = LEAFLET_CSS;
      css.setAttribute("data-leaflet-css", "1");
      document.head.appendChild(css);
    }
    const ready = () => {
      const L = (window as unknown as { L?: LeafletNS }).L;
      if (L) resolve(L);
      else reject(new Error("Map library failed to load"));
    };
    const prev = document.querySelector(`script[data-leaflet-js]`) as HTMLScriptElement | null;
    if (prev) {
      if ((window as unknown as { L?: LeafletNS }).L) {
        ready();
        return;
      }
      prev.addEventListener("load", ready);
      prev.addEventListener("error", () => reject(new Error("Map library failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.setAttribute("data-leaflet-js", "1");
    script.onload = ready;
    script.onerror = () => reject(new Error("Map library failed to load"));
    document.body.appendChild(script);
  });
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("") || "?";

const pinHtml = (partner: PartnerLiveMapRow, selected: boolean, stale: boolean) => {
  const live = partner.tripStatus === "active" && !stale;
  const bg = live ? "#14b8a6" : stale ? "#f59e0b" : "#64748b";
  const ring = selected ? "3px solid #f8fafc" : "2px solid rgba(15,23,42,0.85)";
  return `<div style="
    width:32px;height:32px;border-radius:999px;background:${bg};
    border:${ring};box-shadow:0 6px 16px rgba(0,0,0,.35);
    display:flex;align-items:center;justify-content:center;
    color:#fff;font:700 11px/1 Inter,system-ui,sans-serif;
    transform:translate(-50%,-50%);
  ">${initials(partner.name)}</div>`;
};

const isStale = (capturedAt?: string | null) => {
  if (!capturedAt) return true;
  const t = new Date(capturedAt).getTime();
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > 5 * 60 * 1000;
};

const mapIsReady = (map: LeafletMap | null) => Boolean(map && map._loaded !== false);

const drawMarkers = (
  L: LeafletNS,
  map: LeafletMap,
  layer: LeafletLayerGroup,
  partners: PartnerLiveMapRow[],
  selectedId: string | null,
  fittedRef: { current: boolean },
  lastSelectedRef: { current: string | null },
  onSelect: (id: string) => void
) => {
  if (!mapIsReady(map)) return;
  try {
    layer.clearLayers();
    const bounds: [number, number][] = [];

    for (const partner of partners) {
      const latlng = toCoord(partner.lat, partner.lng);
      if (!latlng) continue;
      bounds.push(latlng);
      const stale = isStale(partner.capturedAt);
      const trail = Array.isArray(partner.trail)
        ? partner.trail
            .map((pt) => toCoord(pt?.lat, pt?.lng))
            .filter((pt): pt is [number, number] => Boolean(pt))
        : [];
      if (trail.length > 1) {
        L.polyline(trail, {
          color: partner.id === selectedId ? "#0f766e" : "#5eead4",
          weight: partner.id === selectedId ? 4 : 3,
          opacity: 0.75
        }).addTo(layer);
      }
      const marker = L.marker(latlng, {
        icon: L.divIcon({
          className: "partner-live-pin",
          html: pinHtml(partner, partner.id === selectedId, stale),
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        }),
        zIndexOffset: partner.id === selectedId ? 1000 : 0
      });
      marker.on("click", () => onSelect(partner.id));
      marker.bindTooltip(partner.name || "Partner", { direction: "top", offset: [0, -16] });
      marker.addTo(layer);
    }

    if (!fittedRef.current && bounds.length) {
      map.fitBounds(L.latLngBounds(bounds).pad(0.25), { maxZoom: 14, animate: false });
      fittedRef.current = true;
    } else if (selectedId && selectedId !== lastSelectedRef.current) {
      const selected = partners.find((p) => p.id === selectedId);
      const pan = selected ? toCoord(selected.lat, selected.lng) : null;
      if (pan) map.panTo(pan);
    }
    lastSelectedRef.current = selectedId;
    map.invalidateSize();
  } catch {
    /* keep the page usable if a GPS row is malformed */
  }
};

type Props = {
  partners: PartnerLiveMapRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const PartnerLiveMapInner = ({ partners, selectedId, onSelect }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LeafletLayerGroup | null>(null);
  const fittedRef = useRef(false);
  const lastSelectedRef = useRef<string | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const partnersRef = useRef(partners);
  partnersRef.current = partners;
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;

  useEffect(() => {
    let cancelled = false;
    let resize: (() => void) | null = null;
    const timers: number[] = [];

    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: true,
          tapTolerance: 20,
          bounceAtZoomLimits: false
        }).setView(MADURAI, 12);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);
        const layer = L.layerGroup().addTo(map);
        layerRef.current = layer;
        mapRef.current = map;
        resize = () => {
          if (mapRef.current === map && mapIsReady(map)) {
            try {
              map.invalidateSize();
            } catch {
              /* ignore */
            }
          }
        };
        timers.push(window.setTimeout(resize, 250), window.setTimeout(resize, 700));
        window.addEventListener("resize", resize);
        window.addEventListener("orientationchange", resize);
        drawMarkers(
          L,
          map,
          layer,
          partnersRef.current,
          selectedRef.current,
          fittedRef,
          lastSelectedRef,
          (id) => onSelectRef.current(id)
        );
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
      if (resize) {
        window.removeEventListener("resize", resize);
        window.removeEventListener("orientationchange", resize);
      }
      const map = mapRef.current;
      mapRef.current = null;
      layerRef.current = null;
      fittedRef.current = false;
      if (map) {
        try {
          map.remove();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  useEffect(() => {
    const L = (window as unknown as { L?: LeafletNS }).L;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!L || !map || !layer) return;
    drawMarkers(L, map, layer, partners, selectedId, fittedRef, lastSelectedRef, (id) =>
      onSelectRef.current(id)
    );
  }, [partners, selectedId]);

  return (
    <div
      ref={containerRef}
      className="partner-live-map w-full overflow-hidden rounded-2xl border border-slate-800"
    />
  );
};

class MapErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    /* logged by React overlay in dev */
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="partner-live-map flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center text-sm text-slate-400">
          Map could not load. Use the partner list — GPS is still updating.
        </div>
      );
    }
    return this.props.children;
  }
}

const PartnerLiveMap = (props: Props) => (
  <MapErrorBoundary>
    <PartnerLiveMapInner {...props} />
  </MapErrorBoundary>
);

export default PartnerLiveMap;
