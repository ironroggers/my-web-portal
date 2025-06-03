import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Box,
} from "@mui/material";
import { useRef, useState, useEffect } from "react";
import LocationSection from "./hotoForm/LocationSection/LocationSection";
import ContactPersonSection from "./hotoForm/ContactPersonSection/ContactPersonSection";
import FieldsSection from "./hotoForm/FieldsSection/FieldsSection";
import { uploadHotoMedia, updateHoto, fetchSingleHoto } from "../../../services/hotoPageService";

const EditHotoModal = ({
  open,
  onClose,
  hotoId,
  locationId,
  locationName,
  locationDistrict,
  fetchAllHotoInfo,
}) => {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
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

  // Load existing HOTO data when modal opens
  useEffect(() => {
    if (open && hotoId) {
      loadHotoData();
    }
  }, [open, hotoId]);

  const loadHotoData = async () => {
    try {
      setInitialLoading(true);
      const hotoData = await fetchSingleHoto(hotoId);
      
      // Populate location data
      setLocation({
        state: hotoData.state || "kerala",
        blockName: hotoData.blockName || locationName,
        blockCode: hotoData.blockCode || "",
        districtName: hotoData.districtName || locationDistrict,
        districtCode: hotoData.districtCode || "",
        latitude: hotoData.latitude || "",
        longitude: hotoData.longitude || "",
        hotoType: hotoData.hotoType || "",
        gpName: hotoData.gpName || "",
        gpCode: hotoData.gpCode || "",
        ofcName: hotoData.ofcName || "",
        ofcCode: hotoData.ofcCode || "",
        remarks: hotoData.remarks || "",
      });

      // Populate contact person data
      setContactPerson({
        name: hotoData.contactPerson?.name || "",
        email: hotoData.contactPerson?.email || "",
        mobile: hotoData.contactPerson?.mobile || "",
        description: hotoData.contactPerson?.description || "",
      });

      // Populate fields data
      setFields(hotoData.fields || []);
      
    } catch (error) {
      console.error("Error loading HOTO data:", error);
    } finally {
      setInitialLoading(false);
    }
  };

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
      setLoading(true);
      
      // First upload media files if any new ones exist
      const fieldsWithMedia = await Promise.all(
        fields.map(async (field) => {
          if (field.mediaFiles && field.mediaFiles.length > 0) {
            // Check if any media files need to be uploaded (have a 'file' property)
            const newMediaFiles = field.mediaFiles.filter(media => media.file);
            
            if (newMediaFiles.length > 0) {
              const uploadedMedia = await uploadHotoMedia({
                fields: [{ ...field, mediaFiles: newMediaFiles }],
              });
              
              // Combine existing media with newly uploaded media
              const existingMedia = field.mediaFiles.filter(media => !media.file);
              return {
                ...field,
                mediaFiles: [...existingMedia, ...uploadedMedia.fields[0].mediaFiles]
              };
            }
          }
          return field;
        })
      );

      // Prepare the HOTO data according to the API schema
      const hotoData = {
        locationId: locationId,
        ...location,
        contactPerson: contactPerson,
        fields: fieldsWithMedia,
      };

      const response = await updateHoto(hotoId, hotoData);
      console.log("HOTO updated successfully:", response);
      fetchAllHotoInfo();
      onClose();
    } catch (error) {
      console.error("Error updating HOTO:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
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
        Edit HOTO Entry
      </DialogTitle>

      <DialogContent sx={{ p: 3 }} ref={dialogContentRef}>
        {initialLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
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
          </>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Button onClick={handleClose} variant="outlined" color="inherit" disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={loading || initialLoading}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {loading ? "Updating..." : "Update HOTO"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditHotoModal; 