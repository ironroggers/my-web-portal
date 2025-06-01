import { Box, Typography } from "@mui/material";
import { ContactFields } from "./components";

const ContactPersonSection = ({ contactPerson, setContactPerson }) => {
  const handleChange = (field) => (event) => {
    setContactPerson((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Contact Person
      </Typography>
      <Box>
        <ContactFields
          contactPerson={contactPerson}
          handleChange={handleChange}
        />
      </Box>
    </Box>
  );
};

export default ContactPersonSection;
