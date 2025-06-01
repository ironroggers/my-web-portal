import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";

const HotoTypeSelector = ({ value, onChange }) => (
  <FormControl fullWidth size="small">
    <InputLabel>HOTO Type</InputLabel>
    <Select
      value={value}
      label="HOTO Type"
      onChange={onChange}
      sx={{ textTransform: "capitalize" }}
    >
      <MenuItem sx={{ textTransform: "capitalize" }} value="block">
        block
      </MenuItem>
      <MenuItem sx={{ textTransform: "capitalize" }} value="gp">
        gp
      </MenuItem>
      <MenuItem sx={{ textTransform: "capitalize" }} value="ofc">
        ofc
      </MenuItem>
    </Select>
  </FormControl>
);

export default HotoTypeSelector; 