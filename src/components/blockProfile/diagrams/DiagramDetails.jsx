import React, { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import TimelineIcon from "@mui/icons-material/Timeline";
import { useExecutionConfig } from "../../../hooks/useExecutionConfig";
import { fmtDateTime, fmtDistance, fmtLatLong } from "../../../utils/executionFormat";
import ExecMediaViewer from "../../execution/ExecMediaViewer";
import { ExecStatusPill, RestorationPill, StackBar, TypeTag } from "../../execution/execUi";
import { MediaRow } from "../BlockMapPanel";
import { fmtChainage } from "./diagramGeometry";

/**
 * Details of whatever was clicked on a diagram: a right-side drawer on wide screens and
 * a full-screen dialog on phones (as the reference point dialog does).
 */
export const DetailPanel = ({ open, title, subtitle, onClose, actions, children }) => {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up("md"));
  const head = (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h6" sx={{ overflowWrap: "anywhere" }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      <IconButton onClick={onClose} aria-label="Close" size="small">
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );
  if (wide) {
    return (
      <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 420, p: 3, display: "flex", flexDirection: "column" } }}>
        {head}
        <Box sx={{ flex: 1, overflowY: "auto", mt: 2 }}>{children}</Box>
        {actions && <Stack direction="row" spacing={1} useFlexGap sx={{ pt: 2, flexWrap: "wrap" }}>{actions}</Stack>}
      </Drawer>
    );
  }
  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <DialogTitle>{head}</DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      {actions && <DialogActions sx={{ px: 2, py: 1.5, flexWrap: "wrap", gap: 1 }}>{actions}</DialogActions>}
    </Dialog>
  );
};

const Row = ({ label, children }) =>
  children === undefined || children === null || children === "" ? null : (
    <Box sx={{ display: "flex", gap: 2, py: 0.5 }}>
      <Typography variant="body2" sx={{ color: "text.secondary", width: 110, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography component="div" variant="body2" sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
        {children}
      </Typography>
    </Box>
  );

const Heading = ({ children }) => (
  <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 0.5 }}>
    {children}
  </Typography>
);

/** Attachments at one place, each opening the media viewer */
export const MediaList = ({ items }) => {
  const { config } = useExecutionConfig();
  const [viewing, setViewing] = useState(null);
  if (!items?.length) return null;
  return (
    <Box>
      {items.map((m) => (
        <MediaRow key={m.id} m={m} limit={config?.accuracyLimitM ?? 1} onOpen={(item) => setViewing({ ...item, latitude: item.lat, longitude: item.lng })} />
      ))}
      {viewing && <ExecMediaViewer media={viewing} onClose={() => setViewing(null)} />}
    </Box>
  );
};

/** BHQ or GP: where it is, its infra capture and the sections that touch it */
export const NodeDetail = ({ node, infra, sections, media, onSection }) => (
  <Box>
    <Row label="Type">{node.type === "BHQ" ? "Block HQ (BHQ)" : "Gram Panchayat"}</Row>
    <Row label={node.type === "BHQ" ? "Code" : "LGD code"}>{node.code}</Row>
    <Row label="Coordinates">{node.lat != null ? fmtLatLong(node.lat, node.lng) : "Not set"}</Row>
    <Row label="Infra">
      {infra ? `Captured · ${infra.photoCount} ${infra.photoCount === 1 ? "photo" : "photos"} · ${fmtDateTime(infra.updatedAt)}` : "Not captured"}
    </Row>
    <Heading>Sections ({sections.length})</Heading>
    {sections.length ? (
      sections.map((s) => (
        <Box
          key={s._id}
          onClick={() => onSection(s)}
          sx={{ py: 1, borderTop: 1, borderColor: "divider", cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
              {s.name}
            </Typography>
            {s.restorationStatus && <RestorationPill status={s.restorationStatus} />}
          </Box>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {[s.fromName, s.toName].filter(Boolean).join(" → ")} · {fmtDistance(s.sectionLength)}
          </Typography>
        </Box>
      ))
    ) : (
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        No sections start or end here.
      </Typography>
    )}
    {media?.length > 0 && (
      <>
        <Heading>Infra photos ({media.length})</Heading>
        <MediaList items={media} />
      </>
    )}
  </Box>
);

/** Section: ends, length, status split, restoration */
export const SectionDetail = ({ section, subsections }) => {
  const done = subsections.reduce((sum, s) => sum + s.entries.reduce((a, e) => a + (Number(e.length) || 0), 0), 0);
  return (
    <Box>
      <Row label="From">{section.fromName || "—"}</Row>
      <Row label="To">{section.toName || "—"}</Row>
      <Row label="Length">{fmtDistance(section.sectionLength)}</Row>
      <Row label="Subsections">{section.total}</Row>
      <Row label="Done (ducting)">{fmtDistance(done)}</Row>
      <Row label="Restoration">{section.restorationStatus ? <RestorationPill status={section.restorationStatus} /> : "—"}</Row>
      {section.counts && (
        <Box sx={{ mt: 1 }}>
          <StackBar counts={section.counts} legend />
        </Box>
      )}
    </Box>
  );
};

const PitBlock = ({ title, pit }) =>
  pit ? (
    <>
      <Heading>{title}</Heading>
      <Row label="Recorded">{fmtDateTime(pit.at)}</Row>
      <Row label="Location">{fmtLatLong(pit.lat, pit.lng)}</Row>
      {pit.refs?.map((r, i) => (
        <Row key={i} label={`Reference ${i + 1}`}>
          {r.description || "—"}
          <Typography variant="caption" component="div" sx={{ color: "text.secondary" }}>
            Tape {fmtDistance(r.tapeDistanceM)}
            {r.gpsDistanceM != null ? ` · GPS ${fmtDistance(r.gpsDistanceM)}` : ""}
          </Typography>
        </Row>
      ))}
    </>
  ) : null;

/** Subsection on the L14 line: type, status, where it sits, site condition and pits */
export const SubsectionDetail = ({ sub, span, media }) => {
  const { typeOf } = useExecutionConfig();
  const type = typeOf(sub.typeOfWork);
  const done = sub.entries.reduce((a, e) => a + (Number(e.length) || 0), 0);
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
        <TypeTag type={type} />
        {sub.legacy ? <Chip size="small" label="Older (trenching)" /> : <ExecStatusPill status={sub.executionStatus} />}
      </Stack>
      <Row label="Type of work">{type?.full || type?.label || (sub.legacy ? "Trenching" : sub.typeOfWork)}</Row>
      <Row label="Road">{sub.roadName}</Row>
      {span && (
        <Row label="Chainage">
          {fmtChainage(span.start)} – {fmtChainage(span.end)}
          {span.approx ? " (approximate: no From/To on this subsection)" : ""}
        </Row>
      )}
      <Row label="Planned">{fmtDistance(sub.subSectionLength)}</Row>
      {type?.kind === "ducting" && <Row label="Done">{fmtDistance(done)}</Row>}
      <Row label="Entries">{sub.entries.length}</Row>
      <Row label="Terrain">{sub.terrain}</Row>
      <Row label="Crossing">{sub.crossing}</Row>
      <Row label="OFC side">{sub.ofcSide}</Row>
      <PitBlock title={type?.pitA || "Start"} pit={sub.start} />
      <PitBlock title={type?.pitB || "End"} pit={sub.end} />
      {media?.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Heading>Attachments ({media.length})</Heading>
          <MediaList items={media} />
        </>
      )}
    </Box>
  );
};

// Buttons used by the panels
export const OpenButton = ({ label, onClick }) => (
  <Button variant="contained" size="small" endIcon={<OpenInNewIcon fontSize="small" />} onClick={onClick}>
    {label}
  </Button>
);
export const L14Button = ({ onClick }) => (
  <Button variant="outlined" size="small" startIcon={<TimelineIcon fontSize="small" />} onClick={onClick}>
    Show L14
  </Button>
);
