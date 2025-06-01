import { Paper, Typography, Grid, TextField } from "@mui/material";

const ReadOnlyFields = ({ fields }) => {
  return (
    <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
      <Typography variant="subtitle2" sx={{ mb: 2, color: "text.secondary" }}>
        Location Details (Read-only)
      </Typography>
      <Grid container spacing={2}>
        {Object.entries(fields).map(([key, value]) => (
          <Grid item xs={12} sm={6} key={key}>
            <TextField
              fullWidth
              label={key.charAt(0).toUpperCase() + key.slice(1)}
              value={value}
              InputProps={{ readOnly: true }}
              size="small"
            />
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default ReadOnlyFields;
