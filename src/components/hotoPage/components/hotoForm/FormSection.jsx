import { Box, Typography } from "@mui/material";

/**
 * A titled block of the HOTO form. Children sit in a two-column grid
 * (one column on phones) unless `grid` is false.
 */
const FormSection = ({ title, description, action, grid = true, children }) => (
  <Box component="section">
    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.4 }}>
          {title}
        </Typography>
        {description && (
          <Typography variant="caption" component="p" sx={{ color: "text.secondary" }}>
            {description}
          </Typography>
        )}
      </Box>
      {action}
    </Box>
    {grid ? (
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>{children}</Box>
    ) : (
      children
    )}
  </Box>
);

export default FormSection;
