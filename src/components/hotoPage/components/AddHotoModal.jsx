import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Typography,
  Box,
} from "@mui/material";
import { useRef, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import LocationSection from "./hotoForm/LocationSection/LocationSection";
import ContactPersonSection from "./hotoForm/ContactPersonSection/ContactPersonSection";
import FieldsSection from "./hotoForm/FieldsSection/FieldsSection";

const AddHotoModal = ({
  open,
  onClose,
  locationId,
  locationName,
  locationDistrict,
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

  const handleSubmit = () => {
    const data = {
      locationId: locationId,
      ...location,
      contactPerson: contactPerson,
      fields: fields,
    };

    console.log(data);

    // onClose();
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
