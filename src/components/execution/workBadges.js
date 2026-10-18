import executionService from "../../services/executionService.jsx";

// Counts on the My work (needs fix) and Approvals (pending) sidebar items. The pages
// set them when they load; the sidebar also refreshes them now and then (useWorkBadges).
let counts = { needsFix: 0, approvals: 0 };
let lastFetch = 0;
const listeners = new Set();

export const getWorkBadges = () => counts;

export const setWorkBadges = (patch) => {
  counts = { ...counts, ...patch };
  listeners.forEach((fn) => fn(counts));
};

export const subscribeWorkBadges = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const REFRESH_MS = 60 * 1000;

// Fetch the counts the user can see, at most once a minute unless forced
export const refreshWorkBadges = async ({ myWork, approvals, force = false }) => {
  if (!force && Date.now() - lastFetch < REFRESH_MS) return;
  lastFetch = Date.now();
  const [work, inbox] = await Promise.all([
    myWork ? executionService.getMyWork().catch(() => null) : null,
    approvals ? executionService.listApprovals().catch(() => null) : null,
  ]);
  const patch = {};
  if (work) patch.needsFix = work.counts?.needsFix || 0;
  if (inbox) patch.approvals = inbox.counts?.total || 0;
  if (Object.keys(patch).length) setWorkBadges(patch);
};
