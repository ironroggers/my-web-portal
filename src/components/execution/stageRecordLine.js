import { fmtDistance } from "../../utils/executionFormat";

const chTxt = (m) => (m === null || m === undefined ? "No location yet" : `Ch ${m} m`);

// The line under a record's name, on the stage list and the approvals list
export const recordLine = (r) => {
  const d = r.data || {};
  const name = (key) => r.linked?.[key]?.name;
  return {
    DUCTING: () => [r.subsection?.name, d.lengthM !== undefined ? fmtDistance(d.lengthM) : "", r.pits?.start ? `${r.pits.start.name} to ${r.pits.end?.name ?? "–"}` : ""],
    COUPLING: () => [r.pits?.pit?.name, chTxt(r.chainageM), r.ductNames?.join(" meets ")],
    BLOWING: () => [`${r.linked?.fromChamber?.name ?? "–"} to ${r.linked?.toChamber?.name ?? "–"}`, fmtDistance(d.blownLengthM || 0), d.drumId ? `Drum ${d.drumId}` : ""],
    CHAMBER: () => [r.typeLabel, d.hasJoint === "Yes" ? `${d.jointType} joint closure` : "", r.pits?.atCoupling ? `at ${r.pits.atCoupling.name}` : r.nodes?.atNode ? `at ${r.nodes.atNode.name}` : chTxt(r.chainageM)],
    ROUTE_MARKER: () => [chTxt(r.chainageM), d.position, name("beside") ? `at ${name("beside")}` : ""],
  }[r.stage]()
    .filter(Boolean)
    .join(" · ");
};
