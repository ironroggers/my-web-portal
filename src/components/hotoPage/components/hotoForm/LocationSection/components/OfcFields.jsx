import FormField from "./FormField";

const OfcFields = ({ location, handleChange }) => (
  <>
    <FormField
      label="OFC name"
      value={location.ofcName}
      onChange={handleChange("ofcName")}
    />
    <FormField
      label="OFC code"
      value={location.ofcCode}
      onChange={handleChange("ofcCode")}
    />
  </>
);

export default OfcFields;
