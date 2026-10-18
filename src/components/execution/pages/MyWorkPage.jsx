import React, { useCallback, useEffect } from "react";
import { Box, ButtonBase, Card, IconButton, Tooltip, Typography } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import PageHeader from "../../common/PageHeader";
import executionService from "../../../services/executionService.jsx";
import SubRow from "../SubRow";
import { PageState, RestorationPill } from "../execUi";
import { titleCase } from "../execConstants";
import { setWorkBadges } from "../workBadges";
import { useExecContext } from "../useExecContext";
import { useLoader } from "../useLoader";

const contextOf = (card) => [titleCase(card.block?.name), card.section?.name].filter(Boolean).join(" › ");

// Router state for a card, so the next page's breadcrumbs show the block and section
const stateOf = (card) => ({
  blockProfileId: card.block?._id,
  blockProfileName: titleCase(card.block?.name),
  sectionId: card.section?._id,
  sectionName: card.section?.name,
});

/** C15: everything that needs action — Needs fix, In progress, Ready for restoration, Waiting approval */
const MyWorkPage = () => {
  const go = useExecContext(undefined);
  const load = useCallback(() => executionService.getMyWork(), []);
  const { data: work, error, reload } = useLoader(load);

  useEffect(() => {
    if (work) setWorkBadges({ needsFix: work.counts?.needsFix || 0 });
  }, [work]);

  const header = (
    <PageHeader
      title="My work"
      subtitle="Needs fix, in progress, ready for restoration and waiting approval"
      actions={
        <Tooltip title="Refresh">
          <IconButton onClick={reload} aria-label="Refresh">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      }
    />
  );

  if (!work) {
    return (
      <Box>
        {header}
        <PageState error={error} onRetry={reload} />
      </Box>
    );
  }

  const card = (item, i) =>
    item.kind === "restoration" ? (
      <ButtonBase
        key={`r${item.section?._id}${i}`}
        onClick={() => go(`/sections/${item.section?._id}/restoration`, stateOf(item))}
        sx={{ display: "block", width: "100%", textAlign: "left", px: 2, py: 1.5, borderBottom: 1, borderColor: "divider", "&:last-of-type": { borderBottom: 0 }, "&:hover": { bgcolor: "action.hover" } }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, flex: 1 }}>
            Section restoration
          </Typography>
          <RestorationPill status={item.status} />
        </Box>
        <Typography variant="caption" noWrap sx={{ color: "text.disabled", display: "block", mt: 0.5 }}>
          {contextOf(item)}
        </Typography>
        {item.remark && (
          <Typography variant="body2" sx={{ color: "error.dark", mt: 0.5 }}>
            {item.remark}
          </Typography>
        )}
      </ButtonBase>
    ) : (
      <SubRow
        key={item._id}
        sub={item}
        context={contextOf(item)}
        onClick={() => go(`/subsections/${item._id}`, { ...stateOf(item), subSectionId: item._id, subSectionName: item.name })}
      />
    );

  const group = (title, items, empty) => (
    <Card key={title} sx={{ mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, px: 2, py: 1.25, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="caption" sx={{ color: "text.disabled" }}>
          {items.length}
        </Typography>
      </Box>
      {items.length ? (
        items.map(card)
      ) : (
        <Typography variant="body2" sx={{ color: "text.secondary", px: 2, py: 1.5 }}>
          {empty}
        </Typography>
      )}
    </Card>
  );

  return (
    <Box sx={{ maxWidth: 960 }}>
      {header}
      {group("Needs fix", work.needsFix, "Nothing to fix.")}
      {group("In progress", work.inProgress, "No execution running.")}
      {group("Ready for restoration", work.readyForRestoration, "No section is ready for restoration.")}
      {group("Waiting approval", work.waitingApproval, "Nothing waiting.")}
    </Box>
  );
};

export default MyWorkPage;
