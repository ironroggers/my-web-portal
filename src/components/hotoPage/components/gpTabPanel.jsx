import { Alert, Box, Button, Typography } from "@mui/material";
import TabPanel from "./TabPanel";
import { useState } from "react";

const GpTabPanel = ({ gpHotoInfo, tabValue }) => {
  const [selectedGp, setSelectedGp] = useState(null);

  return (
    <TabPanel value={tabValue} index={1}>
      {gpHotoInfo.data.length === 0 ? (
        <Alert severity="info" sx={{ borderRadius: "8px" }}>
          No GP HOTO information available
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
          {gpHotoInfo.data.map((item) => (
            <Button
              key={item._id}
              variant={selectedGp === item._id ? "contained" : "outlined"}
              color="primary"
              onClick={() => setSelectedGp(item._id)}
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

export default GpTabPanel;
