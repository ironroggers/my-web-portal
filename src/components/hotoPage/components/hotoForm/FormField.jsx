import { TextField } from "@mui/material";

// `span` stretches the field across both columns of a FormSection grid
const FormField = ({ label, value, onChange, multiline = false, rows = 1, span = false, sx, ...props }) => (
  <TextField
    label={label}
    variant="outlined"
    fullWidth
    size="small"
    value={value ?? ""}
    onChange={onChange}
    multiline={multiline}
    // A fixed `rows` would override minRows/maxRows on auto-growing fields
    rows={multiline && !props.minRows && !props.maxRows ? rows : undefined}
    sx={{ ...(span && { gridColumn: "1 / -1" }), ...sx }}
    {...props}
  />
);

export default FormField;
