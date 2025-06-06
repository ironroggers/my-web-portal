import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { useRef, useState } from "react";
import LocationSection from "./hotoForm/LocationSection/LocationSection";
import ContactPersonSection from "./hotoForm/ContactPersonSection/ContactPersonSection";
import FieldsSection from "./hotoForm/FieldsSection/FieldsSection";
import { uploadHotoMedia, createHoto } from "../../../services/hotoPageService";

const AddHotoModal = ({
  open,
  onClose,
  locationId,
  locationName,
  locationDistrict,
  fetchAllHotoInfo,
}) => {
  const [location, setLocation] = useState({
    state: "kerala",
    blockName: locationName,
    blockCode: "",
    districtName: locationDistrict,
    districtCode: "",
    latitude: "",
    longitude: "",
    hotoType: "",
    gpName: "",
    gpCode: "",
    ofcName: "",
    ofcCode: "",
    remarks: "",
  });

  const [contactPerson, setContactPerson] = useState({
    name: "",
    email: "",
    mobile: "",
    description: "",
  });

  const [fields, setFields] = useState([]);
  const dialogContentRef = useRef(null);

  const ScrollDialogContent = () => {
    if (dialogContentRef.current) {
      dialogContentRef.current.scrollTo({
        top: dialogContentRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const handleSubmit = async () => {
    try {
      // First upload media files if any exist
      const fieldsWithMedia = await Promise.all(
        fields.map(async (field) => {
          if (field.mediaFiles && field.mediaFiles.length > 0) {
            const uploadedMedia = await uploadHotoMedia({
              fields: [field],
            });
            return uploadedMedia.fields[0];
          }
          return field;
        })
      );

      console.log(fieldsWithMedia);

      // Prepare the HOTO data according to the API schema
      const hotoData = {
        locationId: locationId,
        ...location,
        contactPerson: contactPerson,
        fields: fieldsWithMedia,
      };

      const response = await createHoto(hotoData);
      console.log("HOTO created successfully:", response);
      fetchAllHotoInfo();
      onClose();
    } catch (error) {
      console.error("Error creating HOTO:", error);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            bgcolor: "background.paper",
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          px: 3,
          py: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        Add New HOTO
      </DialogTitle>

      <DialogContent sx={{ p: 3 }} ref={dialogContentRef}>
        {/* We'll add form content step by step */}
        <LocationSection location={location} setLocation={setLocation} />
        <ContactPersonSection
          contactPerson={contactPerson}
          setContactPerson={setContactPerson}
        />
        <FieldsSection
          fields={fields}
          setFields={setFields}
          scrollDialogContent={ScrollDialogContent}
          location={location}
          setLocation={setLocation}
        />
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Button onClick={onClose} variant="outlined" color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddHotoModal;
