import React, { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, Card, CircularProgress, IconButton, MenuItem, Skeleton, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import RefreshIcon from "@mui/icons-material/Refresh";
import TimelineIcon from "@mui/icons-material/Timeline";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import executionService from "../../../services/executionService.jsx";
import { fmtDateTime, fmtDistance } from "../../../utils/executionFormat";
import { useLoader } from "../../execution/useLoader";
import { EmptyState } from "../../execution/execUi";
import L14Diagram, { L14Legend } from "./L14Diagram";
import L14Schematic from "./L14Schematic";
import { buildFeatures } from "./blockFeatures";
import { exportA4Pdf } from "./exportPdf";
import { showToast } from "../../execution/toast";
import { titleCase } from "../../execution/execConstants";
import { DetailPanel, L14Button, MediaList, NodeDetail, OpenButton, SectionDetail, SubsectionDetail } from "./DiagramDetails";
import { nodeKey, nodeTitle } from "./diagramGeometry";

/**
 * Diagrams tab: the L-14 schematic of the whole block (exports as an A4 PDF) and one
 * section's chainage strip. Same data as the Map tab (GET /api/block-profiles/:id/map).
 * Clicking anything opens its details in a side panel. The view and section are kept
 * in the URL.
 */
const BlockDiagramsPanel = ({ blockProfile }) => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "section" ? "section" : "l14";
  const svgRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState(null);
  const blockProfileId = blockProfile._id;

  const load = useCallback(() => executionService.getBlockMap(blockProfileId), [blockProfileId]);
  const { data, error, reload } = useLoader(load);

  const sections = useMemo(() => data?.sections || [], [data]);
  const features = useMemo(() => buildFeatures(blockProfile, data), [blockProfile, data]);
  const sectionId = params.get("section") && sections.some((s) => s._id === params.get("section")) ? params.get("section") : sections[0]?._id;
  const section = sections.find((s) => s._id === sectionId);

  const setView = (next, extra = {}) => {
    const p = new URLSearchParams(params);
    p.set("tab", "diagrams");
    p.set("view", next);
    Object.entries(extra).forEach(([k, v]) => p.set(k, v));
    setParams(p, { replace: true });
  };

  // ---- lookups for the detail panels
  const infraFor = useCallback(
    (node) => (data?.infra || []).find((i) => (node.type === "BHQ" ? i.level === "BLOCK" : i.level === "GP" && i.gpLgdCode === node.code)),
    [data]
  );
  const nodeInfo = useCallback((node) => ({ infra: infraFor(node) }), [infraFor]);
  const fullNode = (node) => {
    if (node.type === "BHQ") {
      const b = blockProfile.bhq || {};
      return { type: "BHQ", code: b.code, name: b.name, lat: b.latitude, lng: b.longitude };
    }
    const gp = (blockProfile.gps || []).find((g) => g.lgdCode === node.code) || {};
    return { type: "GP", code: node.code, name: gp.name || node.name, lat: gp.latitude, lng: gp.longitude };
  };
  const blockState = { blockProfileId, blockProfileName: blockProfile.block };
  const openSection = (s) => navigate(`/sections/${s._id}/subsections`, { state: { ...blockState, sectionId: s._id, sectionName: s.name } });
  const openSub = (sub) =>
    sub.legacy
      ? navigate(`/subsections/${sub._id}/trenching`, { state: blockState })
      : navigate(`/subsections/${sub._id}`, { state: { ...blockState, sectionId: sub.sectionId, sectionName: sub.sectionName, subSectionId: sub._id, subSectionName: sub.name } });
  const openInfra = (node) =>
    navigate(node.type === "BHQ" ? `/block-profiles/${blockProfileId}/infra` : `/block-profiles/${blockProfileId}/gps/${encodeURIComponent(node.code)}/infra`, { state: blockState });

  const panel = (() => {
    if (!selected) return null;
    if (selected.kind === "node") {
      const node = fullNode(selected.node);
      const key = nodeKey(node);
      const touching = sections.filter((s) => nodeKey(s.fromNode) === key || nodeKey(s.toNode) === key);
      const media = (data?.media || []).filter((m) => (node.type === "BHQ" ? m.kind === "BLOCK_INFRA" : m.kind === "GP_INFRA" && m.gpLgdCode === node.code));
      return {
        title: nodeTitle(node),
        subtitle: node.type === "BHQ" ? "Block HQ" : `GP · LGD ${node.code}`,
        body: <NodeDetail node={node} infra={infraFor(node)} sections={touching} media={media} onSection={(s) => setSelected({ kind: "section", section: s })} />,
        actions: <OpenButton label={infraFor(node) ? "Open infra" : "Capture infra"} onClick={() => openInfra(node)} />,
      };
    }
    if (selected.kind === "section") {
      const s = selected.section;
      const subs = (data?.subsections || []).filter((x) => x.sectionId === s._id);
      return {
        title: s.name,
        subtitle: [s.fromName, s.toName].filter(Boolean).join(" → "),
        body: <SectionDetail section={s} subsections={subs} />,
        actions: (
          <>
            <L14Button
              onClick={() => {
                setSelected(null);
                setView("section", { section: s._id });
              }}
            />
            <OpenButton label="Open section" onClick={() => openSection(s)} />
          </>
        ),
      };
    }
    if (selected.kind === "sub") {
      const sub = selected.sub;
      const media = selected.media || (data?.media || []).filter((m) => m.subSectionId === sub._id);
      return {
        title: sub.name || "Subsection",
        subtitle: sub.sectionName,
        body: <SubsectionDetail sub={sub} span={selected.span} media={media} />,
        actions: <OpenButton label={sub.legacy ? "Open trenching" : "Open job card"} onClick={() => openSub(sub)} />,
      };
    }
    return { title: selected.title, subtitle: section?.name, body: <MediaList items={selected.items} /> };
  })();

  const exportPdf = async () => {
    if (!svgRef.current) return;
    try {
      setExporting(true);
      const name = `L14-${titleCase(blockProfile.block).replace(/[^A-Za-z0-9]+/g, "-")}.pdf`;
      await exportA4Pdf(svgRef.current, name, `${titleCase(blockProfile.block)} · LGD ${blockProfile.blockCode} · generated ${fmtDateTime(new Date())} IST · Locus`);
      showToast(`Saved ${name}`);
    } catch (e) {
      showToast(e.message || "Export failed", "error");
    } finally {
      setExporting(false);
    }
  };

  // ---- render
  const toolbar = (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mb: 2 }}>
      <ToggleButtonGroup size="small" exclusive value={view} onChange={(e, v) => v && setView(v)} aria-label="Diagram">
        <ToggleButton value="l14">
          <AccountTreeOutlinedIcon fontSize="small" sx={{ mr: 0.75 }} />
          L-14
        </ToggleButton>
        <ToggleButton value="section">
          <TimelineIcon fontSize="small" sx={{ mr: 0.75 }} />
          Section chainage
        </ToggleButton>
      </ToggleButtonGroup>
      {view === "section" && sections.length > 0 && (
        <TextField select size="small" label="Section" value={sectionId || ""} onChange={(e) => setView("section", { section: e.target.value })} sx={{ minWidth: { xs: "100%", sm: 280 } }}>
          {sections.map((s) => (
            <MenuItem key={s._id} value={s._id}>
              {s.name} · {fmtDistance(s.sectionLength)}
            </MenuItem>
          ))}
        </TextField>
      )}
      <Box sx={{ flex: 1 }} />
      {view === "l14" && data && (
        <Button
          variant="contained"
          size="small"
          startIcon={exporting ? <CircularProgress size={14} color="inherit" /> : <PictureAsPdfOutlinedIcon />}
          onClick={exportPdf}
          disabled={exporting}
        >
          Export A4 PDF
        </Button>
      )}
      <Tooltip title="Reload">
        <IconButton onClick={reload} aria-label="Reload the diagram data">
          <RefreshIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );

  let body;
  if (!data) {
    body = error ? (
      <Alert severity="error" action={<Button color="inherit" size="small" onClick={reload}>Retry</Button>}>
        {error}
      </Alert>
    ) : (
      <Skeleton variant="rounded" height={420} />
    );
  } else if (view === "l14") {
    body = (
      <>
        <Box sx={{ overflowX: "auto", border: 1, borderColor: "divider", borderRadius: 1 }}>
          <Box sx={{ minWidth: 820 }}>
            <L14Schematic ref={svgRef} blockProfile={blockProfile} features={features} onSelect={setSelected} />
          </Box>
        </Box>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.75 }}>
          Joint closures aren&apos;t recorded on their own yet, so they are derived: a BJC where three or more routes meet, an SJC at each splicing point. Mark a section as an existing route in its edit dialog to draw it dashed.
        </Typography>
      </>
    );
  } else if (!section) {
    body = (
      <Card>
        <EmptyState icon={<TimelineIcon />} title="No sections yet" text="Add sections to this block to see their L14 diagrams." />
      </Card>
    );
  } else {
    body = (
      <>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          {section.name}
          <Typography component="span" variant="body2" sx={{ color: "text.secondary", ml: 1 }}>
            {[section.fromName, section.toName].filter(Boolean).join(" → ")}
          </Typography>
        </Typography>
        <L14Diagram
          key={section._id}
          section={section}
          subsections={(data.subsections || []).filter((s) => s.sectionId === section._id)}
          media={(data.media || []).filter((m) => m.sectionId === section._id)}
          nodeInfo={nodeInfo}
          onSelect={setSelected}
        />
        <L14Legend />
      </>
    );
  }

  return (
    <Box>
      {toolbar}
      {error && data && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {body}
      <DetailPanel open={Boolean(panel)} title={panel?.title} subtitle={panel?.subtitle} actions={panel?.actions} onClose={() => setSelected(null)}>
        {panel?.body}
      </DetailPanel>
    </Box>
  );
};

export default BlockDiagramsPanel;
