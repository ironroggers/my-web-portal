import FormSection from "../FormSection";
import { ContactFields } from "./components";

const ContactPersonSection = ({ contactPerson, setContactPerson }) => {
  const handleChange = (field) => (event) => {
    setContactPerson((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  return (
    <FormSection title="Contact person" description="Who to contact about this handover">
      <ContactFields contactPerson={contactPerson} handleChange={handleChange} />
    </FormSection>
  );
};

export default ContactPersonSection;
