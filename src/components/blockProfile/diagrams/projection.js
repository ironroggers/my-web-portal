// Web Mercator world pixels at zoom 0 (256 px world) for { lat, lng } points; the L-14
// layout uses them to keep the GPs' geographic order.

const TILE = 256;

export const worldPx = ({ lat, lng }) => {
  const s = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  return { x: TILE * (0.5 + lng / 360), y: TILE * (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) };
};
