// Stage record forms from config.stageFields. The same file is in both clients; the server has
// the last word on every rule here.

const isBlank = (v) => v === undefined || v === null || String(v).trim() === "";

export const fieldShown = (f, values) => (f.showIf || []).every((c) => (c.set ? !isBlank(values[c.key]) : c.in.includes(values[c.key])));

// A form: { values, location, photos, video, remarks }
export const emptyRecordForm = (values = {}) => ({ values, location: null, photos: [], video: null, remarks: "" });

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

// Picking a subsection fills the length
export const fillFromSubsection = (values, sub) => ({ ...values, subSection: String(sub._id), lengthM: String(sub.doneM ?? "") });

// A pit is stored as any of the subsection pits it stands for
export const pitFor = (pits, key) => (key ? (pits || []).find((p) => p.keys.includes(key)) : undefined);

// A pit's reference points on one line, to tell it apart on site
export const landmarkText = (pit) => (pit?.landmarks || []).map((l) => `${l.description} (${l.tapeDistanceM} m)`).join(" · ");

// Chambers along the route. A run needs a location at both ends, and two different chambers
export const chamberRows = (chambers, f, values) => {
  const other = values[{ fromChamber: "toChamber", toChamber: "fromChamber" }[f.key]];
  const place = (c) => (c.chainageM === null || c.chainageM === undefined ? Infinity : c.chainageM);
  return [...(chambers || [])]
    .sort((a, b) => place(a) - place(b))
    .map((c) => {
      const noFix = c.latitude === null || c.latitude === undefined;
      const value = String(c._id);
      return {
        value,
        title: c.name,
        sub: [place(c) === Infinity ? "" : `Ch ${c.chainageM} m`, c.landmark].filter(Boolean).join(" · "),
        disabled: noFix || value === other,
        why: noFix ? "No location yet" : value === other ? "Already picked" : "",
      };
    });
};

// A new run carries on from where the last one ended
export const nextFromChamber = (records) => {
  const last = [...(records || [])].reverse().find((r) => r.links?.toChamber);
  return last ? String(last.links.toChamber) : undefined;
};

// A blowing run's ducts on the form, and the metres of the stretch without one
export const blowingRoute = (options, values) => {
  const of = (id) => (options.chambers || []).find((c) => String(c._id) === id);
  const a = of(values.fromChamber);
  const b = of(values.toChamber);
  if (!a || !b || a.chainageM === null || b.chainageM === null || a.chainageM === undefined || b.chainageM === undefined) {
    return null;
  }
  const lo = Math.min(a.chainageM, b.chainageM);
  const hi = Math.max(a.chainageM, b.chainageM);
  const runs = (options.ductRuns || []).filter((d) => d.chainageM !== undefined && d.chainageM < hi && d.chainageEndM > lo);
  const covered = runs.reduce((sum, d) => sum + Math.min(hi, d.chainageEndM) - Math.max(lo, d.chainageM), 0);
  return { from: a.name, to: b.name, through: runs.map((d) => d.name), uncoveredM: Math.max(0, hi - lo - covered) };
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
      const raw = f.kind === "link" ? record.linked?.[f.key]?.name : f.kind === "pit" ? record.pits?.[f.key]?.name : f.kind === "node" ? record.nodes?.[f.key]?.name : record.data?.[f.key];
      if (isBlank(raw)) {
        return null;
      }
      const value = f.kind === "choice" ? labelOf(f.options, raw) : `${raw}${f.unit ? ` ${f.unit}` : ""}`;
      return [String(f.label).replace(/ \(.*\)$/, "").replace(/\?$/, ""), value];
    })
    .filter(Boolean);

// The Field Executive can edit a draft, or a submitted record of an editUntilReviewed stage
// (config.stages) that neither the Cluster Head nor the GIS Head has reviewed yet
export const openForFieldEdit = (record, stages) =>
  record.status === "IN_PROGRESS" ||
  (Boolean(stages?.[record.stage]?.editUntilReviewed) && record.status === "PENDING_APPROVAL" && !record.review?.clusterHead?.status && !record.review?.gisHead?.status);

// Rows a stage adds to the Details card
export const recordExtraRows = (record) => {
  const ducts = record.ductNames || [];
  return {
    CHAMBER: () => (record.jointAssetCode ? [["Joint asset code", record.jointAssetCode]] : []),
    DUCTING: () => (record.pits?.start ? [["Pits", `${record.pits.start.name} to ${record.pits.end?.name ?? "–"}`]] : []),
    COUPLING: () => (ducts.length ? [["Ducts meeting", ducts.join(" and ")]] : []),
    BLOWING: () => (ducts.length ? [["Through", ducts.join(", ")]] : []),
  }[record.stage]?.() || [];
};

// A chamber's cable reading, or the cable passing through it
export const readingText = (x) => (x.passesThrough ? `Cable passes through, ${x.run}` : `In ${x.in ?? "–"} m · Out ${x.out ?? "–"} m · Loop ${x.loop ?? "–"} m`);

