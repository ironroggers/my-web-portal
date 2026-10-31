/**
 * Every photo and video captured for a subsection: site condition and crossings, the start
 * and end (their own media, the pit's and each reference point's) and the entries.
 * visit(media, kind, label, description) is called once per file.
 */
export const eachCapturedMedia = (sub, pitALabel, pitBLabel, visit) => {
  const add = (m, kind, label, description) => {
    if (m) visit(m, kind, label, description);
  };
  const ic = sub.initialCondition || {};
  [...(ic.photos || []), ic.video].forEach((m) => add(m, "SITE", "Site condition"));
  (ic.crossingPhotos || []).forEach((m) => add(m, "SITE", `Crossing${ic.crossing ? ` · ${ic.crossing}` : ""}`));
  [
    ["START", sub.start, pitALabel],
    ["END", sub.end, pitBLabel],
  ].forEach(([kind, point, title]) => {
    if (!point) return;
    [...(point.photos || []), point.video].forEach((m) => add(m, kind, title));
    [...(point.pit?.photos || []), point.pit?.video].forEach((m) => add(m, kind, `${title} · pit`));
    (point.pit?.refs || []).forEach((r, i) =>
      [...(r.photos || []), r.video].forEach((m) => add(m, kind, `${title} · reference ${i + 1}${r.description ? ` (${r.description})` : ""}`))
    );
  });
  (sub.entries || []).forEach((e, i) => add(e.photo, "ENTRY", `Entry #${i + 1}`, e.remarks));
};
