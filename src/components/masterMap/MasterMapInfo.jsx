import React, { useState } from "react";
import { Box, Button, Link, Stack, Typography } from "@mui/material";
import ZoomInOutlinedIcon from "@mui/icons-material/ZoomInOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import { fmtDateTime, fmtDistance } from "../../utils/executionFormat";
import { titleCase } from "../execution/execConstants";
import EquipmentDetails from "../blockProfile/EquipmentDetails";
import { InfoTitle, Line2, MediaRow } from "../blockProfile/BlockMapPanel";
import { EQUIPMENT_TITLES, pathLengthM, subKey } from "./masterMapLayers";
import { SITE_TYPES } from "../blockProfile/blockProfileConstants";
import { pathLength } from "../blockProfile/roadPaths";

const formatPoint = (point) => `${Number(point.lat).toFixed(6)}, ${Number(point.lng).toFixed(6)}`;

// KML descriptions are HTML; show their text only
const plainText = (html) => {
  if (!html) return "";
  try {
    return new DOMParser().parseFromString(String(html), "text/html").body.textContent?.trim() || "";
  } catch {
    return "";
  }
};

const Status = ({ done, label, text }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, py: 0.25 }}>
    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: done ? "success.main" : "text.disabled", flexShrink: 0 }} />
    <Typography variant="caption">
      <b>{label}:</b> {text}
    </Typography>
  </Box>
);

/**
 * The card for a clicked feature. Read only and self-contained: it shows what's recorded
 * and offers Zoom to and Copy coordinates, with no links out of the master map.
 * `selected` is { kind, position, item, block, district, … } from MasterMapBlockLayers.
 */
const MasterMapInfo = ({ selected, data, roads, config, limit, onSelect, onZoom, onViewMedia }) => {
  const [copied, setCopied] = useState(false);
  const { kind, item, position } = selected;
  const statusLabel = (key) => (key === "LEGACY" ? "Older (trenching)" : config?.statuses?.[key]?.label || key);
  const restorationLabel = (key) => config?.restorationStates?.[key]?.label || key || "—";

  // Block router or GP: what's recorded at the site; an equipment sheet opens in this card
  const site = (infraOf, gpLgdCode, forms) => {
    const capture = (data?.infra || []).find(infraOf);
    return (
      <Box sx={{ mt: 0.75 }}>
        <Status label="Infra capture" done={Boolean(capture)} text={capture ? `${capture.photoCount} ${capture.photoCount === 1 ? "photo" : "photos"}` : "not captured"} />
        {forms.map((form) => {
          const e = (data?.equipment || []).find((x) => x.form === form && (x.gpLgdCode || null) === gpLgdCode);
          return (
            <Box key={form} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Status label={EQUIPMENT_TITLES[form]} done={Boolean(e)} text={e ? e.assetCode || "filled" : "not filled"} />
              </Box>
              {e && (
                <Link component="button" variant="caption" onClick={() => onSelect({ ...selected, kind: "equipment", item: e, position: Number.isFinite(e.lat) ? { lat: e.lat, lng: e.lng } : position })}>
                  View
                </Link>
              )}
            </Box>
          );
        })}
      </Box>
    );
  };

  const bodies = {
    router: () => (
      <>
        <InfoTitle sub={`Block router · block LGD ${selected.blockCode}`}>Block router</InfoTitle>
        {SITE_TYPES[item?.siteType] && <Line2>{SITE_TYPES[item.siteType]}</Line2>}
        <Line2>{item?.address}</Line2>
        {site((i) => i.level === "BLOCK", null, ["block", "misc"])}
      </>
    ),
    gp: () => (
      <>
        <InfoTitle sub={`Gram Panchayat · LGD ${item.lgdCode}`}>{titleCase(item.name)}</InfoTitle>
        {site((i) => i.level === "GP" && i.gpLgdCode === item.lgdCode, item.lgdCode, ["gp", "misc"])}
      </>
    ),
    ring: () => (
      <>
        <InfoTitle sub="Ring link (clockwise), from the GP equipment sheets">{`${titleCase(item.fromName)} → ${titleCase(item.toName)}`}</InfoTitle>
        <Line2>{item.distanceM != null ? `Optical length ${fmtDistance(item.distanceM)}` : "Optical length not entered"}</Line2>
      </>
    ),
    kml: () => {
      const description = plainText(item.properties?.description?.value || item.properties?.description);
      return (
        <>
          <InfoTitle sub={`KML · ${selected.file.name}`}>{item.title || item.properties?.name || "KML feature"}</InfoTitle>
          {item.type === "polyline" && <Line2>Length {fmtDistance(pathLengthM(item.path))}</Line2>}
          {description && (
            <Typography variant="caption" component="div" sx={{ color: "text.secondary", maxHeight: 120, overflowY: "auto", whiteSpace: "pre-line" }}>
              {description}
            </Typography>
          )}
        </>
      );
    },
    section: () => (
      <>
        <InfoTitle sub={[item.fromName, item.toName].filter(Boolean).join(" → ")}>{item.name}</InfoTitle>
        <Line2>{[fmtDistance(item.sectionLength), `${item.total} ${item.total === 1 ? "subsection" : "subsections"}`, item.routeType === "EXISTING" ? "Existing route" : "New route"].join(" · ")}</Line2>
        <Line2>Restoration: {restorationLabel(item.restorationStatus)}</Line2>
        <Line2>{roads?.sections.has(item._id) ? `Road from the KML: ${fmtDistance(pathLength(roads.sections.get(item._id)))}` : "No road for it in the KML files; drawn straight"}</Line2>
      </>
    ),
    subsection: () => (
      <>
        <InfoTitle sub={[selected.what, item.sectionName].filter(Boolean).join(" · ")}>{item.name || "Subsection"}</InfoTitle>
        <Line2>{[config?.types?.[item.typeOfWork]?.label, statusLabel(subKey(item)), item.roadName].filter(Boolean).join(" · ")}</Line2>
        <Line2>
          {fmtDistance(item.subSectionLength)} planned · {item.entries.length} {item.entries.length === 1 ? "entry" : "entries"}
        </Line2>
        {item.crossing && <Line2>Crossing: {item.crossing}</Line2>}
      </>
    ),
    ref: () => (
      <>
        <InfoTitle sub={`Reference point · ${selected.subsection.name}`}>{item.description || "Reference point"}</InfoTitle>
        {item.tapeDistanceM != null && <Line2>{`Tape ${fmtDistance(item.tapeDistanceM)}${item.gpsDistanceM != null ? ` · GPS ${fmtDistance(item.gpsDistanceM)}` : ""}`}</Line2>}
      </>
    ),
    infra: () => (
      <>
        <InfoTitle sub={item.level === "BLOCK" ? "Block infra capture" : `GP infra capture · LGD ${item.gpLgdCode}`}>{titleCase(item.name)}</InfoTitle>
        <Line2>{`${item.photoCount} ${item.photoCount === 1 ? "photo" : "photos"} · saved ${fmtDateTime(item.updatedAt)}`}</Line2>
      </>
    ),
    equipment: () => (
      <Box sx={{ width: 300 }}>
        <InfoTitle sub={[titleCase(item.name), item.assetCode].filter(Boolean).join(" · ")}>{EQUIPMENT_TITLES[item.form]}</InfoTitle>
        <Box sx={{ maxHeight: 260, overflowY: "auto", pr: 1, my: 0.5 }}>
          <EquipmentDetails formKey={item.form} record={item} columns={{ xs: 1 }} />
        </Box>
      </Box>
    ),
    media: () => (
      <Box sx={{ width: 260 }}>
        <InfoTitle>
          {item.items.length} {item.items.length === 1 ? "attachment" : "attachments"}
        </InfoTitle>
        <Box sx={{ maxHeight: 260, overflowY: "auto" }}>
          {item.items.map((m) => (
            <MediaRow key={m.id} m={m} limit={limit} onOpen={onViewMedia} />
          ))}
        </Box>
      </Box>
    ),
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(formatPoint(position));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 300, color: "text.primary" }}>
      {(bodies[kind] || bodies.router)()}
      <Typography variant="caption" component="div" sx={{ color: "text.secondary", mt: 0.75, pt: 0.75, borderTop: 1, borderColor: "divider" }}>
        {[titleCase(selected.block), selected.district, selected.state].filter(Boolean).join(" · ")}
      </Typography>
      <Line2>{formatPoint(position)}</Line2>
      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, ml: -0.75 }}>
        <Button size="small" startIcon={<ZoomInOutlinedIcon />} onClick={() => onZoom(position)}>
          Zoom to
        </Button>
        <Button size="small" startIcon={<ContentCopyOutlinedIcon />} onClick={copy}>
          {copied ? "Copied" : "Copy coordinates"}
        </Button>
      </Stack>
    </Box>
  );
};

export default MasterMapInfo;
