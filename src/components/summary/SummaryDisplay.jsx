import { Box, Typography } from "@mui/material";

// Reusable component for displaying a stat
const StatItem = ({ label, value }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={500}>
      {value}
    </Typography>
  </Box>
);

// Reusable component for a category section
const Section = ({ title, data }) => (
  <Box sx={{ mb: 2, p: 2, borderRadius: 5, boxShadow: 1 }}>
    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
      {title}
    </Typography>
    <Box>
      {Object.entries(data).map(([key, value]) => (
        <StatItem key={key} label={key.replace(/_/g, " ")} value={value} />
      ))}
    </Box>
  </Box>
);

const SummaryDisplay = ({ summary }) => {
  if (!summary?.Summary) return null;

  const data = summary.Summary;
  const { State, ...sections } = data;

  return (
    <Box sx={{ p: 2 }}>
      {State && (
        <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
          {State}
        </Typography>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 3,
        }}
      >
        {Object.entries(sections).map(([key, value]) => (
          <Section key={key} title={key.replace(/_/g, " ")} data={value} />
        ))}
      </Box>
    </Box>
  );
};

export default SummaryDisplay;
