import { useLocation } from "react-router-dom";
import { fetchAllHotoList } from "../../services/hotoPageService";
import { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
} from "@mui/material";
import BlockTabPanel from "./components/blockTabPanel";
import GpTabPanel from "./components/gpTabPanel";
import OfcTabPanel from "./components/ofcTabPanel";

const HotoPage = () => {
  const { locationId, locationName, locationDistrict } = useLocation().state;

  const [loading, setLoading] = useState(true);
  const [blockHotoInfo, setBlockHotoInfo] = useState([]);
  const [gpHotoInfo, setGpHotoInfo] = useState([]);
  const [ofcHotoInfo, setOfcHotoInfo] = useState([]);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchAllHotoInfo = async () => {
      try {
        const response = await fetchAllHotoList(locationId);
        setBlockHotoInfo(response.blockHotoInfo);
        setGpHotoInfo(response.gpHotoInfo);
        setOfcHotoInfo(response.ofcHotoInfo);
        setLoading(false);
      } catch (err) {
        setError(err.message || "Error fetching HOTO information");
        setLoading(false);
      }
    };
    fetchAllHotoInfo();
  }, [locationId]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 6 }}>
      <Paper
        elevation={3}
        sx={{ p: 4, borderRadius: "16px", overflow: "hidden" }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Typography variant="h4" fontWeight="700" sx={{ color: "#1e293b" }}>
            {locationName}
          </Typography>
        </Box>
        <Typography
          variant="subtitle1"
          sx={{ color: "text.secondary", mb: 3, lineHeight: 1.6 }}
        >
          Handover/Takeover details for {locationName}, {locationDistrict}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: "8px" }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box
            sx={{
              textAlign: "center",
              py: 6,
              minHeight: "70vh",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <CircularProgress size={60} thickness={4} />
            <Typography sx={{ mt: 3, fontWeight: 500 }}>
              Loading HOTO data...
            </Typography>
          </Box>
        ) : (
          <Box sx={{ minHeight: "70vh" }}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                sx={{
                  "& .MuiTab-root": {
                    fontSize: "1rem",
                    fontWeight: 600,
                    textTransform: "none",
                    minHeight: "56px",
                    outline: "None",
                    borderRadius: "5px",
                    "&:hover": {
                      color: "#ffffff",
                    },
                  },
                  "& .Mui-selected": {
                    color: "primary.main",
                    fontWeight: 600,
                  },
                }}
              >
                <Tab label={"Block HOTO"} />
                <Tab label={"GP HOTO"} />
                <Tab label={"OFC HOTO"} />
              </Tabs>
            </Box>

            <BlockTabPanel blockHotoInfo={blockHotoInfo} tabValue={tabValue} />
            <GpTabPanel gpHotoInfo={gpHotoInfo} tabValue={tabValue} />
            <OfcTabPanel ofcHotoInfo={ofcHotoInfo} tabValue={tabValue} />
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default HotoPage;
