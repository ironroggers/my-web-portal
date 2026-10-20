import { GOOGLE_MAPS_DIRECTIONS_API } from "../../../API/api-keys.jsx";

// Web Mercator, so the topology drawn on its own lines up exactly with a Google static
// map behind it. Points are { lat, lng }; world pixels are at zoom 0 (256 px world).

const TILE = 256;

export const worldPx = ({ lat, lng }) => {
  const s = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  return { x: TILE * (0.5 + lng / 360), y: TILE * (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) };
};

const boundsOf = (points) => {
  const w = points.map(worldPx);
  const xs = w.map((p) => p.x);
  const ys = w.map((p) => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
};

// Inverse of worldPx for the centre of a box
const latLngOf = (x, y) => {
  const n = Math.PI - (2 * Math.PI * y) / TILE;
  return { lat: (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))), lng: (x / TILE) * 360 - 180 };
};

/**
 * A projection of `points` into the box { x, y, w, h } (SVG units).
 *  - fractional: fills the box (no map behind)
 *  - map: a whole Google zoom level with a static map of `mapSize` logical pixels
 *    stretched over the box, so the overlay matches the image
 * Returns { project(p) -> {x, y}, metresPerUnit, map? { url, zoom, center } }
 */
export const makeProjection = (points, box, { withMap = false, mapSize = { w: 640, h: 452 }, padding = 0.08 } = {}) => {
  const b = boundsOf(points.length ? points : [{ lat: 9.3, lng: 76.46 }]);
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  const spanX = Math.max(b.maxX - b.minX, 1e-6);
  const spanY = Math.max(b.maxY - b.minY, 1e-6);
  const centre = latLngOf(cx, cy);
  const mPerWorldPx = (156543.03392 * Math.cos((centre.lat * Math.PI) / 180)) / 1; // metres per world px at zoom 0 × 2^0

  if (withMap) {
    // Largest whole zoom where the points fit in the static map with some margin
    const fit = Math.min((mapSize.w * (1 - padding * 2)) / spanX, (mapSize.h * (1 - padding * 2)) / spanY);
    const zoom = Math.max(1, Math.min(19, Math.floor(Math.log2(fit))));
    const k = 2 ** zoom; // logical static-map px per world px
    const unit = box.w / mapSize.w; // SVG units per logical px
    const project = (p) => {
      const w = worldPx(p);
      return { x: box.x + box.w / 2 + (w.x - cx) * k * unit, y: box.y + box.h / 2 + (w.y - cy) * k * unit };
    };
    const style = ["feature:poi|visibility:off", "feature:transit|visibility:off", "saturation:-35"].map((s) => `&style=${encodeURIComponent(s)}`).join("");
    const url =
      `https://maps.googleapis.com/maps/api/staticmap?center=${centre.lat.toFixed(6)},${centre.lng.toFixed(6)}` +
      `&zoom=${zoom}&size=${mapSize.w}x${mapSize.h}&scale=2&maptype=roadmap${style}&key=${encodeURIComponent(GOOGLE_MAPS_DIRECTIONS_API || "")}`;
    return { project, metresPerUnit: mPerWorldPx / k / unit, map: { url, zoom, center: centre } };
  }

  const k = Math.min((box.w * (1 - padding * 2)) / spanX, (box.h * (1 - padding * 2)) / spanY);
  const project = (p) => {
    const w = worldPx(p);
    return { x: box.x + box.w / 2 + (w.x - cx) * k, y: box.y + box.h / 2 + (w.y - cy) * k };
  };
  return { project, metresPerUnit: mPerWorldPx / k };
};

// A round scale-bar length (1, 2, 5 × 10^n metres) close to `target` metres
export const niceMetres = (target) => {
  const pow = 10 ** Math.floor(Math.log10(target || 1));
  return [1, 2, 5, 10].map((m) => m * pow).filter((v) => v <= target).pop() || pow;
};
