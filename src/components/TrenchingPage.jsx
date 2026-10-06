import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Grid,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate, useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import PhotoOutlinedIcon from "@mui/icons-material/PhotoOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import trenchingService from "../services/trenchingService.jsx";
import subsectionsService from "../services/subsectionsService.jsx";
import sectionsService from "../services/sectionsService.jsx";
import { LineChart } from "@mui/x-charts/LineChart";
import { ChartsReferenceLine } from "@mui/x-charts/ChartsReferenceLine";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import autoTable from "jspdf-autotable";
import { LOCATION_URL } from "../API/api-keys.jsx";
import PageHeader from "./common/PageHeader";
import StatTile from "./common/StatTile";
import SectionCard from "./common/SectionCard";
import StatusPill from "./common/StatusPill";
import MediaViewerDialog from "./common/MediaViewerDialog";

// value formatter helpers
const meters = (v) => `${Number(v).toFixed(2)} m`;
const optionLabel = (value) => (value === "others" ? "Other" : value);
// Brand primary for the PDF table headers
const PDF_HEADER_COLOR = [29, 78, 216];

const TrenchingPage = () => {
  const navigate = useNavigate();
  const { subSectionId } = useParams();
  const chartRef = useRef(null);
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [subsection, setSubsection] = useState(null);
  const [sectionMeta, setSectionMeta] = useState(null);
  const [locationMeta, setLocationMeta] = useState(null);
  const [preview, setPreview] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const fetchAll = useCallback(async () => {
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
  }, [subSectionId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const xData = useMemo(() => rows.map((r, i) => r.distance || i), [rows]);
  // Plotting convention: positive (below ground) should go down on chart, so invert for plotting
  const depthData = useMemo(() => rows.map((r) => -Number(r.depth || 0)), [rows]);
  // Ground level is drawn as a reference line at 0, not as a data series
  const yBounds = useMemo(() => ({ min: Math.min(-1, ...depthData) - 0.5, max: 0.5 }), [depthData]);

  const stats = useMemo(() => {
    const depths = rows.map((r) => Number(r.depth || 0));
    return {
      points: rows.length,
      distance: rows.length ? rows[rows.length - 1].distance : 0,
      minDepth: depths.length ? Math.min(...depths) : 0,
      maxDepth: depths.length ? Math.max(...depths) : 0,
      averageDepth: depths.length ? depths.reduce((total, depth) => total + depth, 0) / depths.length : 0,
      photos: rows.filter((r) => r.photoUrl).length,
    };
  }, [rows]);

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
        headStyles: { fillColor: PDF_HEADER_COLOR },
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
        doc.text("Depth Profile", margin, cursorY);
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
        headStyles: { fillColor: PDF_HEADER_COLOR },
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

  // Back to this subsection's section, not just the previous page
  const backToSubsections = () => (subsection?.section ? navigate(`/sections/${subsection.section}/subsections`) : navigate(-1));

  const context = [
    sectionMeta?.name && `Section: ${sectionMeta.name}`,
    [sectionMeta?.block || locationMeta?.block, sectionMeta?.district || locationMeta?.district].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join(" · ");

  const details = subsection
    ? [
        ["Road", subsection.roadName],
        ["Method of construction", optionLabel(subsection.methodOfConstruction)],
        ["Road surface", optionLabel(subsection.roadSurfaceType)],
        ["Alignment", optionLabel(subsection.alignmentType)],
        ["Soil", subsection.soilStatus],
        ["Protection", optionLabel(subsection.protectionType)],
        ["Pit type", optionLabel(subsection.pitType)],
        ["RoW ownership", subsection.row?.rowOwnership],
        ["RoW authority", subsection.row?.rowAuthority],
        ["Planned length", subsection.subSectionLength ? `${subsection.subSectionLength} m` : null],
        ["Estimated depth", subsection.estimatedDepth ? `${subsection.estimatedDepth} m` : null],
      ].filter(([, value]) => value)
    : [];

  const openPhoto = (r, idx) =>
    setPreview({
      media: {
        url: r.photoUrl,
        fileType: "image",
        latitude: r.latitude,
        longitude: r.longitude,
        place: r.place,
        accuracy: r.accuracy,
        deviceName: r.deviceName,
        uploadedAt: r.uploadedAt,
        description: `Trench point ${idx + 1}`,
      },
      subtitle: `${meters(r.distance)} along the subsection · ${meters(r.depth)} deep`,
    });

  return (
    <Box>
      <PageHeader
        title={
          <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            HDPE profile
            {subsection?.waterLoggedArea && <StatusPill label="Water-logged area" tone="warning" />}
          </Box>
        }
        subtitle={[subsection ? subsection.name || "Untitled subsection" : null, context].filter(Boolean).join(" · ") || "Trenching depth along the subsection"}
        actions={
          <>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={backToSubsections}>
              Back to subsections
            </Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchAll} disabled={loading}>
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfOutlinedIcon />}
              onClick={handleDownloadPdf}
              disabled={loading || downloading || rows.length === 0}
            >
              {downloading ? "Preparing…" : "Download PDF"}
            </Button>
          </>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} action={<Button color="inherit" size="small" onClick={fetchAll}>Retry</Button>}>
          {error}
        </Alert>
      )}

      {loading ? (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {Array.from({ length: 4 }, (_, index) => (
              <Grid key={index} size={{ xs: 6, md: 3 }}>
                <Skeleton variant="rounded" height={112} />
              </Grid>
            ))}
          </Grid>
          <Skeleton variant="rounded" height={380} sx={{ mb: 3 }} />
          <Skeleton variant="rounded" height={240} />
        </>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatTile label="Trench points" value={stats.points} caption={`${stats.photos} with photos`} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatTile label="Distance covered" value={Number(stats.distance.toFixed(1))} suffix=" m" caption="Cumulative along the subsection" />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatTile
                label="Depth range"
                value={stats.points ? `${stats.minDepth.toFixed(2)}–${stats.maxDepth.toFixed(2)}` : "—"}
                suffix={stats.points ? " m" : undefined}
                caption="Shallowest to deepest point"
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <StatTile
                label="Average depth"
                value={stats.points ? Number(stats.averageDepth.toFixed(2)) : "—"}
                suffix={stats.points ? " m" : undefined}
                caption="Across all trench points"
              />
            </Grid>
          </Grid>

          {details.length > 0 && (
            <SectionCard title="Subsection details" sx={{ mb: 3 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" }, gap: 2 }}>
                {details.map(([label, value]) => (
                  <Box key={label} sx={{ minWidth: 0 }}>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                      {label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, overflowWrap: "anywhere" }}>
                      {value}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </SectionCard>
          )}

          <SectionCard
            title="Depth profile"
            subtitle="Depth below ground at each trench point, by distance along the subsection"
            sx={{ mb: 3 }}
          >
            {rows.length === 0 ? (
              <Box sx={{ py: 5, textAlign: "center" }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  No trenching recorded for this subsection yet
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                  Trench points appear here once they are logged from the field.
                </Typography>
              </Box>
            ) : (
              // Captured for the PDF, so it keeps a plain white background
              <Box ref={chartRef} sx={{ bgcolor: "#fff" }}>
                <LineChart
                  xAxis={[
                    {
                      data: xData,
                      label: "Distance along the subsection (m)",
                      // Plain numbers on the axis (the label carries the unit); metres in the tooltip
                      valueFormatter: (v, context) =>
                        context?.location === "tick" ? Number(v).toLocaleString("en-IN", { maximumFractionDigits: 1 }) : meters(v),
                    },
                  ]}
                  yAxis={[
                    {
                      label: "Depth below ground (m)",
                      min: yBounds.min,
                      max: yBounds.max,
                      valueFormatter: (v) => `${Math.abs(v)}`,
                    },
                  ]}
                  series={[
                    {
                      data: depthData,
                      label: "Depth",
                      color: theme.palette.primary.main,
                      curve: "linear",
                      showMark: true,
                      valueFormatter: (v) => (v == null ? "" : `${Math.abs(v).toFixed(2)} m below ground`),
                    },
                  ]}
                  height={320}
                  grid={{ horizontal: true }}
                  hideLegend
                  sx={{
                    "& .MuiChartsAxis-label": { fontWeight: 500 },
                    "& .MuiChartsGrid-line": { stroke: theme.palette.divider },
                  }}
                >
                  <ChartsReferenceLine
                    y={0}
                    label="Ground level"
                    labelAlign="start"
                    lineStyle={{ stroke: theme.palette.text.secondary, strokeDasharray: "4 4" }}
                    labelStyle={{ fontSize: 12, fill: theme.palette.text.secondary }}
                  />
                </LineChart>
              </Box>
            )}
          </SectionCard>

          {rows.length > 0 && (
            <SectionCard title="Trench points" subtitle={`${rows.length} points, in the order they were logged`} contentSx={{ p: 0 }}>
              <TableContainer>
                <Table size="small" sx={{ minWidth: 760, "& tbody tr:last-of-type td": { borderBottom: 0 } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell align="right">Distance (m)</TableCell>
                      <TableCell align="right">Depth (m)</TableCell>
                      <TableCell align="right">Latitude</TableCell>
                      <TableCell align="right">Longitude</TableCell>
                      <TableCell align="right">Rod length (m)</TableCell>
                      <TableCell align="right">Angle (°)</TableCell>
                      <TableCell>Photo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((r, idx) => {
                      const prev = idx > 0 ? rows[idx - 1] : null;
                      const deltaDepth = prev ? Number(r.depth || 0) - Number(prev.depth || 0) : 0;
                      const deltaDist = prev ? Number(r.distance || 0) - Number(prev.distance || 0) : 0;
                      const angleDeg = deltaDist ? (Math.atan2(deltaDepth, deltaDist) * 180) / Math.PI : 0;
                      return (
                        <TableRow key={r.id || idx} hover>
                          <TableCell sx={{ color: "text.secondary" }}>{idx + 1}</TableCell>
                          <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>{Number(r.distance).toFixed(2)}</TableCell>
                          <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>{Number(r.depth).toFixed(2)}</TableCell>
                          <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", color: r.latitude ? "text.primary" : "text.disabled" }}>{r.latitude || "—"}</TableCell>
                          <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", color: r.longitude ? "text.primary" : "text.disabled" }}>{r.longitude || "—"}</TableCell>
                          <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>3</TableCell>
                          <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums", color: prev ? "text.primary" : "text.disabled" }}>{prev ? angleDeg.toFixed(2) : "—"}</TableCell>
                          {/* Tighter padding so rows with a thumbnail match the others */}
                          <TableCell sx={{ py: 0.25 }}>
                            {r.photoUrl ? (
                              <Tooltip title="View photo">
                                <ButtonBase
                                  onClick={() => openPhoto(r, idx)}
                                  aria-label={`View photo for trench point ${idx + 1}`}
                                  sx={{ width: 28, height: 28, borderRadius: 0.75, overflow: "hidden", border: 1, borderColor: "divider", bgcolor: "action.hover", verticalAlign: "middle" }}
                                >
                                  <Box component="img" src={r.photoUrl} alt="" loading="lazy" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                </ButtonBase>
                              </Tooltip>
                            ) : (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.disabled" }}>
                                <PhotoOutlinedIcon fontSize="small" />
                                <Typography variant="caption">None</Typography>
                              </Box>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </SectionCard>
          )}
        </>
      )}

      {preview && <MediaViewerDialog media={preview.media} subtitle={preview.subtitle} onClose={() => setPreview(null)} />}
    </Box>
  );
};

export default TrenchingPage;


