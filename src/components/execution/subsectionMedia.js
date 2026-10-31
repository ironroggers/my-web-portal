/**
 * Every photo and video captured for a subsection: site condition and crossings, the start
 * and end (their own media, the pit's and each reference point's) and the entries.
 * A merged pit also brings the other pits' files, with `source` naming where they came from.
 * visit(media, kind, label, description, source) is called once per file.
 */
export const eachCapturedMedia = (sub, pitALabel, pitBLabel, visit) => {
  const add = (m, kind, label, description, source) => {
    if (m) visit(m, kind, label, description, source);
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
    (point.pit?.merge?.others || []).forEach((other) => {
      const source = `Merged from ${other.name} · ${other.pitLabel}`;
      [...(other.photos || []), other.video].forEach((m) => add(m, kind, source, undefined, source));
      (other.refs || []).forEach((r, i) =>
        [...(r.photos || []), r.video].forEach((m) => add(m, kind, `${source} · reference ${i + 1}`, undefined, source))
      );
    });
  });
  (sub.entries || []).forEach((e, i) => add(e.photo, "ENTRY", `Entry #${i + 1}`, e.remarks));
};
