import { Box, Typography } from "@mui/material";

// Colours match the routes and markers drawn by the map components
const ROUTE_COLOR = "#2563eb";
const SURVEY_ROUTE_COLOR = "#f59e0b";

const LineSwatch = ({ color }) => (
  <Box component="span" sx={{ width: 18, height: 4, borderRadius: 1, bgcolor: color, flexShrink: 0 }} />
);

const DotSwatch = ({ color }) => (
  <Box
    component="span"
    sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: color, border: "2px solid #111827", flexShrink: 0 }}
  />
);

const LegendItem = ({ swatch, label, count }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
    {swatch}
    <Typography variant="caption" sx={{ color: "text.primary", whiteSpace: "nowrap" }}>
      {label}
      {count !== undefined && (
        <Box component="span" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
          {" "}
          ({count})
        </Box>
      )}
    </Typography>
  </Box>
);

/** Map legend: route lines, editable points and survey markers with their counts. */
const SymbolsComponent = ({ surveys }) => {
  const countOf = (type) => surveys.filter((survey) => survey.surveyType === type).length;

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        columnGap: 2.5,
        rowGap: 1,
        px: 2,
        py: 1.25,
        borderTop: 1,
        borderColor: "divider",
      }}
    >
      <LegendItem swatch={<LineSwatch color={ROUTE_COLOR} />} label="Desktop survey route" />
      <LegendItem swatch={<LineSwatch color={SURVEY_ROUTE_COLOR} />} label="Physical survey route (accepted)" />
      <LegendItem swatch={<DotSwatch color="#ff9800" />} label="Temporary point" />
      <LegendItem swatch={<DotSwatch color="#ffffff" />} label="Other point (not exported)" />
      <LegendItem swatch={<DotSwatch color="#3498db" />} label="Block survey" count={countOf("block")} />
      <LegendItem swatch={<DotSwatch color="#e74c3c" />} label="GP survey" count={countOf("gp")} />
      <LegendItem swatch={<DotSwatch color="#27ae60" />} label="OFC survey" count={countOf("ofc")} />
    </Box>
  );
};

export default SymbolsComponent;
