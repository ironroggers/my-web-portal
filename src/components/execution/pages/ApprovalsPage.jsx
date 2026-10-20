import React, { useCallback, useEffect, useState } from "react";
import { Box, ButtonBase, Card, IconButton, MenuItem, TextField, Tooltip, Typography } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import PageHeader from "../../common/PageHeader";
import executionService from "../../../services/executionService.jsx";
import { usePermissions } from "../../../hooks/usePermissions";
import { useExecutionConfig } from "../../../hooks/useExecutionConfig";
import { fmtDateTime } from "../../../utils/executionFormat";
import ChipGroup from "../ChipGroup";
import SubRow from "../SubRow";
import { FlagChips } from "../Flags";
import { EmptyState, ListCard, PageState, RestorationPill } from "../execUi";
import { titleCase } from "../execConstants";
import { setWorkBadges } from "../workBadges";
import { useExecContext } from "../useExecContext";
import { useLoader } from "../useLoader";

const contextOf = (card) => [titleCase(card.block?.name), card.section?.name].filter(Boolean).join(" › ");
const sentLine = (at, by) => [at ? `Sent ${fmtDateTime(at)}` : "", by?.name ? `by ${by.name}` : ""].filter(Boolean).join(" ");

const stateOf = (card) => ({
  blockProfileId: card.block?._id,
  blockProfileName: titleCase(card.block?.name),
  sectionId: card.section?._id,
  sectionName: card.section?.name,
});

/** C16: pending subsections and restorations, oldest first, filterable by district / block / type of work */
const ApprovalsPage = () => {
  const { can, loading: permissionsLoading } = usePermissions();
  const { config, typeOf } = useExecutionConfig();
  const go = useExecContext(undefined);
  const [kind, setKind] = useState("");
  const [district, setDistrict] = useState("");
  const [blockProfile, setBlockProfile] = useState("");
  const [typeOfWork, setTypeOfWork] = useState("");
  const [districts, setDistricts] = useState([]);
  const [blocks, setBlocks] = useState([]);

  useEffect(() => {
    executionService
      .getDistricts()
      .then((res) => setDistricts(res.items || []))
      .catch(() => setDistricts([]));
  }, []);

  useEffect(() => {
    executionService
      .listBlocks({ district, limit: 200 })
      .then((res) => setBlocks(res.items || []))
      .catch(() => setBlocks([]));
  }, [district]);

  const load = useCallback(() => executionService.listApprovals({ district, blockProfile, typeOfWork }), [district, blockProfile, typeOfWork]);
  const { data, error, reload } = useLoader(load);

  // The badge counts everything pending, so only an unfiltered load updates it
  useEffect(() => {
    if (data && !district && !blockProfile && !typeOfWork) setWorkBadges({ approvals: data.counts?.total || 0 });
  }, [data, district, blockProfile, typeOfWork]);

  const header = (
    <PageHeader
      title="Approvals"
      subtitle="Subsections and restorations waiting for approval, oldest first"
      actions={
        <Tooltip title="Refresh">
          <IconButton onClick={reload} aria-label="Refresh">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      }
    />
  );

  if (!permissionsLoading && !can("approveExecution")) {
    return (
      <Box>
        {header}
        <PageState error="Approvals are only available to approvers." />
      </Box>
    );
  }

  const subs = data?.subsections || [];
  const rests = data?.restorations || [];
  const showSubs = kind !== "restoration";
  const showRests = kind !== "subsection" && !typeOfWork;

  const filters = (
    <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center", mb: 2 }}>
      <Box sx={{ flex: "1 1 280px", minWidth: 0 }}>
        <ChipGroup
          nowrap
          value={kind}
          onChange={(v) => setKind(v || "")}
          options={[
            { value: "", label: "All", count: data ? subs.length + rests.length : undefined },
            { value: "subsection", label: "Subsections", count: data ? subs.length : undefined },
            { value: "restoration", label: "Restorations", count: data ? rests.length : undefined },
          ]}
        />
      </Box>
      <TextField
        select
        size="small"
        label="District"
        value={district}
        onChange={(e) => {
          setDistrict(e.target.value);
          setBlockProfile("");
        }}
        sx={{ width: { xs: "100%", sm: 180 } }}
      >
        <MenuItem value="">All districts</MenuItem>
        {districts.map((d) => (
          <MenuItem key={d} value={d}>
            {titleCase(d)}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="Block"
        value={blockProfile}
        onChange={(e) => setBlockProfile(e.target.value)}
        sx={{ width: { xs: "100%", sm: 200 } }}
      >
        <MenuItem value="">All blocks</MenuItem>
        {blocks.map((b) => (
          <MenuItem key={b._id} value={b._id}>
            {titleCase(b.block)}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="Type of work"
        value={typeOfWork}
        onChange={(e) => setTypeOfWork(e.target.value)}
        sx={{ width: { xs: "100%", sm: 180 } }}
      >
        <MenuItem value="">All types</MenuItem>
        {(config?.typeOrder || []).map((t) => (
          <MenuItem key={t} value={t}>
            {typeOf(t)?.label || t}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  );

  if (!data) {
    return (
      <Box>
        {header}
        {filters}
        <PageState error={error} onRetry={reload} />
      </Box>
    );
  }

  const nothing = (showSubs ? subs.length : 0) + (showRests ? rests.length : 0) === 0;

  return (
    <Box>
      {header}
      {filters}
      {error && (
        <Typography variant="body2" sx={{ color: "error.main", mb: 2 }}>
          {error}
        </Typography>
      )}
      {nothing ? (
        <Card>
          <EmptyState
            icon={<InboxOutlinedIcon />}
            title="Nothing waiting"
            text={district || blockProfile || typeOfWork || kind ? "Nothing matches these filters." : "New submissions show up here."}
          />
        </Card>
      ) : (
        <>
          {showSubs && subs.length > 0 && (
            <ListCard title="Subsections" count={subs.length}>
              {subs.map((s) => (
                <Box key={s._id} sx={{ borderBottom: 1, borderColor: "divider", "&:last-of-type": { borderBottom: 0 } }}>
                  <SubRow
                    sub={s}
                    context={`${contextOf(s)} · ${sentLine(s.submittedAt, s.submittedBy)}`}
                    onClick={() => go(`/approvals/subsections/${s._id}`, { ...stateOf(s), subSectionId: s._id, subSectionName: s.name })}
                  />
                  {Object.values(s.flags || {}).some(Boolean) && (
                    <Box sx={{ px: 2, pb: 1.5, mt: -1 }}>
                      <FlagChips flags={s.flags} />
                    </Box>
                  )}
                </Box>
              ))}
            </ListCard>
          )}
          {showRests && rests.length > 0 && (
            <ListCard title="Restorations" count={rests.length}>
              {rests.map((r) => (
                <ButtonBase
                  key={r.section?._id}
                  onClick={() => go(`/approvals/restorations/${r.section?._id}`, stateOf(r))}
                  sx={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    px: 2,
                    py: 1.5,
                    borderBottom: 1,
                    borderColor: "divider",
                    "&:last-of-type": { borderBottom: 0 },
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, flex: 1, minWidth: 0 }} noWrap>
                      {r.section?.name} · restoration
                    </Typography>
                    <RestorationPill status={r.status} />
                  </Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                    {r.itemCount} of {r.totalSubs} subsections captured · {r.approvedSubs}/{r.totalSubs} subsections approved
                  </Typography>
                  <Typography variant="caption" noWrap sx={{ color: "text.disabled", display: "block" }}>
                    {contextOf(r)} · {sentLine(r.submittedAt, r.submittedBy)}
                  </Typography>
                  {r.approveBlocked && (
                    <Typography variant="caption" sx={{ color: "warning.dark", display: "block", mt: 0.5 }}>
                      Can&apos;t be approved until every subsection is approved
                    </Typography>
                  )}
                  <FlagChips flags={r.flags} />
                </ButtonBase>
              ))}
            </ListCard>
          )}
        </>
      )}
    </Box>
  );
};

export default ApprovalsPage;
