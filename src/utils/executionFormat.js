// OFC execution formats. This file is identical in the mobile app
// (Locus/src/utils/executionFormat.js) and the web portal
// (my-web-portal/src/utils/executionFormat.js), so both show the same words and
// numbers. Change both together.

export const STALE_MESSAGE = 'This was updated on another device';

// IST has no daylight saving, so a fixed offset gives the same result on every
// device without relying on Intl time zone support.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');

const istParts = (value) => {
  if (value === null || value === undefined || value === '') { return null; }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) { return null; }
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return {
    day: ist.getUTCDate(),
    month: MONTHS[ist.getUTCMonth()],
    year: ist.getUTCFullYear(),
    time: `${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}`,
    seconds: pad(ist.getUTCSeconds()),
  };
};

// "18 Oct, 10:42"
export const fmtDateTime = (value) => {
  const p = istParts(value);
  return p ? `${p.day} ${p.month}, ${p.time}` : '—';
};
// "18 Oct 2026"
export const fmtDate = (value) => {
  const p = istParts(value);
  return p ? `${p.day} ${p.month} ${p.year}` : '—';
};
// "18 Oct 2026, 10:42"
export const fmtDateTimeLong = (value) => {
  const p = istParts(value);
  return p ? `${p.day} ${p.month} ${p.year}, ${p.time}` : '—';
};
// "18 Oct 2026 10:42:05 IST" (photo stamp and viewer)
export const fmtStampTime = (value) => {
  const p = istParts(value);
  return p ? `${p.day} ${p.month} ${p.year} ${p.time}:${p.seconds} IST` : '—';
};

const isNumber = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
const trimNumber = (n, digits) => String(Math.round(n * 10 ** digits) / 10 ** digits);

// "12.5 m" / "1.24 km"
export const fmtDistance = (metres) => {
  if (!isNumber(metres)) { return '—'; }
  const n = Number(metres);
  return Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(2)} km` : `${trimNumber(n, 1)} m`;
};

// "9.381234"
export const fmtCoord = (value) => (isNumber(value) ? Number(value).toFixed(6) : '—');
// "9.381234, 76.351234"
export const fmtLatLong = (lat, lng) => (isNumber(lat) && isNumber(lng) ? `${fmtCoord(lat)}, ${fmtCoord(lng)}` : '—');

export const isAboveLimit = (accuracy, limit) => isNumber(accuracy) && isNumber(limit) && Number(accuracy) > Number(limit);
// "±0.8 m" or "±2.4 m · above 1 m"
export const fmtAccuracy = (accuracy, limit) => {
  if (!isNumber(accuracy)) { return '—'; }
  return `±${Number(accuracy).toFixed(1)} m${isAboveLimit(accuracy, limit) ? ` · above ${trimNumber(Number(limit), 1)} m` : ''}`;
};

// "0:42"
export const fmtDuration = (seconds) => {
  if (!isNumber(seconds)) { return ''; }
  const s = Math.round(Number(seconds));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
};

// "320 KB" / "1.4 MB"
export const fmtSize = (bytes) => {
  if (!isNumber(bytes) || !bytes) { return ''; }
  const n = Number(bytes);
  return n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

export const countLabel = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// ---- geometry

export const distanceM = (a, b) => {
  const R = 6371000;
  const k = Math.PI / 180;
  const dLat = (b.lat - a.lat) * k;
  const dLng = (b.lng - a.lng) * k;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * k) * Math.cos(b.lat * k) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

// "9.98, 76.29" -> { lat, lng }; anything else -> null
export const parseLatLong = (value) => {
  const parts = String(value ?? '')
    .split(',')
    .map((part) => part.trim());
  if (parts.length !== 2 || parts.some((part) => part === '')) { return null; }
  const [lat, lng] = parts.map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
};

// { latitude, longitude } -> { lat, lng } or null
export const pointOf = (obj) =>
  obj && isNumber(obj.latitude) && isNumber(obj.longitude) ? { lat: Number(obj.latitude), lng: Number(obj.longitude) } : null;

// Tape distance vs the GPS distance between pit and reference point
export const tapeMismatch = (tapeM, gpsM, rule = { minM: 3, pct: 0.5 }) =>
  isNumber(tapeM) && isNumber(gpsM) && Math.abs(Number(tapeM) - Number(gpsM)) > Math.max(rule.minM, Number(gpsM) * rule.pct);

// ---- subsection name preview (the server gives the real name on create)

export const roadSlug = (road) =>
  String(road || '')
    .toUpperCase()
    .replace(/\bROAD\b/g, 'RD')
    .replace(/\bSTREET\b/g, 'ST')
    .replace(/\bJUNCTION\b/g, 'JN')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 14);

// "NH66-HDD-007"
export const subsectionName = (road, typeCode, seq) =>
  `${roadSlug(road) || 'ROAD'}-${typeCode || 'TYPE'}-${String(seq || 1).padStart(3, '0')}`;
