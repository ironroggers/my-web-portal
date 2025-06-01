import { Box, Typography } from "@mui/material";
import {
  FormField,
  HotoTypeSelector,
  BasicLocationFields,
  GpFields,
  OfcFields,
} from "./components";

const LocationSection = ({ location, setLocation }) => {
  const handleChange = (field) => (event) => {
    setLocation((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Location
      </Typography>
      <Box>
        <BasicLocationFields location={location} handleChange={handleChange} />

        <HotoTypeSelector
          value={location.hotoType}
          onChange={handleChange("hotoType")}
        />

        {(location.hotoType === "gp" || location.hotoType === "ofc") && (
          <GpFields location={location} handleChange={handleChange} />
        )}

        {location.hotoType === "ofc" && (
          <OfcFields location={location} handleChange={handleChange} />
        )}

        <FormField
          label="Remarks"
          value={location.remarks}
          onChange={handleChange("remarks")}
          multiline
          rows={2}
        />
      </Box>
    </Box>
  );
};

export default LocationSection;
