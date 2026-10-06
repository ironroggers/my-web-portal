import FormSection from "../FormSection";
import {
  FormField,
  HotoTypeSelector,
  BasicLocationFields,
  GpFields,
  OfcFields,
} from "./components";

const LocationSection = ({ location, setLocation, errors = {} }) => {
  const handleChange = (field) => (event) => {
    setLocation((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  return (
    <FormSection title="Location" description="Where this handover applies. The HOTO type decides which codes are needed.">
      <HotoTypeSelector
        value={location.hotoType}
        onChange={handleChange("hotoType")}
        error={errors.hotoType}
      />

      <BasicLocationFields location={location} handleChange={handleChange} />

      {(location.hotoType === "gp" || location.hotoType === "ofc") && (
        <GpFields location={location} handleChange={handleChange} />
      )}

      {location.hotoType === "ofc" && (
        <OfcFields location={location} handleChange={handleChange} />
      )}

      <FormField
        label="Latitude"
        value={location.latitude}
        onChange={handleChange("latitude")}
        slotProps={{ htmlInput: { inputMode: "decimal" } }}
      />
      <FormField
        label="Longitude"
        value={location.longitude}
        onChange={handleChange("longitude")}
        slotProps={{ htmlInput: { inputMode: "decimal" } }}
      />

      <FormField
        label="Remarks"
        value={location.remarks}
        onChange={handleChange("remarks")}
        multiline
        rows={2}
        span
      />
    </FormSection>
  );
};

export default LocationSection;
