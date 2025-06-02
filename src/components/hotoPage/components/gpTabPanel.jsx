import { Alert, Box, Button } from "@mui/material";
import TabPanel from "./TabPanel";
import { useState } from "react";
import FormDisplay from "./formDisplay";

const GpTabPanel = ({ gpHotoInfo, tabValue }) => {
  const [selectedGp, setSelectedGp] = useState(null);
  const [selectedData, setSelectedData] = useState(null);

  const handleGpSelect = (item) => {
    setSelectedGp(item._id);
    setSelectedData(item);
  };

  return (
    <TabPanel value={tabValue} index={1}>
      {gpHotoInfo.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: "8px", my: 2 }}>
          No GP HOTO information available
        </Alert>
      ) : (
        <>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
              width: "100%",
              py: 2,
            }}
          >
            {gpHotoInfo.map((item) => (
              <Button
                key={item._id}
                variant={selectedGp === item._id ? "contained" : "outlined"}
                color="primary"
                onClick={() => handleGpSelect(item)}
                disableElevation
                sx={{
                  outline: "none",
                  borderRadius: "5px",
                  "&:hover": {
                    backgroundColor: "primary.main",
                    color: "white",
                  },
                  "&:focus": {
                    outline: "none",
                    backgroundColor: "primary.main",
                    color: "white",
                  },
                }}
              >
                {item.gpName}
              </Button>
            ))}
          </Box>
          <FormDisplay data={selectedData} />
        </>
      )}
    </TabPanel>
  );
};

export default GpTabPanel;
