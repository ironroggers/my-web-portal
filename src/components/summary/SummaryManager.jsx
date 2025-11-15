import { Box, Container, Paper } from "@mui/material";
import { useEffect, useState } from "react";
import summaryService from "../../services/summaryService";
import SummaryDisplay from "./SummaryDisplay";
import SheetDataDisplay from "./SheetDataDisplay";

const SummaryManager = () => {
  const [summary, setSummary] = useState(null);
  const [sheetNames, setSheetNames] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState(null);

  const refreshData = () => {
    summaryService.getSummary().then(setSummary);
    summaryService.getSheetNames().then((sheets) => {
      setSheetNames(sheets.data);
      setSelectedSheet(sheets.data[0]);
    });
  };

  useEffect(() => {
    refreshData();
  }, []);

  console.log(selectedSheet);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 6 }}>
      <Paper elevation={3} sx={{ borderRadius: "16px", overflow: "hidden" }}>
        <Box>
          <SummaryDisplay summary={summary} />
          {sheetNames && selectedSheet && (
            <SheetDataDisplay
              sheetNames={sheetNames}
              selectedSheet={selectedSheet}
              refreshData={refreshData}
            />
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default SummaryManager;
