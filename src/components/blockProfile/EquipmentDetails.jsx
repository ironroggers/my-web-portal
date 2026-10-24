import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import DetailRow from "../common/DetailRow";
import { fmtLatLong } from "../../utils/executionFormat";
import { formatNumber } from "../../utils/formatNumber";
import ExecMediaViewer from "../execution/ExecMediaViewer";
import { MediaThumb } from "../execution/MediaPicker";
import { EQUIPMENT_FORMS, miscItemsOf, miscTypeLabel, photosOf } from "./equipmentForms";

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
  // The photo open in the viewer: the sheet's geo photo or a misc type's
  const [viewing, setViewing] = useState(null);
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
          {section.fields.map((f) =>
            f.type === "miscItems" ? (
              // One row per type: its asset code, model and serial no.
              miscItemsOf(record).map((item) => {
                const details = [item.model && `Model ${item.model}`, item.serialNo && `SN ${item.serialNo}`].filter(Boolean).join(" · ");
                return (
                  <DetailRow key={item.type} label={miscTypeLabel(item.type)}>
                    <Box component="span" sx={{ fontFamily: "monospace" }}>
                      {item.assetCode || "—"}
                    </Box>
                    {details && (
                      <Box component="span" sx={{ display: "block", color: "text.secondary" }}>
                        {details}
                      </Box>
                    )}
                    {photosOf(item).length ? (
                      <Box sx={{ mt: 0.75, display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                        {photosOf(item).map((m) => (
                          <MediaThumb key={m.url} media={m} size={56} onClick={() => setViewing(m)} />
                        ))}
                      </Box>
                    ) : (
                      <Box component="span" sx={{ display: "block", color: "text.disabled" }}>
                        No image yet
                      </Box>
                    )}
                  </DetailRow>
                );
              })
            ) : (
              <DetailRow key={f.key} label={f.label}>
                <Box component="span" sx={f.key === "assetCode" || f.type === "mac" || f.type === "ip" ? { fontFamily: "monospace" } : undefined}>
                  {display(f, record[f.key])}
                </Box>
              </DetailRow>
            )
          )}
        </Group>
      ))}
      <Group title="Location & images">
        <DetailRow label="Latitude, longitude">{fmtLatLong(record.latitude, record.longitude)}</DetailRow>
        <DetailRow label="Images">
          {photosOf(record).length ? `${photosOf(record).length} taken` : formKey === "misc" ? "Per type, above" : "—"}
        </DetailRow>
        {photosOf(record).length > 0 && (
          <Box sx={{ mt: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
            {photosOf(record).map((m) => (
              <MediaThumb key={m.url} media={m} onClick={() => setViewing(m)} />
            ))}
          </Box>
        )}
      </Group>
      {viewing && <ExecMediaViewer media={viewing} onClose={() => setViewing(null)} />}
    </Box>
  );
};

export default EquipmentDetails;
