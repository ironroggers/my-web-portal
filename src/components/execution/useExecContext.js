import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Where an execution page sits: { blockProfileId, blockProfileName, sectionId, sectionName,
// subSectionId, subSectionName }. It rides in the router state so the breadcrumbs and the
// sidebar can show it (navConfig.js), and each page fills in what it learns from the
// server, so a reload or a pasted link gets the same trail.
const KEYS = ["blockProfileId", "blockProfileName", "sectionId", "sectionName", "subSectionId", "subSectionName"];

const pick = (source) =>
  Object.fromEntries(KEYS.filter((k) => source?.[k] !== undefined && source?.[k] !== null).map((k) => [k, String(source[k])]));

// next over base; a different block or section drops the levels below it from base
const merge = (base, next) => {
  const kept = { ...base };
  if (next.blockProfileId && next.blockProfileId !== base.blockProfileId) KEYS.slice(1).forEach((k) => delete kept[k]);
  if (next.sectionId && next.sectionId !== base.sectionId) KEYS.slice(3).forEach((k) => delete kept[k]);
  if (next.subSectionId && next.subSectionId !== base.subSectionId) delete kept.subSectionName;
  return { ...kept, ...next };
};

/**
 * useExecContext(known) keeps `known` in the router state and returns go(to, extraState),
 * a navigate that carries the context on to the next page.
 */
export const useExecContext = (known) => {
  const { pathname, search, state } = useLocation();
  const navigate = useNavigate();
  const knownKey = JSON.stringify(pick(known));

  useEffect(() => {
    const next = JSON.parse(knownKey);
    if (Object.entries(next).every(([k, v]) => state?.[k] === v)) return;
    const other = Object.fromEntries(Object.entries(state || {}).filter(([k]) => !KEYS.includes(k)));
    navigate({ pathname, search }, { replace: true, state: { ...other, ...merge(pick(state), next) } });
  }, [knownKey, state, navigate, pathname, search]);

  return useCallback(
    (to, extra = {}, options = {}) => navigate(to, { ...options, state: merge(merge(pick(state), JSON.parse(knownKey)), pick(extra)) }),
    [navigate, state, knownKey]
  );
};

// The context fields of a job card (GET /api/subsections/:id)
export const contextOfSub = (sub) =>
  sub
    ? {
        blockProfileId: sub.sectionInfo?.block?._id,
        blockProfileName: sub.sectionInfo?.block?.name,
        sectionId: sub.sectionInfo?.section?._id || sub.section,
        sectionName: sub.sectionInfo?.section?.name,
        subSectionId: sub._id,
        subSectionName: sub.name,
      }
    : undefined;
