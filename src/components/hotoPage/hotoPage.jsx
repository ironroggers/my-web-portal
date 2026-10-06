import { Link as RouterLink, useLocation } from "react-router-dom";
import { fetchAllHotoList } from "../../services/hotoPageService";
import { useState, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Skeleton,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import BlockTabPanel from "./components/blockTabPanel";
import GpTabPanel from "./components/gpTabPanel";
import OfcTabPanel from "./components/ofcTabPanel";
import AddHotoModal from "./components/AddHotoModal";
import PageHeader from "../common/PageHeader";

const HotoPage = () => {
  const theme = useTheme();
  // The location arrives as router state; opening /hoto directly has none
  const { locationId, locationName, locationDistrict } = useLocation().state || {};

  const [loading, setLoading] = useState(true);
  const [blockHotoInfo, setBlockHotoInfo] = useState([]);
  const [gpHotoInfo, setGpHotoInfo] = useState([]);
  const [ofcHotoInfo, setOfcHotoInfo] = useState([]);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchAllHotoInfo = async () => {
    try {
      const response = await fetchAllHotoList(locationId);
      setBlockHotoInfo(response.blockHotoInfo);
      setGpHotoInfo(response.gpHotoInfo);
      setOfcHotoInfo(response.ofcHotoInfo);
      setError(null);
    } catch (err) {
      setError(err.message || "Error fetching HOTO information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (locationId) fetchAllHotoInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  if (!locationId) {
    return (
      <Box>
        <PageHeader title="HOTO" subtitle="Handover and takeover records" />
        <Card sx={{ py: 6, px: 3, textAlign: "center" }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Open HOTO from a location
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5, mb: 2.5 }}>
            HOTO records belong to a location. Pick a location in Locations and open its HOTO information.
          </Typography>
          <Button component={RouterLink} to="/map" variant="contained" startIcon={<MapOutlinedIcon />}>
            Go to Locations
          </Button>
        </Card>
      </Box>
    );
  }

  const tabs = [
    { label: "Block HOTO", count: blockHotoInfo.length },
    { label: "GP HOTO", count: gpHotoInfo.length },
    { label: "OFC HOTO", count: ofcHotoInfo.length },
  ];

  return (
    <Box>
      <PageHeader
        title={locationName || "HOTO"}
        subtitle={`Handover and takeover records${locationDistrict ? ` · ${locationDistrict}` : ""}`}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsAddModalOpen(true)}>
            Add HOTO
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card>
        <Tabs
          value={tabValue}
          onChange={(event, newValue) => setTabValue(newValue)}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{ px: 1, borderBottom: 1, borderColor: "divider" }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={tab.label}
              id={`hoto-tab-${index}`}
              aria-controls={`hoto-tabpanel-${index}`}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {tab.label}
                  <Box
                    component="span"
                    sx={{
                      px: 0.75,
                      borderRadius: 1,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      bgcolor: tabValue === index ? alpha(theme.palette.primary.main, 0.1) : "action.hover",
                      color: tabValue === index ? "primary.main" : "text.secondary",
                    }}
                  >
                    {loading ? "–" : tab.count}
                  </Box>
                </Box>
              }
            />
          ))}
        </Tabs>

        <Box sx={{ p: { xs: 2, md: 3 }, minHeight: 320 }}>
          {loading ? (
            <>
              <Box sx={{ display: "flex", gap: 1.5, mb: 3 }}>
                {Array.from({ length: 3 }, (_, index) => (
                  <Skeleton key={index} variant="rounded" width={120} height={36} />
                ))}
              </Box>
              <Skeleton variant="rounded" height={220} />
            </>
          ) : (
            <>
              <BlockTabPanel blockHotoInfo={blockHotoInfo} tabValue={tabValue} />
              <GpTabPanel gpHotoInfo={gpHotoInfo} tabValue={tabValue} />
              <OfcTabPanel ofcHotoInfo={ofcHotoInfo} tabValue={tabValue} />
            </>
          )}
        </Box>
      </Card>

      <AddHotoModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        locationId={locationId}
        locationName={locationName}
        locationDistrict={locationDistrict}
        fetchAllHotoInfo={fetchAllHotoInfo}
      />
    </Box>
  );
};

export default HotoPage;
