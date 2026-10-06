import FormField from "./FormField";

const ContactFields = ({ contactPerson, handleChange }) => (
  <>
    <FormField
      label="Name"
      value={contactPerson.name}
      onChange={handleChange("name")}
      autoComplete="off"
    />
    <FormField
      label="Mobile"
      value={contactPerson.mobile}
      onChange={handleChange("mobile")}
      type="tel"
      autoComplete="off"
    />
    <FormField
      label="Email"
      value={contactPerson.email}
      onChange={handleChange("email")}
      type="email"
      autoComplete="off"
      span
    />
    <FormField
      label="Description"
      value={contactPerson.description}
      onChange={handleChange("description")}
      multiline
      rows={2}
      span
    />
  </>
);

export default ContactFields;
