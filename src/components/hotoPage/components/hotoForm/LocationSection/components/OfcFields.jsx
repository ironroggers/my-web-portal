import FormField from "./FormField";

const OfcFields = ({ location, handleChange }) => (
  <>
    <FormField
      label="OFC Name"
      value={location.ofcName}
      onChange={handleChange("ofcName")}
    />
    <FormField
      label="OFC Code"
      value={location.ofcCode}
      onChange={handleChange("ofcCode")}
    />
  </>
);

export default OfcFields; 