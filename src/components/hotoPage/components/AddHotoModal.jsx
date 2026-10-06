import { Divider, Stack } from "@mui/material";
import { useEffect, useState } from "react";
import LocationSection from "./hotoForm/LocationSection/LocationSection";
import ContactPersonSection from "./hotoForm/ContactPersonSection/ContactPersonSection";
import FieldsSection from "./hotoForm/FieldsSection/FieldsSection";
import HotoFormDialog from "./hotoForm/HotoFormDialog";
import { validateLocation, withoutEmptyMedia } from "./hotoForm/prepareFields";
import { uploadHotoMedia, createHoto } from "../../../services/hotoPageService";

const emptyLocation = (locationName, locationDistrict) => ({
  state: "kerala",
  blockName: locationName || "",
  blockCode: "",
  districtName: locationDistrict || "",
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

const EMPTY_CONTACT = {
  name: "",
  email: "",
  mobile: "",
  description: "",
};

const AddHotoModal = ({
  open,
  onClose,
  locationId,
  locationName,
  locationDistrict,
  fetchAllHotoInfo,
}) => {
  const [location, setLocation] = useState(() => emptyLocation(locationName, locationDistrict));
  const [contactPerson, setContactPerson] = useState(EMPTY_CONTACT);
  const [fields, setFields] = useState([]);
  // null, "upload" or "save"
  const [savingStep, setSavingStep] = useState(null);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});

  // The location's block and district often load after this dialog mounts; fill them in
  // when it opens, without overwriting anything typed into an unfinished draft
  useEffect(() => {
    if (!open) return;
    setLocation((prev) => ({
      ...prev,
      blockName: prev.blockName || locationName || "",
      districtName: prev.districtName || locationDistrict || "",
    }));
  }, [open, locationName, locationDistrict]);

  const resetForm = () => {
    setLocation(emptyLocation(locationName, locationDistrict));
    setContactPerson(EMPTY_CONTACT);
    setFields([]);
    setErrors({});
    setError("");
  };

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

      // Upload media files first, then save the HOTO with their URLs
      const hasNewMedia = cleanFields.some((field) => field.mediaFiles?.some((media) => media.file));
      setSavingStep(hasNewMedia ? "upload" : "save");
      const fieldsWithMedia = await Promise.all(
        cleanFields.map(async (field) => {
          if (field.mediaFiles && field.mediaFiles.length > 0) {
            const uploadedMedia = await uploadHotoMedia({
              fields: [field],
            });
            return uploadedMedia.fields[0];
          }
          return field;
        })
      );

      setSavingStep("save");
      // Prepare the HOTO data according to the API schema
      const hotoData = {
        locationId: locationId,
        ...location,
        contactPerson: contactPerson,
        fields: fieldsWithMedia,
      };

      await createHoto(hotoData);
      fetchAllHotoInfo();
      resetForm();
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't save the HOTO. Please try again.");
    } finally {
      setSavingStep(null);
    }
  };

  return (
    <HotoFormDialog
      open={open}
      onClose={onClose}
      title="Add HOTO"
      subtitle={[locationName, locationDistrict].filter(Boolean).join(", ")}
      saving={Boolean(savingStep)}
      savingLabel={savingStep === "upload" ? "Uploading media…" : "Saving…"}
      submitLabel="Create HOTO"
      onSubmit={handleSubmit}
      error={error}
      onDismissError={() => setError("")}
    >
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
    </HotoFormDialog>
  );
};

export default AddHotoModal;
