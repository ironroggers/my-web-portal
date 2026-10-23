import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import DetailRow from "../common/DetailRow";
import { fmtLatLong } from "../../utils/executionFormat";
import { formatNumber } from "../../utils/formatNumber";
import ExecMediaViewer from "../execution/ExecMediaViewer";
import { MediaThumb } from "../execution/MediaPicker";
import { EQUIPMENT_FORMS } from "./equipmentForms";

const display = (field, value) => {
  if (value === undefined || value === null || value === "") return "—";
  if (field.type === "enum") return field.options.find((o) => o.value === String(value))?.label || String(value);
  if (field.type === "metres") return `${formatNumber(Number(value))} m`;
  return String(value);
};

const Group = ({ title, children }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography variant="overline" sx={{ color: "text.secondary", display: "block", lineHeight: 2 }}>
      {title}
    </Typography>
    {children}
  </Box>
);

/** Every field of a saved equipment sheet, grouped as on the form; empty ones show "—" */
const EquipmentDetails = ({ formKey, record, columns = { xs: 1, md: 2 } }) => {
  const [viewing, setViewing] = useState(false);
  const spec = EQUIPMENT_FORMS[formKey];
  const repeat = (n) => `repeat(${n}, minmax(0, 1fr))`;
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: Object.fromEntries(Object.entries(columns).map(([bp, n]) => [bp, repeat(n)])),
        columnGap: 3,
        rowGap: 2,
      }}
    >
      {spec.sections.map((section) => (
        <Group key={section.title} title={section.title}>
          {section.fields.map((f) => (
            <DetailRow key={f.key} label={f.label}>
              <Box component="span" sx={f.key === "assetCode" || f.type === "mac" || f.type === "ip" ? { fontFamily: "monospace" } : undefined}>
                {display(f, record[f.key])}
              </Box>
            </DetailRow>
          ))}
        </Group>
      ))}
      <Group title="Location & photo">
        <DetailRow label="Latitude, longitude">{fmtLatLong(record.latitude, record.longitude)}</DetailRow>
        <DetailRow label="Geo photo">{record.geoPhoto ? "Attached" : "—"}</DetailRow>
        {record.geoPhoto && (
          <Box sx={{ mt: 1 }}>
            <MediaThumb media={record.geoPhoto} onClick={() => setViewing(true)} />
          </Box>
        )}
      </Group>
      {viewing && <ExecMediaViewer media={record.geoPhoto} onClose={() => setViewing(false)} />}
    </Box>
  );
};

export default EquipmentDetails;
