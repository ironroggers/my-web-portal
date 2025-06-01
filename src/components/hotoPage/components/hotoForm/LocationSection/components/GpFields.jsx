import FormField from "./FormField";

const GpFields = ({ location, handleChange }) => (
  <>
    <FormField
      label="GP Name"
      value={location.gpName}
      onChange={handleChange("gpName")}
    />
    <FormField
      label="GP Code"
      value={location.gpCode}
      onChange={handleChange("gpCode")}
    />
  </>
);

export default GpFields; 