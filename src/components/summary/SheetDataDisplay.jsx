import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import summaryService from "../../services/summaryService";

const SheetDataDisplay = ({ sheetNames, selectedSheet, refreshData }) => {
  console.log(sheetNames, selectedSheet);
  const [sheetData, setSheetData] = useState(null);

  useEffect(() => {
    summaryService.getSheetData(selectedSheet).then(setSheetData);
  }, [selectedSheet]);
  

  return (
    <Box>
      <Typography variant="h6">{JSON.stringify(sheetData)}</Typography>
    </Box>
  );
};

export default SheetDataDisplay;
