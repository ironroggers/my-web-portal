import { Alert, Box, Button } from "@mui/material";
import TabPanel from "./TabPanel";
import { useState } from "react";

const OfcTabPanel = ({ ofcHotoInfo, tabValue }) => {
  const [selectedOfc, setSelectedOfc] = useState(null);

  return (
    <TabPanel value={tabValue} index={2}>
      {ofcHotoInfo.data.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: "8px" }}>
          No OFC HOTO information available
        </Alert>
      ) : (
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            width: "100%",
            py: 2,
          }}
        >
          {ofcHotoInfo.data.map((item) => (
            <Button
              key={item._id}
              variant={selectedOfc === item._id ? "contained" : "outlined"}
              color="primary"
              onClick={() => setSelectedOfc(item._id)}
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
              {item.GP_Name}
            </Button>
          ))}
        </Box>
      )}
    </TabPanel>
  );
};

export default OfcTabPanel;
