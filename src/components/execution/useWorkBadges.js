import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { usePermissions } from "../../hooks/usePermissions";
import { getWorkBadges, refreshWorkBadges, subscribeWorkBadges } from "./workBadges";
import { REVIEW_ACTIONS } from "./execConstants";

/** { needsFix, approvals } for the sidebar badges; refreshed as the user moves between pages */
export const useWorkBadges = () => {
  const { pathname } = useLocation();
  const { can, loading } = usePermissions();
  const [counts, setCounts] = useState(getWorkBadges);
  const myWork = !loading && can("viewExecution");
  const approvals = !loading && can(REVIEW_ACTIONS);

  useEffect(() => subscribeWorkBadges(setCounts), []);

  useEffect(() => {
    if (myWork || approvals) refreshWorkBadges({ myWork, approvals });
  }, [pathname, myWork, approvals]);

  return counts;
};
