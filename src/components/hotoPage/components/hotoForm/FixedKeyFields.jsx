import { Paper, Typography, Grid, TextField } from "@mui/material";

const FixedKeyFields = ({ fields, onChange }) => {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 2, color: "text.secondary" }}>
        Required Information
      </Typography>
      <Grid container spacing={2}>
        {Object.entries(fields).map(([key, value]) => (
          <Grid item xs={12} sm={6} key={key}>
            <TextField
              fullWidth
              name={key}
              label={key.charAt(0).toUpperCase() + key.slice(1)}
              value={value}
              onChange={onChange}
              size="small"
            />
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default FixedKeyFields;
