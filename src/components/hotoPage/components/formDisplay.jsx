import { Box, Typography } from "@mui/material";
import LocationSection from "./formDisplay/LocationSection";
import ContactPersonSection from "./formDisplay/ContactPersonSection";
import FieldsSection from "./formDisplay/FieldsSection";

const FormDisplay = ({ data }) => {
  if (!data || Object.keys(data).length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="body1" color="text.secondary">
          Please select an item to view details
        </Typography>
      </Box>
    );
  }

  const locationData = {
    state: data.state,
    districtCode: data.districtCode,
    districtName: data.districtName,
    blockCode: data.blockCode,
    blockName: data.blockName,
    gpCode: data.gpCode,
    gpName: data.gpName,
    ofcCode: data.ofcCode,
    ofcName: data.ofcName,
    hotoType: data.hotoType,
    latitude: data.latitude,
    longitude: data.longitude,
    remarks: data.remarks,
  };

  return (
    <Box sx={{ mt: 3 }}>
      <LocationSection data={locationData} />
      <ContactPersonSection data={data.contactPerson} />
      <FieldsSection fields={data.fields} />
    </Box>
  );
};

export default FormDisplay;
