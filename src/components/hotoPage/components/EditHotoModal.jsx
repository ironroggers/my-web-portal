import { Alert, Box, Button, Divider, Skeleton, Stack } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import LocationSection from "./hotoForm/LocationSection/LocationSection";
import ContactPersonSection from "./hotoForm/ContactPersonSection/ContactPersonSection";
import FieldsSection from "./hotoForm/FieldsSection/FieldsSection";
import HotoFormDialog from "./hotoForm/HotoFormDialog";
import { validateLocation, withoutEmptyMedia } from "./hotoForm/prepareFields";
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
  // The record currently in the form; anything else means it is still loading
  const [loadedId, setLoadedId] = useState(null);
  const [loadError, setLoadError] = useState("");
  // null, "upload" or "save"
  const [savingStep, setSavingStep] = useState(null);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});

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

  const loadHotoData = useCallback(async () => {
    setLoadedId(null);
    setLoadError("");
    setError("");
    setErrors({});
    try {
      const hotoData = await fetchSingleHoto(hotoId);

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

      setContactPerson({
        name: hotoData.contactPerson?.name || "",
        email: hotoData.contactPerson?.email || "",
        mobile: hotoData.contactPerson?.mobile || "",
        description: hotoData.contactPerson?.description || "",
      });

      setFields(hotoData.fields || []);
      setLoadedId(hotoId);
    } catch (err) {
      // Saving is blocked until the record loads, so a failed load can't overwrite it
      setLoadError(`Couldn't load this HOTO${err.message ? ` (${err.message})` : ""}. Check the connection and try again.`);
    }
  }, [hotoId, locationName, locationDistrict]);

  // Reload whenever the dialog opens, so cancelled edits are discarded
  useEffect(() => {
    if (open && hotoId) {
      loadHotoData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hotoId]);

  const isLoaded = loadedId === hotoId && Boolean(hotoId);

  const handleLocationChange = (updater) => {
    setLocation(updater);
    if (errors.hotoType) setErrors({});
  };

  const handleSubmit = async () => {
    const validation = validateLocation(location);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setError("Fill in the required fields before saving.");
      return;
    }

    setError("");
    try {
      const cleanFields = withoutEmptyMedia(fields);
      const hasNewMedia = cleanFields.some((field) => field.mediaFiles?.some((media) => media.file));
      setSavingStep(hasNewMedia ? "upload" : "save");

      // Upload only newly chosen files (they have a `file`); keep existing media as is
      const fieldsWithMedia = await Promise.all(
        cleanFields.map(async (field) => {
          if (field.mediaFiles && field.mediaFiles.length > 0) {
            const newMediaFiles = field.mediaFiles.filter((media) => media.file);

            if (newMediaFiles.length > 0) {
              const uploadedMedia = await uploadHotoMedia({
                fields: [{ ...field, mediaFiles: newMediaFiles }],
              });

              const existingMedia = field.mediaFiles.filter((media) => !media.file);
              return {
                ...field,
                mediaFiles: [...existingMedia, ...uploadedMedia.fields[0].mediaFiles],
              };
            }
          }
          return field;
        })
      );

      setSavingStep("save");
      const hotoData = {
        locationId: locationId,
        ...location,
        contactPerson: contactPerson,
        fields: fieldsWithMedia,
      };

      await updateHoto(hotoId, hotoData);
      fetchAllHotoInfo();
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't save your changes. Please try again.");
    } finally {
      setSavingStep(null);
    }
  };

  const renderBody = () => {
    if (loadError) {
      return (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={loadHotoData}>
              Retry
            </Button>
          }
        >
          {loadError}
        </Alert>
      );
    }

    if (!isLoaded) {
      return (
        <Box aria-busy="true" aria-label="Loading HOTO">
          <Skeleton variant="text" width={120} height={28} sx={{ mb: 1.5 }} />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" }, gap: 2, mb: 4 }}>
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} variant="rounded" height={40} />
            ))}
          </Box>
          <Skeleton variant="text" width={120} height={28} sx={{ mb: 1.5 }} />
          <Skeleton variant="rounded" height={160} />
        </Box>
      );
    }

    return (
      <Stack spacing={3} divider={<Divider />}>
        <LocationSection location={location} setLocation={handleLocationChange} errors={errors} />
        <ContactPersonSection contactPerson={contactPerson} setContactPerson={setContactPerson} />
        <FieldsSection
          fields={fields}
          setFields={setFields}
          location={location}
          setLocation={handleLocationChange}
        />
      </Stack>
    );
  };

  return (
    <HotoFormDialog
      open={open}
      onClose={onClose}
      title="Edit HOTO"
      subtitle={[locationName, locationDistrict].filter(Boolean).join(", ")}
      saving={Boolean(savingStep)}
      savingLabel={savingStep === "upload" ? "Uploading media…" : "Saving…"}
      submitLabel="Save changes"
      submitDisabled={!isLoaded}
      onSubmit={handleSubmit}
      error={error}
      onDismissError={() => setError("")}
    >
      {renderBody()}
    </HotoFormDialog>
  );
};

export default EditHotoModal;
