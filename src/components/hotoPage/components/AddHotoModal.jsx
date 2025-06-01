import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
} from "@mui/material";
import { useState } from "react";
import ReadOnlyFields from "./hotoForm/ReadOnlyFields";
import FixedKeyFields from "./hotoForm/FixedKeyFields";
import CustomFields from "./hotoForm/CustomFields";

const AddHotoModal = ({ open, onClose, locationDetails }) => {
  const readOnlyFields = {
    district: locationDetails?.districtName,
    block: locationDetails?.blockName,
    state: "Kerala",
  };

  const [fixedKeyFields, setFixedKeyFields] = useState({
    latitude: "",
    longitude: "",
    remarks: "",
  });

  const [customFields, setCustomFields] = useState([]);
  const [newCustomField, setNewCustomField] = useState({ key: "", value: "" });
  const [editingIndex, setEditingIndex] = useState(-1);

  const handleFixedKeyFieldChange = (e) => {
    const { name, value } = e.target;
    setFixedKeyFields((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddCustomField = () => {
    if (newCustomField.key && newCustomField.value) {
      setCustomFields((prev) => [...prev, { ...newCustomField }]);
      setNewCustomField({ key: "", value: "" });
    }
  };

  const handleRemoveCustomField = (index) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditField = (index) => {
    setEditingIndex(index);
  };

  const handleSaveField = (index) => {
    setEditingIndex(-1);
  };

  const handleFieldChange = (index, field, value) => {
    setCustomFields((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleNewFieldChange = (field, value) => {
    setNewCustomField((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = () => {
    const formData = {
      ...readOnlyFields,
      ...fixedKeyFields,
      customFields,
    };
    console.log(formData);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            bgcolor: "background.paper",
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          px: 3,
          py: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        Add New HOTO
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <ReadOnlyFields fields={readOnlyFields} />

          <FixedKeyFields
            fields={fixedKeyFields}
            onChange={handleFixedKeyFieldChange}
          />

          <CustomFields
            fields={customFields}
            newField={newCustomField}
            editingIndex={editingIndex}
            onFieldChange={handleFieldChange}
            onNewFieldChange={handleNewFieldChange}
            onAddField={handleAddCustomField}
            onRemoveField={handleRemoveCustomField}
            onEditField={handleEditField}
            onSaveField={handleSaveField}
          />
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Button onClick={onClose} variant="outlined" color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddHotoModal;
