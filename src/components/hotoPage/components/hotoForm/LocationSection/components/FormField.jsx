import { TextField } from "@mui/material";

const FormField = ({ label, value, onChange, multiline = false, rows = 1 }) => (
  <TextField
    label={label}
    variant="outlined"
    fullWidth
    size="small"
    value={value}
    onChange={onChange}
    multiline={multiline}
    rows={rows}
  />
);

export default FormField; 