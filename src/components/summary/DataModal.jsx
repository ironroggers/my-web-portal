import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

const DataModal = ({ open, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Edit/Create Data</DialogTitle>
      <DialogContent>
        {/* Form fields will go here */}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DataModal;

