import FormField from "./FormField";

const BasicLocationFields = ({ location, handleChange }) => (
  <>
    <FormField
      label="State"
      value={location.state}
      onChange={handleChange("state")}
    />
    <FormField
      label="Block Name"
      value={location.blockName}
      onChange={handleChange("blockName")}
    />
    <FormField
      label="Block Code"
      value={location.blockCode}
      onChange={handleChange("blockCode")}
    />
    <FormField
      label="District Name"
      value={location.districtName}
      onChange={handleChange("districtName")}
    />
    <FormField
      label="District Code"
      value={location.districtCode}
      onChange={handleChange("districtCode")}
    />
    <FormField
      label="Latitude"
      value={location.latitude}
      onChange={handleChange("latitude")}
    />
    <FormField
      label="Longitude"
      value={location.longitude}
      onChange={handleChange("longitude")}
    />
  </>
);

export default BasicLocationFields; 