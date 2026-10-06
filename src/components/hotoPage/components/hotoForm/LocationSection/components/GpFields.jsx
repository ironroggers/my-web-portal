import FormField from "./FormField";

const GpFields = ({ location, handleChange }) => (
  <>
    <FormField
      label="GP name"
      value={location.gpName}
      onChange={handleChange("gpName")}
    />
    <FormField
      label="GP code"
      value={location.gpCode}
      onChange={handleChange("gpCode")}
    />
  </>
);

export default GpFields;
