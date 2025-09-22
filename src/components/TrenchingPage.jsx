import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Container,
  Box,
  Typography,
  Paper,
  Stack,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import PhotoIcon from "@mui/icons-material/Photo";
import CloseIcon from "@mui/icons-material/Close";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import trenchingService from "../services/trenchingService.jsx";
import subsectionsService from "../services/subsectionsService.jsx";
import sectionsService from "../services/sectionsService.jsx";
import { LineChart } from "@mui/x-charts/LineChart";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import autoTable from "jspdf-autotable";
import { LOCATION_URL } from "../API/api-keys.jsx";

// value formatter helpers
const meters = (v) => `${Number(v).toFixed(2)} m`;
const formatCoord = (val) => {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n.toFixed(6) : "n/a";
};
const formatIST = (value) => {
  try {
    const ts = typeof value === 'number' ? value : Date.parse(String(value));
    if (!Number.isFinite(ts)) return 'n/a';
    const istMs = ts + (5.5 * 60 * 60 * 1000);
    const d = new Date(istMs);
    if (isNaN(d.getTime())) return 'n/a';
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mi = String(d.getUTCMinutes()).padStart(2, '0');
    const ss = String(d.getUTCSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss} IST`;
  } catch {
    return 'n/a';
  }
};
const getStaticMapUrl = (lat, lng) => {
  if (!lat || !lng) return '';
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return '';
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=16&size=300x300&markers=${latitude},${longitude},red-pushpin`;
};

const TrenchingPage = () => {
  const navigate = useNavigate();
  const { subSectionId } = useParams();
  const chartRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [subsection, setSubsection] = useState(null);
  const [sectionMeta, setSectionMeta] = useState(null);
  const [locationMeta, setLocationMeta] = useState(null);
  const [preview, setPreview] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");
      const subRes = await subsectionsService.get(subSectionId);
      setSubsection(subRes);
      // Fetch trenching list, section meta, and location meta
      const [trenchRes, sectionRes] = await Promise.all([
        trenchingService.list({ subSectionId, page: 1, limit: 1000 }),
        subRes?.section ? sectionsService.get(subRes.section) : Promise.resolve(null),
      ]);
      setSectionMeta(sectionRes);
      if (sectionRes?.location) {
        try {
          const locRes = await fetch(`${LOCATION_URL}/api/locations/${sectionRes.location}`);
          const locJson = await locRes.json().catch(() => null);
          setLocationMeta(locJson?.data || null);
        } catch {
          setLocationMeta(null);
        }
      } else {
        setLocationMeta(null);
      }
      // Map trenchings to rows (simulate profile points along distance) and include media/meta
      const items = (trenchRes.items || []).map((t) => {
        const [la = "", ln = ""] = (t.trenchLatLong || "").split(",");
        const media0 = (t.mediaFiles && t.mediaFiles[0]) || {};
        return {
          id: t._id,
          distance: Number(t.trenchLength || 0),
          depth: Number(t.trenchDepth || 0),
          latitude: (la || '').trim(),
          longitude: (ln || '').trim(),
          photoUrl: media0.url || t.photoUrl || "",
          place: media0.place || "",
          accuracy: media0.accuracy,
          deviceName: media0.deviceName || "",
          uploadedAt: media0.uploadedAt || t.createdAt || "",
        };
      });
      // If trenching points represent segments, compute cumulative distances
      let cumulative = 0;
      const normalized = items.map((r) => {
        cumulative += r.distance;
        return { ...r, distance: Number(cumulative.toFixed(2)) };
      });
      setRows(normalized);
    } catch (e) {
      setError(e.message || "Failed to load trenching");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [subSectionId]);

  const xData = useMemo(() => rows.map((r, i) => r.distance || i), [rows]);
  // Plotting convention: positive (below ground) should go down on chart, so invert for plotting
  const depthData = useMemo(() => rows.map((r) => -Number(r.depth || 0)), [rows]);
  const elevData = useMemo(() => rows.map(() => 0), [rows]);
  const yBounds = useMemo(() => {
    const all = [...depthData, ...elevData];
    const min = Math.min(-1, ...all) - 0.5;
    const max = Math.max(1, ...all) + 0.5;
    return { min, max };
  }, [depthData, elevData]);

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      let cursorY = margin;

      // Title
      doc.setFontSize(16);
      doc.text("HDPE Profile Report", margin, cursorY);
      cursorY += 8;
      doc.setFontSize(11);
      const subName = subsection ? (subsection.name || "Untitled Subsection") : "Unknown";
      doc.text(`Subsection: ${subName}`, margin, cursorY);
      cursorY += 6;
      doc.text(`Subsection ID: ${subSectionId}`, margin, cursorY);
      cursorY += 6;
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, cursorY);
      cursorY += 8;

      // Trenching summary
      const totalDistance = rows.length ? rows[rows.length - 1].distance : 0;
      const depths = rows.map(r => Number(r.depth || 0));
      const minDepth = depths.length ? Math.min(...depths) : 0;
      const maxDepth = depths.length ? Math.max(...depths) : 0;
      const first = rows[0] || {};
      const last = rows[rows.length - 1] || {};
      doc.setFontSize(12);
      doc.text("Summary", margin, cursorY);
      cursorY += 6;
      doc.setFontSize(10);
      const summaryLines = [
        `Total Points: ${rows.length}`,
        `Total Distance: ${Number(totalDistance || 0).toFixed(2)} m`,
        `Depth Range: ${Number(minDepth).toFixed(2)} m to ${Number(maxDepth).toFixed(2)} m`,
        `Start Coord: ${first.latitude || "n/a"}, ${first.longitude || "n/a"}`,
        `End Coord: ${last.latitude || "n/a"}, ${last.longitude || "n/a"}`,
      ];
      summaryLines.forEach((line) => {
        doc.text(line, margin, cursorY);
        cursorY += 5;
      });
      cursorY += 2;

      // Requested metadata block
      const md = {
        methodOfConstruction: subsection?.methodOfConstruction || "",
        pavedRoadType: subsection?.roadSurfaceType || "",
        rowOwnership: subsection?.row?.rowOwnership || "",
        rowAuthority: subsection?.row?.rowAuthority || "",
        alignmentType: subsection?.alignmentType || "",
        soilStatus: subsection?.soilStatus || "",
        subsectionLength: subsection?.subSectionLength ?? sectionMeta?.sectionLength ?? "",
        subsectionName: subsection?.name || "",
        subsectionDescription: subsection?.description || "",
        sectionName: sectionMeta?.name || "",
        locationName: locationMeta?.name || locationMeta?.locationName || "",
        state: sectionMeta?.state || locationMeta?.state || locationMeta?.stateName || "",
        district: sectionMeta?.district || locationMeta?.district || locationMeta?.districtName || "",
        block: sectionMeta?.block || locationMeta?.block || locationMeta?.blockName || "",
      };
      const metadataRows = [
        ["Method of Construction", md.methodOfConstruction],
        ["Paved Road Type", md.pavedRoadType],
        ["ROW Ownership", md.rowOwnership],
        ["ROW Authority", md.rowAuthority],
        ["Alignment Type", md.alignmentType],
        ["Soil Status", md.soilStatus],
        ["Distance (Subsection Length)", String(md.subsectionLength || 0)],
        ["Name", md.subsectionName],
        ["Description", md.subsectionDescription],
        ["Section Name", md.sectionName],
        ["Location Name", md.locationName],
        ["State", md.state],
        ["District", md.district],
        ["Block", md.block],
      ];
      if (cursorY > pageHeight - margin - 40) {
        doc.addPage();
        cursorY = margin;
      }
      doc.setFontSize(12);
      doc.text("Metadata", margin, cursorY);
      cursorY += 4;
      autoTable(doc, {
        startY: cursorY,
        head: [["Field", "Value"]],
        body: metadataRows,
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [118, 75, 162] },
        columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 'auto' } },
        margin: { left: margin, right: margin },
      });
      cursorY = doc.lastAutoTable.finalY + 6;

      // Chart capture
      if (chartRef.current) {
        const canvas = await html2canvas(chartRef.current, { backgroundColor: "#ffffff", scale: 2 });
        const imgData = canvas.toDataURL("image/png");
        const imgWidth = pageWidth - margin * 2;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        if (cursorY + imgHeight > pageHeight - margin) {
          doc.addPage();
          cursorY = margin;
        }
        doc.setFontSize(12);
        doc.text("Depth/Elevation Graph", margin, cursorY);
        cursorY += 4;
        doc.addImage(imgData, "PNG", margin, cursorY, imgWidth, imgHeight);
        cursorY += imgHeight + 6;
      }

      // Table using autoTable
      const columns = [
        { header: "Distance (m)", dataKey: "distance" },
        { header: "Depth (m)", dataKey: "depth" },
        { header: "Latitude", dataKey: "latitude" },
        { header: "Longitude", dataKey: "longitude" },
        { header: "Rod Length", dataKey: "rodLength" },
        { header: "Angle (°)", dataKey: "angleDeg" },
      ];
      const body = rows.map((r, idx) => {
        const prev = idx > 0 ? rows[idx - 1] : null;
        const deltaDepth = prev ? Number(r.depth || 0) - Number(prev.depth || 0) : 0;
        const deltaDist = prev ? Number(r.distance || 0) - Number(prev.distance || 0) : 0;
        const angleDeg = deltaDist ? (Math.atan2(deltaDepth, deltaDist) * 180) / Math.PI : 0;
        return {
          distance: Number(r.distance || 0).toFixed(2),
          depth: Number(r.depth || 0).toFixed(2),
          latitude: r.latitude || "",
          longitude: r.longitude || "",
          rodLength: 3,
          angleDeg: prev ? angleDeg.toFixed(2) : "",
        };
      });
      if (cursorY > pageHeight - margin - 30) {
        doc.addPage();
        cursorY = margin;
      }
      doc.setFontSize(12);
      doc.text("Trenching Details", margin, cursorY);
      cursorY += 4;
      autoTable(doc, {
        startY: cursorY,
        head: [columns.map((c) => c.header)],
        body: body.map((b) => columns.map((c) => b[c.dataKey])),
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [41, 98, 255] },
        margin: { left: margin, right: margin },
      });

      doc.save(`HDPE_Profile_${subName.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to generate PDF", e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper elevation={0} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: 2 }}>
        <Breadcrumbs sx={{ mb: 2, '& .MuiBreadcrumbs-separator': { color: 'white' } }}>
          <Link underline="hover" color="inherit" onClick={() => navigate('/map')} sx={{ cursor: 'pointer' }}>
            Map View
          </Link>
          <Link underline="hover" color="inherit" onClick={() => navigate(-1)} sx={{ cursor: 'pointer' }}>
            Subsections
          </Link>
          <Typography color="inherit">HDPE</Typography>
        </Breadcrumbs>

        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton onClick={() => navigate(-1)} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h4" component="h1" fontWeight="bold">
                HDPE Profile
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {subsection ? (subsection.name || 'Untitled Subsection') : 'Loading subsection...'}
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button startIcon={<RefreshIcon />} variant="outlined" color="inherit" onClick={fetchAll}>
              Refresh
            </Button>
            <Button startIcon={<PictureAsPdfIcon />} variant="contained" color="secondary" onClick={handleDownloadPdf} disabled={loading || downloading || rows.length === 0}>
              {downloading ? "Preparing..." : "Download PDF"}
            </Button>
          </Stack>
        </Box>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="240px">
          <CircularProgress size={48} />
          <Typography variant="h6" sx={{ ml: 2 }}>Loading hdpe...</Typography>
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      ) : (
        <>
          <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
            <Box ref={chartRef}>
            <LineChart
              xAxis={[{
                data: xData,
                label: 'Total X Distance',
                valueFormatter: meters,
              }]}
              yAxis={[{
                label: 'Depth / Elevation (m)',
                min: yBounds.min,
                max: yBounds.max,
                valueFormatter: (v) => `${v}`,
              }]}
              series={[
                {
                  data: depthData,
                  label: 'Depth',
                  color: '#111',
                  curve: 'linear',
                  showMark: true,
                },
                {
                  data: elevData,
                  label: 'Elevation',
                  color: '#2962ff',
                  curve: 'linear',
                  showMark: true,
                },
              ]}
              height={320}
              grid={{ vertical: true, horizontal: true }}
              slotProps={{
                legend: { direction: 'row', position: { vertical: 'top', horizontal: 'middle' } },
              }}
              sx={{
                '& .MuiChartsAxis-label': { fontWeight: 500 },
              }}
            />
            </Box>
          </Paper>

          <Paper elevation={1} sx={{ p: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Distance</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Depth</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Latitude</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Longitude</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Rod Length</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Angle (°)</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Photo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r, idx) => {
                  const prev = idx > 0 ? rows[idx - 1] : null;
                  const deltaDepth = prev ? Number(r.depth || 0) - Number(prev.depth || 0) : 0;
                  const deltaDist = prev ? Number(r.distance || 0) - Number(prev.distance || 0) : 0;
                  const angleDeg = deltaDist ? (Math.atan2(deltaDepth, deltaDist) * 180) / Math.PI : 0;
                  return (
                    <TableRow key={idx}>
                      <TableCell>{r.distance}</TableCell>
                      <TableCell>{Number(r.depth).toFixed(2)}</TableCell>
                      <TableCell>{r.latitude}</TableCell>
                      <TableCell>{r.longitude}</TableCell>
                      <TableCell>{3}</TableCell>
                      <TableCell>{prev ? angleDeg.toFixed(2) : ''}</TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => setPreview({
                            photoUrl: r.photoUrl,
                            lat: parseFloat(r.latitude),
                            lng: parseFloat(r.longitude),
                            place: r.place,
                            accuracy: r.accuracy,
                            deviceName: r.deviceName,
                            time: r.uploadedAt,
                          })}
                          disabled={!r.photoUrl}
                          color={r.photoUrl ? 'primary' : 'default'}
                        >
                          <PhotoIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Container>
    {/* Geotagged Preview Modal */}
    <Dialog open={!!preview} onClose={() => setPreview(null)} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Geotagged Photo
        <IconButton onClick={() => setPreview(null)}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {preview && (
          <Box>
            <Box sx={{ width: '100%', maxHeight: '70vh', bgcolor: '#000', borderRadius: 1, overflow: 'auto' }}>
              {preview.photoUrl ? (
                <img src={preview.photoUrl} alt="preview" style={{ display: 'block', width: '100%', height: 'auto', objectFit: 'contain' }} />
              ) : (
                <Box sx={{ height: 280 }} />
              )}
            </Box>
            <Box sx={{ mt: 1.5, p: 1, bgcolor: '#111', borderRadius: 1, display: 'flex', gap: 1.5, color: '#fff' }}>
              <Box sx={{ width: 120, height: 120, borderRadius: 1, overflow: 'hidden', bgcolor: '#222', flexShrink: 0 }}>
                {Number.isFinite(preview.lat) && Number.isFinite(preview.lng) && getStaticMapUrl(preview.lat, preview.lng) ? (
                  <img src={getStaticMapUrl(preview.lat, preview.lng)} alt="map" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : null}
              </Box>
              <Box sx={{ flex: 1, pr: 1 }}>
                <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 700, mb: 0.5 }}>Address</Typography>
                <Typography variant="body2" sx={{ color: '#fff' }}>
                  {preview.place || 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#fff', mt: 0.5 }}>Device: {preview.deviceName || 'N/A'}</Typography>
              </Box>
              <Box sx={{ flex: 1, textAlign: 'right' }}>
                <Typography variant="body2" sx={{ color: '#fff' }}>Latitude: {formatCoord(preview.lat)}</Typography>
                <Typography variant="body2" sx={{ color: '#fff' }}>Longitude: {formatCoord(preview.lng)}</Typography>
                <Typography variant="body2" sx={{ color: '#fff' }}>Accuracy: {preview.accuracy != null ? `±${Math.round(preview.accuracy)}m` : 'n/a'}</Typography>
                <Typography variant="body2" sx={{ color: '#fff' }}>Time: {formatIST(preview.time || Date.now())}</Typography>
              </Box>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};

export default TrenchingPage;


