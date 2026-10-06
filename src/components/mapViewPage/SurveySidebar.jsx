import React, { useState } from "react";
import {
  Box,
  ButtonBase,
  CircularProgress,
  Drawer,
  IconButton,
  Link,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import OndemandVideoIcon from "@mui/icons-material/OndemandVideo";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import StatusPill from "../common/StatusPill";
import { SURVEY_STATUSES, getSurveyTypeLabel } from "../../constants/surveys";
import MediaViewerDialog from "../common/MediaViewerDialog";
import useReverseGeocode from "../../hooks/useReverseGeocode";
import {
  formatMediaDate as formatDate,
  getCoordinates,
  getMediaCapturedAt,
  getMediaKind,
  googleMapsUrl as mapsUrl,
} from "../../utils/mediaUtils";


const getAllMediaFiles = (survey) => {
  const allMedia = [];
  if (Array.isArray(survey.mediaFiles)) {
    allMedia.push(...survey.mediaFiles.map((file) => ({ ...file, source: "survey" })));
  }
  if (Array.isArray(survey.fields)) {
    survey.fields.forEach((field, fieldIndex) => {
      if (Array.isArray(field.mediaFiles)) {
        allMedia.push(...field.mediaFiles.map((file) => ({ ...file, source: "field", fieldKey: field.key, fieldIndex })));
      }
    });
  }
  return allMedia;
};

const personName = (person, fallback) => person?.email || person?.name || person?.username || fallback?.username || fallback?.email || null;

const Section = ({ title, children }) => (
  <Box component="section" sx={{ px: 2.5, py: 2 }}>
    {title && (
      <Typography variant="overline" component="h3" sx={{ color: "text.secondary", fontWeight: 600, lineHeight: 2 }}>
        {title}
      </Typography>
    )}
    {children}
  </Box>
);

const DetailRow = ({ label, value }) =>
  value ? (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.75 }}>
      <Typography variant="body2" sx={{ color: "text.secondary", flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ textAlign: "right", overflowWrap: "anywhere" }}>
        {value}
      </Typography>
    </Box>
  ) : null;

const MediaThumb = ({ file, index, onOpen }) => {
  const coordinates = getCoordinates(file);
  const kind = getMediaKind(file.fileType);
  const isImage = kind === "image" && file.url;
  const isVideo = kind === "video" && file.url;
  const label = file.description || `${isVideo ? "Video" : isImage ? "Photo" : "File"} ${index + 1}`;

  return (
    <ButtonBase
      onClick={() => onOpen(file)}
      disabled={!file.url}
      sx={{
        display: "block",
        width: "100%",
        textAlign: "left",
        border: 1,
        borderColor: "divider",
        borderRadius: 1.5,
        overflow: "hidden",
        bgcolor: "background.paper",
        "&:hover": { borderColor: "text.disabled" },
        "&.Mui-focusVisible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
      }}
    >
      <Box sx={{ position: "relative", height: 110, bgcolor: "action.hover", display: "grid", placeItems: "center", color: "text.secondary" }}>
        {isImage ? (
          <Box component="img" src={file.url} alt="" loading="lazy" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : isVideo ? (
          <OndemandVideoIcon />
        ) : (
          <InsertDriveFileOutlinedIcon />
        )}
        {coordinates && (
          <Box
            title="Has GPS location"
            sx={{ position: "absolute", top: 6, right: 6, display: "grid", placeItems: "center", width: 22, height: 22, borderRadius: "50%", bgcolor: "rgba(15,23,42,0.7)", color: "#fff" }}
          >
            <PlaceOutlinedIcon sx={{ fontSize: 14 }} />
          </Box>
        )}
      </Box>
      <Box sx={{ px: 1.25, py: 1 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
          {label}
        </Typography>
        <Typography variant="caption" noWrap component="div" sx={{ color: "text.secondary" }}>
          {file.source === "field" ? file.fieldKey : "Survey"}
          {formatDate(getMediaCapturedAt(file)) ? ` · ${formatDate(getMediaCapturedAt(file))}` : ""}
        </Typography>
      </Box>
    </ButtonBase>
  );
};

/** Drawer with a survey's details, fields and media, opened from a survey marker on the map. */
const SurveySidebar = ({ open, survey, loading, onClose }) => {
  const [selectedMedia, setSelectedMedia] = useState(null);
  const surveyCoordinates = getCoordinates(survey);
  const surveyLocationName = useReverseGeocode(surveyCoordinates?.latitude ?? null, surveyCoordinates?.longitude ?? null);

  if (!open) return null;

  const status = SURVEY_STATUSES[survey?.status];
  const allMediaFiles = survey ? getAllMediaFiles(survey) : [];
  const createdBy = personName(survey?.createdBy, survey?.created_by);
  const updatedBy = personName(survey?.updatedBy, survey?.updated_by);
  const administrativeArea = [survey?.blockName, survey?.districtName, survey?.stateName].filter(Boolean).join(", ");
  const contact = survey?.contactPerson;

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420, md: 460 } } } }}
      >
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            display: "flex",
            alignItems: "flex-start",
            gap: 1.5,
            px: 2.5,
            py: 2,
            bgcolor: "background.paper",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" component="h2" sx={{ overflowWrap: "anywhere" }}>
              {loading ? "Loading survey…" : survey?.name || survey?.title || "Survey"}
            </Typography>
            {!loading && survey && (
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.75 }}>
                {survey.surveyType && <StatusPill label={`${getSurveyTypeLabel(survey.surveyType)} survey`} tone="default" />}
                {status && <StatusPill label={status.label} tone={status.tone} />}
              </Box>
            )}
          </Box>
          <IconButton onClick={onClose} aria-label="Close survey details" size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {loading ? (
          <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
            <CircularProgress size={28} />
          </Box>
        ) : !survey ? (
          <Box sx={{ px: 2.5, py: 6, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Couldn't load this survey.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ "& > section + section": { borderTop: 1, borderColor: "divider" } }}>
            {survey.description && (
              <Section>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {survey.description}
                </Typography>
              </Section>
            )}

            <Section title="Location">
              <Typography variant="body2">{surveyLocationName || administrativeArea || "Address not available"}</Typography>
              {surveyLocationName && administrativeArea && (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {administrativeArea}
                </Typography>
              )}
              {surveyCoordinates && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mt: 0.5 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                    {surveyCoordinates.latitude}, {surveyCoordinates.longitude}
                  </Typography>
                  <Link href={mapsUrl(surveyCoordinates.latitude, surveyCoordinates.longitude)} target="_blank" rel="noopener noreferrer" variant="body2" sx={{ fontWeight: 600 }}>
                    Google Maps
                  </Link>
                </Box>
              )}
            </Section>

            {contact && (contact.sdeName || contact.engineerName || contact.address) && (
              <Section title="Contacts">
                <DetailRow label="SDE" value={[contact.sdeName, contact.sdeMobile].filter(Boolean).join(" · ")} />
                <DetailRow label="Engineer" value={[contact.engineerName, contact.engineerMobile].filter(Boolean).join(" · ")} />
                <DetailRow label="Address" value={contact.address} />
              </Section>
            )}

            <Section title="Record">
              <DetailRow label="Created" value={formatDate(survey.createdOn || survey.created_on)} />
              <DetailRow label="Created by" value={createdBy} />
              <DetailRow label="Updated" value={formatDate(survey.updatedOn || survey.updated_on)} />
              <DetailRow label="Updated by" value={updatedBy} />
            </Section>

            {survey.fields && survey.fields.length > 0 && (
              <Section title={`Fields (${survey.fields.length})`}>
                <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1.5 }}>
                  {survey.fields.map((field, index) => (
                    <Box
                      key={field._id || index}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 2,
                        px: 1.5,
                        py: 1,
                        "&:not(:last-of-type)": { borderBottom: 1, borderColor: "divider" },
                      }}
                    >
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        {field.key}
                      </Typography>
                      <Typography variant="body2" sx={{ textAlign: "right", fontWeight: 500, color: field.value ? "text.primary" : "text.disabled" }}>
                        {field.value || "—"}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Section>
            )}

            <Section title={`Media (${allMediaFiles.length})`}>
              {allMediaFiles.length > 0 ? (
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1.5 }}>
                  {allMediaFiles.map((file, index) => (
                    <MediaThumb key={`${file.source}-${index}`} file={file} index={index} onOpen={setSelectedMedia} />
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  No photos or videos for this survey.
                </Typography>
              )}
            </Section>

            {survey.others && Object.keys(survey.others).length > 0 && (
              <Section title="Additional information">
                {Object.entries(survey.others).map(([key, value]) => (
                  <DetailRow key={key} label={key} value={typeof value === "object" ? JSON.stringify(value) : String(value)} />
                ))}
              </Section>
            )}
          </Box>
        )}
      </Drawer>

      {selectedMedia && (
        <MediaViewerDialog
          media={selectedMedia}
          subtitle={selectedMedia.source === "field" ? `Field: ${selectedMedia.fieldKey}` : "Survey media"}
          onClose={() => setSelectedMedia(null)}
        />
      )}
    </>
  );
};

export default SurveySidebar;
