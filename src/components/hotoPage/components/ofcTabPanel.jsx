import { Alert, Box, Button } from "@mui/material";
import TabPanel from "./TabPanel";
import { useState } from "react";
import FormDisplay from "./formDisplay";

const OfcTabPanel = ({ ofcHotoInfo, tabValue }) => {
  const [selectedOfc, setSelectedOfc] = useState(null);
  const [selectedData, setSelectedData] = useState(null);

  const handleOfcSelect = (item) => {
    setSelectedOfc(item._id);
    setSelectedData(item);
  };

  return (
    <TabPanel value={tabValue} index={2}>
      {ofcHotoInfo.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: "8px", my: 2 }}>
          No OFC HOTO information available
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
            {ofcHotoInfo.map((item) => (
              <Button
                key={item._id}
                variant={selectedOfc === item._id ? "contained" : "outlined"}
                color="primary"
                onClick={() => handleOfcSelect(item)}
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
                {item.ofcName}
              </Button>
            ))}
          </Box>
          <FormDisplay data={selectedData} />
        </>
      )}
    </TabPanel>
  );
};

export default OfcTabPanel;
