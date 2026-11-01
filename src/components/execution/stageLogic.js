// Stage record forms from config.stageFields. The same file is in both clients; the server has
// the last word on every rule here.

const isBlank = (v) => v === undefined || v === null || String(v).trim() === "";

export const fieldShown = (f, values) => (f.showIf || []).every((c) => (c.set ? !isBlank(values[c.key]) : c.in.includes(values[c.key])));

// A form: { values, location, photos, video, remarks }
export const emptyRecordForm = () => ({ values: {}, location: null, photos: [], video: null, remarks: "" });

export const recordForm = (record) => {
  const links = Object.fromEntries(Object.entries(record.links || {}).filter(([, id]) => id));
  const values = Object.fromEntries(Object.entries({ ...record.data, ...links }).map(([k, v]) => [k, String(v)]));
  const has = record.latitude !== undefined && record.latitude !== null;
  return {
    values,
    location: has ? { latitude: record.latitude, longitude: record.longitude, accuracy: record.accuracy } : null,
    photos: record.photos || [],
    video: null,
    remarks: record.remarks || "",
  };
};

export const recordBody = (fields, form, toMediaFile, version) => {
  const data = {};
  const links = {};
  fields.forEach((f) => {
    const raw = form.values[f.key];
    if (isBlank(raw) || !fieldShown(f, form.values)) {
      return;
    }
    if (f.kind === "link") {
      links[f.key] = raw;
    } else {
      data[f.key] = f.kind === "number" ? Number(raw) : String(raw).trim();
    }
  });
  return { version, data, links, location: form.location || undefined, photos: form.photos.map(toMediaFile), remarks: form.remarks };
};

// Save draft needs only the identity field
export const draftErrors = (fields, form) => {
  const errors = {};
  fields.forEach((f) => {
    if (f.draft && isBlank(form.values[f.key])) {
      errors[f.key] = f.requiredMessage;
    }
  });
  return errors;
};

// Submit needs everything
export const submitErrors = (fields, form, rule) => {
  const errors = {};
  fields.forEach((f) => {
    if (f.kind === "location") {
      if (!form.location) {
        errors.location = f.requiredMessage;
      }
    } else if (f.required && fieldShown(f, form.values) && isBlank(form.values[f.key])) {
      errors[f.key] = f.requiredMessage;
    }
  });
  if (form.photos.length < (rule?.minPhotos ?? 1)) {
    errors.photos = "Take at least one photo";
  }
  return errors;
};

// A chamber at this point along the section, within the pit suggestion limit
const chamberAt = (chambers, chainage, limit) =>
  chainage === null || chainage === undefined ? undefined : chambers.find((c) => c.chainageM !== null && c.chainageM !== undefined && Math.abs(c.chainageM - chainage) <= limit);

// Picking a subsection fills the length and any chamber at either end
export const fillFromSubsection = (values, sub, chambers, limit) => {
  const next = { ...values, subSection: String(sub._id), lengthM: String(sub.doneM ?? "") };
  const start = chamberAt(chambers, sub.startM, limit);
  const end = sub.startM === null || sub.startM === undefined ? undefined : chamberAt(chambers, sub.startM + (sub.doneM || 0), limit);
  if (start && !next.startChamber) {
    next.startChamber = String(start._id);
  }
  if (end && !next.endChamber) {
    next.endChamber = String(end._id);
  }
  return next;
};

// The last duct run with its duct and right-of-way details filled in
export const lastCompleteRun = (records, currentId) =>
  [...records].reverse().find((r) => String(r._id) !== String(currentId) && r.data?.ductSize && r.data?.rowRequired);

export const copyRunDetails = (values, fields, run) => {
  const next = { ...values };
  fields.filter((f) => f.copy).forEach((f) => {
    next[f.key] = isBlank(run.data?.[f.key]) ? "" : String(run.data[f.key]);
  });
  return next;
};

// A preview only: the server stores its own values
export const blowingPreview = (values) => {
  const n = (k) => (isBlank(values[k]) || !Number.isFinite(Number(values[k])) ? null : Number(values[k]));
  const gap = (a, b) => (a === null || b === null ? null : Math.round(Math.abs(a - b) * 100) / 100);
  return { blownM: gap(n("toIn"), n("fromOut")), fromLoopM: gap(n("fromOut"), n("fromIn")), toLoopM: gap(n("toOut"), n("toIn")) };
};

// The rows of the Details card, from config
export const detailRows = (fields, record, labelOf) =>
  fields
    .filter((f) => !["location", "note"].includes(f.kind) && !f.end)
    .map((f) => {
      const raw = f.kind === "link" ? record.linked?.[f.key]?.name : record.data?.[f.key];
      if (isBlank(raw)) {
        return null;
      }
      const value = f.kind === "choice" ? labelOf(f.options, raw) : `${raw}${f.unit ? ` ${f.unit}` : ""}`;
      return [String(f.label).replace(/ \(.*\)$/, "").replace(/\?$/, ""), value];
    })
    .filter(Boolean);
