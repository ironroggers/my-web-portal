import React, { useCallback, useMemo, useState } from "react";
import { Alert, Box, Button, ButtonBase, Card, IconButton, InputAdornment, TextField, Tooltip, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import RefreshIcon from "@mui/icons-material/Refresh";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AltRouteIcon from "@mui/icons-material/AltRoute";
import FilterAltOffOutlinedIcon from "@mui/icons-material/FilterAltOffOutlined";
import PageHeader from "../../common/PageHeader";
import SectionCard from "../../common/SectionCard";
import executionService from "../../../services/executionService.jsx";
import { usePermissions } from "../../../hooks/usePermissions";
import { useExecutionConfig } from "../../../hooks/useExecutionConfig";
import ChipGroup from "../ChipGroup";
import SubRow from "../SubRow";
import { EmptyState, ListCard, PageState, RestorationLine, StackBar } from "../execUi";
import { showToast } from "../toast";
import { useExecContext } from "../useExecContext";
import { useLoader } from "../useLoader";
import { tint } from "../execSx";

const NEEDS_ACTION_RANK = { REJECTED: 0, IN_PROGRESS: 1, NOT_STARTED: 2 };

const RESTORATION_BG = {
  LOCKED: "action.hover",
  READY: tint("primary", 0.08),
  PENDING_APPROVAL: tint("warning", 0.08),
  APPROVED: tint("success", 0.08),
  REJECTED: tint("error", 0.06),
};

const Group = ({ title, subs, empty, onOpen }) => (
  <ListCard title={title} count={subs.length} empty={empty}>
    {subs.map((s) => (
      <SubRow key={s._id} sub={s} onClick={() => onOpen(s)} />
    ))}
  </ListCard>
);

/**
 * C6: the subsections of a block section, grouped Needs action (Needs fix → In progress →
 * Not started) / Waiting approval / Done, with type chips, search and the restoration line.
 * Subsections created before execution tracking are listed last and open the trenching page.
 */
const BlockSubsectionsPage = ({ section }) => {
  const sectionId = section._id;
  const { can } = usePermissions();
  const { config, typeOf } = useExecutionConfig();
  const [type, setType] = useState("ALL");
  const [query, setQuery] = useState("");
  const go = useExecContext({
    blockProfileId: section.blockProfile,
    blockProfileName: section.block,
    sectionId,
    sectionName: section.name,
  });

  const load = useCallback(async () => {
    const [list, restoration] = await Promise.all([executionService.listSubsections(sectionId), executionService.getRestoration(sectionId)]);
    return { subs: list.items || [], restoration };
  }, [sectionId]);
  const { data, error, reload } = useLoader(load);

  const all = useMemo(() => (data?.subs || []).filter((s) => s.typeOfWork), [data]);
  const legacy = useMemo(() => (data?.subs || []).filter((s) => !s.typeOfWork), [data]);
  const restoration = data?.restoration;
  const restStatus = restoration?.status;
  const canCreate = can("executeSubsection") && Boolean(data) && !["PENDING_APPROVAL", "APPROVED"].includes(restStatus);
  const backTo = `/block-profiles/${section.blockProfile}?tab=sections`;

  const header = (
    <PageHeader
      title={section.name || "Section"}
      subtitle={[section.block, section.fromNode && section.toNode ? `${section.fromNode.name} → ${section.toNode.name}` : ""].filter(Boolean).join(" · ")}
      actions={
        <>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => go(backTo)}>
            Back to block
          </Button>
          <Tooltip title="Refresh">
            <IconButton onClick={reload} aria-label="Refresh subsections">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {canCreate && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => go(`/sections/${sectionId}/subsections/new`)}>
              New subsection
            </Button>
          )}
        </>
      }
    />
  );

  if (!data) {
    return (
      <Box>
        {header}
        <PageState error={error} onRetry={reload} />
      </Box>
    );
  }

  const counts = all.reduce((acc, s) => ({ ...acc, [s.executionStatus]: (acc[s.executionStatus] || 0) + 1 }), {});
  const q = query.trim().toLowerCase();
  const list = all.filter(
    (s) =>
      (type === "ALL" || s.typeOfWork === type) &&
      (!q ||
        s.name.toLowerCase().includes(q) ||
        String(s.roadName || "")
          .toLowerCase()
          .includes(q))
  );
  const needsAction = list
    .filter((s) => s.executionStatus in NEEDS_ACTION_RANK)
    .sort((a, b) => NEEDS_ACTION_RANK[a.executionStatus] - NEEDS_ACTION_RANK[b.executionStatus] || a.seq - b.seq);

  const order = config?.typeOrder || [];
  const chip = (t) => ({ value: t, label: typeOf(t).label, count: all.filter((s) => s.typeOfWork === t).length });
  const typeChips = [
    { value: "ALL", label: "All", count: all.length },
    ...order.filter((t) => typeOf(t)?.kind === "ducting").map(chip),
    { separator: true },
    ...order.filter((t) => typeOf(t) && typeOf(t).kind !== "ducting").map(chip),
  ];

  const openRestoration = () => {
    if (restStatus === "LOCKED") {
      const left = (restoration?.total || 0) - (restoration?.ended || 0);
      showToast(
        restoration?.total ? `${left} subsection${left === 1 ? "" : "s"} still need${left === 1 ? "s" : ""} to end execution` : "Add subsections first",
        "info"
      );
      return;
    }
    go(`/sections/${sectionId}/restoration`);
  };
  const open = (sub) => go(`/subsections/${sub._id}`, { subSectionId: sub._id, subSectionName: sub.name });

  return (
    <Box>
      {header}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <SectionCard title="Progress" subtitle={all.length ? `${all.length} subsections` : undefined} sx={{ mb: 2 }}>
        {all.length ? (
          <StackBar counts={counts} legend />
        ) : (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            No subsections yet
          </Typography>
        )}
        {restoration && (
          <ButtonBase
            onClick={openRestoration}
            sx={{
              display: "flex",
              width: "100%",
              justifyContent: "flex-start",
              gap: 1,
              p: 1.25,
              mt: 1.5,
              borderRadius: 1,
              bgcolor: RESTORATION_BG[restStatus] || "action.hover",
              textAlign: "left",
            }}
          >
            <RestorationLine restoration={restoration} remark={restoration.approval?.remark} sx={{ flex: 1, minWidth: 0 }} />
            {restStatus === "READY" || restStatus === "REJECTED" ? (
              <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
                Open
              </Typography>
            ) : (
              <ChevronRightIcon fontSize="small" sx={{ color: "text.disabled" }} />
            )}
          </ButtonBase>
        )}
      </SectionCard>

      <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap", mb: 2 }}>
        <Box sx={{ flex: "1 1 320px", minWidth: 0 }}>
          <ChipGroup nowrap options={typeChips} value={type} onChange={(v) => setType(v || "ALL")} />
        </Box>
        <TextField
          size="small"
          placeholder="Name or road"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ width: { xs: "100%", sm: 260 } }}
          slotProps={{
            htmlInput: { "aria-label": "Search subsections" },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
              endAdornment: query && (
                <InputAdornment position="end">
                  <IconButton size="small" edge="end" aria-label="Clear search" onClick={() => setQuery("")}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      {!all.length && !legacy.length ? (
        <Card>
          <EmptyState
            icon={<AltRouteIcon />}
            title="No subsections yet"
            text={canCreate ? "Use New subsection to add the first one." : undefined}
            action={
              canCreate && (
                <Button variant="outlined" startIcon={<AddIcon />} onClick={() => go(`/sections/${sectionId}/subsections/new`)}>
                  New subsection
                </Button>
              )
            }
          />
        </Card>
      ) : all.length && !list.length ? (
        <Card>
          <EmptyState icon={<FilterAltOffOutlinedIcon />} title="No match" text="No subsections match this type or search." />
        </Card>
      ) : all.length ? (
        <>
          <Group title="Needs action" subs={needsAction} empty="Nothing to do here." onOpen={open} />
          <Group title="Waiting approval" subs={list.filter((s) => s.executionStatus === "PENDING_APPROVAL")} empty="Nothing waiting." onOpen={open} />
          <Group title="Done" subs={list.filter((s) => s.executionStatus === "APPROVED")} empty="Nothing approved yet." onOpen={open} />
        </>
      ) : null}

      {legacy.length > 0 && (
        <ListCard title="Older subsections" count={legacy.length}>
          {legacy.map((s) => (
            <ButtonBase
              key={s._id}
              onClick={() => go(`/subsections/${s._id}/trenching`)}
              sx={{
                display: "block",
                width: "100%",
                textAlign: "left",
                px: 2,
                py: 1.5,
                borderBottom: 1,
                borderColor: "divider",
                "&:last-of-type": { borderBottom: 0 },
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {s.name || "Unnamed subsection"}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Created before execution tracking · trenching entries
              </Typography>
            </ButtonBase>
          ))}
        </ListCard>
      )}
    </Box>
  );
};

export default BlockSubsectionsPage;
