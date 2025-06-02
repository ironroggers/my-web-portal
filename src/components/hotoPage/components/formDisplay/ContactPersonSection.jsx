import { Box, Typography } from "@mui/material";
import { INTERNAL_FIELDS } from "./utils";
import DataTable from "./DataTable";

const ContactPersonSection = ({ data }) => {
  if (!data || Object.keys(data).length === 0) return null;

  const filteredData = Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) =>
        !INTERNAL_FIELDS.includes(key) &&
        value !== null &&
        value !== undefined &&
        value !== ""
    )
  );

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2, color: "primary.main" }}>
        Contact Person
      </Typography>
      <DataTable data={filteredData} />
    </Box>
  );
};

export default ContactPersonSection; 