import { pointOf } from "../../utils/executionFormat";
import { fromSaved } from "./mediaItems";

// Client-side checks that mirror the server's (same messages as the prototype and
// as the mobile app), so each step can be validated before it's sent.

const isBlank = (v) => v === undefined || v === null || String(v).trim() === "";

// ---- entries

export const emptyEntry = (fields) => {
  const form = { location: null, photo: null };
  fields.forEach((f) => {
    form[f.key] = "";
  });
  return form;
};

// New entries start with these values from the previous entry (config.entryCarryOver)
export const carryOver = (form, keys, previous) => {
  if (!previous) return form;
  const next = { ...form };
  keys.forEach((k) => {
    if (k in next && previous[k] !== null && previous[k] !== undefined) next[k] = String(previous[k]);
  });
  return next;
};

export const validateEntry = (fields, form) => {
  const errors = {};
  fields.forEach((f) => {
    const raw = form[f.key];
    if (f.kind === "number") {
      if (isBlank(raw)) {
        if (f.required) errors[f.key] = f.requiredMessage;
      } else if (!Number.isFinite(Number(raw))) {
        errors[f.key] = f.required ? f.requiredMessage : "Numbers only";
      } else if (f.positive && !(Number(raw) > 0)) {
        errors[f.key] = f.requiredMessage;
      }
    } else if (f.kind === "text" && isBlank(raw) && (f.required || (f.requiredUnlessPhoto && !form.photo))) {
      errors[f.key] = f.requiredMessage;
    }
  });
  if (!form.location) errors.location = "Capture the location";
  return errors;
};

// Request body for POST / PUT …/entries
export const entryBody = (fields, form, toMediaFile) => {
  const body = {};
  fields.forEach((f) => {
    const raw = form[f.key];
    body[f.key] = isBlank(raw) ? null : f.kind === "number" ? Number(raw) : String(raw).trim();
  });
  return {
    ...body,
    latitude: form.location?.latitude,
    longitude: form.location?.longitude,
    accuracy: form.location?.accuracy,
    photo: form.photo ? toMediaFile(form.photo) : undefined,
  };
};

// ---- pits and reference points

// The pit and each reference point can have their own photos and video (optional)
export const emptyRef = () => ({ description: "", latitude: null, longitude: null, accuracy: null, tapeDistanceM: "", photos: [], video: null });
export const emptyPit = () => ({ latitude: null, longitude: null, accuracy: null, refs: [emptyRef(), emptyRef(), emptyRef()], photos: [], video: null });

export const refDone = (r) => Boolean(r && String(r.description || "").trim() && pointOf(r) && Number(r.tapeDistanceM) > 0);

export const refMissing = (r = {}) => {
  const missing = [];
  if (!String(r.description || "").trim()) missing.push("name");
  if (!pointOf(r)) missing.push("GPS");
  if (!(Number(r.tapeDistanceM) > 0)) missing.push("tape distance");
  return missing;
};

// One reference point, when its sheet / dialog is saved
export const validateRef = (r = {}) => {
  const e = {};
  if (!String(r.description || "").trim()) e.description = "Say what the object is";
  if (!pointOf(r)) e.location = "Capture GPS standing at the object";
  if (!(Number(r.tapeDistanceM) > 0)) e.tapeDistanceM = "Enter the tape distance in metres";
  return e;
};

// Start / end, one step at a time
export const checkPointStep = (step, d, ducting) => {
  const e = {};
  if (step === "pit") {
    if (!pointOf(d.pit)) e["pit.location"] = "Capture the pit location";
    d.pit.refs.forEach((r, i) => {
      if (!String(r.description || "").trim()) e[`pit.refs.${i}.description`] = "Say what the reference point is";
      if (!pointOf(r)) e[`pit.refs.${i}.location`] = "Capture GPS at the reference point";
      if (!(Number(r.tapeDistanceM) > 0)) e[`pit.refs.${i}.tapeDistanceM`] = "Enter the tape distance in metres";
    });
  }
  if (step === "media") {
    if (!ducting && !d.location) e.location = "Capture the location";
    if (!d.photos.length) e.photos = "Take at least one photo";
    if (!d.video) e.video = "Record a video";
  }
  return e;
};

export const EMPTY_POINT_DRAFT = { step: 0, pit: emptyPit(), location: null, photos: [], video: null, remarks: "", sheet: null };

// A recorded start / end (from the server) as a draft, e.g. to pre-fill End after "Fix and resubmit"
export const draftFromPoint = (point) => ({
  ...EMPTY_POINT_DRAFT,
  pit: point.pit
    ? {
        latitude: point.pit.latitude,
        longitude: point.pit.longitude,
        accuracy: point.pit.accuracy,
        refs: [0, 1, 2].map((i) => {
          const r = point.pit.refs?.[i];
          return r
            ? {
                description: r.description || "",
                latitude: r.latitude,
                longitude: r.longitude,
                accuracy: r.accuracy,
                tapeDistanceM: r.tapeDistanceM != null ? String(r.tapeDistanceM) : "",
                photos: (r.photos || []).map((m, j) => fromSaved(m, `prevRef${i}-${j}`)),
                video: fromSaved(r.video, `prevRef${i}Video`),
              }
            : emptyRef();
        }),
        photos: (point.pit.photos || []).map((m, i) => fromSaved(m, `prevPit${i}`)),
        video: fromSaved(point.pit.video, "prevPitVideo"),
      }
    : emptyPit(),
  location: point.pit ? null : point.latitude != null ? { latitude: point.latitude, longitude: point.longitude, accuracy: point.accuracy } : null,
  photos: (point.photos || []).map((m, i) => fromSaved(m, `prev${i}`)),
  video: fromSaved(point.video, "prevVideo"),
  remarks: point.remarks || "",
});

// ---- create wizard

export const CREATE_STEP_OF = {
  typeOfWork: "work",
  roadName: "work",
  fromLatLong: "work",
  toLatLong: "work",
  subSectionLength: "work",
  "initialCondition.terrain": "site",
  "initialCondition.crossing": "site",
  "initialCondition.crossings": "site",
  "initialCondition.crossingOther": "site",
  "initialCondition.crossingPhotos": "site",
  "initialCondition.ofcSide": "site",
  "initialCondition.photos": "photos",
  "initialCondition.video": "photos",
};
