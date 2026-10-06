import { MenuItem, TextField } from "@mui/material";
import { HOTO_TYPES } from "../../../../hotoTypes";

const HotoTypeSelector = ({ value, onChange, error }) => (
  <TextField
    select
    label="HOTO type"
    value={value ?? ""}
    onChange={onChange}
    size="small"
    fullWidth
    required
    error={Boolean(error)}
    helperText={error}
  >
    {HOTO_TYPES.map((type) => (
      <MenuItem key={type.value} value={type.value}>
        {type.label}
      </MenuItem>
    ))}
  </TextField>
);

export default HotoTypeSelector;
