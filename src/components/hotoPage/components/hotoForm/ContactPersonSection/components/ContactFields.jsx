import FormField from "./FormField";

const ContactFields = ({ contactPerson, handleChange }) => (
  <>
    <FormField
      label="Name"
      value={contactPerson.name}
      onChange={handleChange("name")}
    />
    <FormField
      label="Email"
      value={contactPerson.email}
      onChange={handleChange("email")}
    />
    <FormField
      label="Mobile"
      value={contactPerson.mobile}
      onChange={handleChange("mobile")}
    />
    <FormField
      label="Description"
      value={contactPerson.description}
      onChange={handleChange("description")}
      multiline
      rows={2}
    />
  </>
);

export default ContactFields; 