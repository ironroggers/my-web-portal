import { useState } from "react";
import { Box, Button, Skeleton, Typography } from "@mui/material";
import FunctionsIcon from "@mui/icons-material/Functions";
import SectionCard from "../common/SectionCard";
import { formatNumber } from "../../utils/formatNumber";

const COLLAPSED_STORAGE_KEY = "summary.totalsCollapsed";

const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

// API keys use underscores and title-cased acronyms ("Gp_Routers", "Frt_Teams").
const ACRONYMS = { Gps: "GPs", Gp: "GP", Hoto: "HOTO", Boq: "BOQ", Hdd: "HDD", Snoc: "SNOC", Row: "ROW", Frt: "FRT" };

const humanize = (key) =>
  key
    .split("_")
    .filter(Boolean)
    .map((word) => ACRONYMS[word] ?? word)
    .join(" ");

// Reusable component for displaying a stat
const StatItem = ({ label, value }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, py: 0.25 }}>
    <Typography variant="body2" sx={{ color: "text.secondary" }}>
      {humanize(label)}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
      {formatNumber(value)}
    </Typography>
  </Box>
);

// Reusable component for a category section
const Section = ({ title, data }) => (
  <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, px: 1.75, py: 1.25 }}>
    <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
      {humanize(title)}
    </Typography>
    {data && typeof data === "object" ? (
      Object.entries(data).map(([key, value]) => <StatItem key={key} label={key} value={value} />)
    ) : (
      <Typography variant="body2">{formatNumber(data)}</Typography>
    )}
  </Box>
);

const SummaryDisplay = ({ summary }) => {
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggleCollapsed = () => {
    setCollapsed((previous) => {
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, String(!previous));
      } catch {
        // Remembering the preference is best-effort.
      }
      return !previous;
    });
  };

  if (summary === undefined) return <Skeleton variant="rounded" height={200} />;
  if (!summary?.Summary) return null;

  // State is shown in the page header
  const { State, ...sections } = summary.Summary;

  return (
    <SectionCard
      title="Category totals"
      subtitle="Latest computed totals for each category"
      icon={<FunctionsIcon />}
      action={
        <Button size="small" onClick={toggleCollapsed} aria-expanded={!collapsed}>
          {collapsed ? "Show" : "Hide"}
        </Button>
      }
    >
      {!collapsed && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: 1.5,
          }}
        >
          {Object.entries(sections).map(([key, value]) => (
            <Section key={key} title={key} data={value} />
          ))}
        </Box>
      )}
    </SectionCard>
  );
};

export default SummaryDisplay;
