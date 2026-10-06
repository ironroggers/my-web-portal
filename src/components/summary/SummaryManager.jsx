import { Alert, Box, Skeleton, Stack } from "@mui/material";
import { useEffect, useState } from "react";
import summaryService from "../../services/summaryService";
import PageHeader from "../common/PageHeader";
import SummaryDisplay from "./SummaryDisplay";
import SheetDataDisplay from "./SheetDataDisplay";

const SummaryManager = () => {
  // undefined while the first request is in flight; null if it failed
  const [summary, setSummary] = useState(undefined);
  const [sheetNames, setSheetNames] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [error, setError] = useState(null);

  const refreshData = () => {
    summaryService
      .getSummary()
      .then(setSummary)
      .catch(() => {
        setSummary((previous) => previous ?? null);
        setError("Could not load the category totals.");
      });
  };

  const handleSheetChange = (sheetName) => {
    setSelectedSheet(sheetName);
  };

  useEffect(() => {
    refreshData();
    summaryService
      .getSheetNames()
      .then((sheets) => {
        setSheetNames(sheets.data);
        setSelectedSheet(sheets.data[0]);
      })
      .catch(() => setError("Could not load the list of data sheets."));
  }, []);

  const stateName = summary?.Summary?.State;

  return (
    <Box>
      <PageHeader
        title="Project Summary"
        subtitle={[stateName, "Category totals and the data sheets behind them"].filter(Boolean).join(" · ")}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack spacing={3}>
        <SummaryDisplay summary={summary} />
        {sheetNames && selectedSheet ? (
          <SheetDataDisplay
            sheetNames={sheetNames}
            selectedSheet={selectedSheet}
            onSheetChange={handleSheetChange}
            refreshData={refreshData}
          />
        ) : (
          !error && <Skeleton variant="rounded" height={420} />
        )}
      </Stack>
    </Box>
  );
};

export default SummaryManager;
