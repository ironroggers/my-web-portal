import FormField from "./FormField";

// Latitude and longitude are rendered by LocationSection, after the GP and OFC codes
const BasicLocationFields = ({ location, handleChange }) => (
  <>
    <FormField
      label="State"
      value={location.state}
      onChange={handleChange("state")}
    />
    <FormField
      label="District name"
      value={location.districtName}
      onChange={handleChange("districtName")}
    />
    <FormField
      label="District code"
      value={location.districtCode}
      onChange={handleChange("districtCode")}
    />
    <FormField
      label="Block name"
      value={location.blockName}
      onChange={handleChange("blockName")}
    />
    <FormField
      label="Block code"
      value={location.blockCode}
      onChange={handleChange("blockCode")}
    />
  </>
);

export default BasicLocationFields;
