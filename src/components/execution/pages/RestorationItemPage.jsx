import React, { useCallback, useEffect, useState } from "react";
import { Box, Button, Card, CircularProgress, TextField, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckIcon from "@mui/icons-material/Check";
import PageHeader from "../../common/PageHeader";
import executionService from "../../../services/executionService.jsx";
import { usePermissions } from "../../../hooks/usePermissions";
import { useExecutionConfig } from "../../../hooks/useExecutionConfig";
import MediaPicker, { MediaStrip, MediaThumb } from "../MediaPicker";
import ExecMediaViewer from "../ExecMediaViewer";
import { anyPending, fromSaved, toMediaFile } from "../mediaItems";
import { PageState, StickyActionBar } from "../execUi";
import { attentionMessage, reportError, showToast } from "../toast";
import { useExecContext } from "../useExecContext";

const Column = ({ caption, children }) => (
  <Box sx={{ flex: 1, minWidth: 0 }}>
    <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 0.75, textTransform: "uppercase", letterSpacing: 0.5 }}>
      {caption}
    </Typography>
    {children}
  </Box>
);

/**
 * One subsection's restoration: its before photo (site condition) next to the after
 * photo; video required, more photos and a note optional. Saved to the server on Done
 * (not a local draft), because restoring a long section takes several visits.
 */
const RestorationItemPage = () => {
  const { sectionId, subSectionId } = useParams();
  const { can } = usePermissions();
  const { config } = useExecutionConfig();
  const rule = config?.mediaRules?.restorationItem || { minPhotos: 1, maxPhotos: 3, video: "required" };
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [media, setMedia] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(null);
  const row = data?.items.find((r) => r.subSection._id === subSectionId);
  const go = useExecContext(data ? { blockProfileId: data.section?.blockProfile, sectionId, sectionName: data.section?.name } : { sectionId });
  const backTo = `/sections/${sectionId}/restoration`;

  const load = useCallback(async () => {
    try {
      setLoadError("");
      const res = await executionService.getRestoration(sectionId);
      const found = res.items.find((r) => r.subSection._id === subSectionId);
      if (!found) throw new Error("Subsection not found in this section");
      setData(res);
      setMedia({
        photos: (found.item?.photos || []).map((m, i) => fromSaved(m, `saved${i}`)),
        video: fromSaved(found.item?.video, "savedVideo"),
      });
      setRemarks(found.item?.remarks || "");
    } catch (e) {
      setLoadError(e.message || "Failed to load the restoration");
    }
  }, [sectionId, subSectionId]);

  useEffect(() => {
    load();
  }, [load]);

  const header = (
    <PageHeader
      title={row?.subSection.name || "Restoration"}
      subtitle={data ? `Restoration · ${data.section?.name}` : undefined}
      actions={
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => go(backTo)}>
          Back to restoration
        </Button>
      }
    />
  );

  if (!data || !media) {
    return (
      <Box>
        {header}
        <PageState error={loadError} onRetry={load} />
      </Box>
    );
  }

  const editable = (data.status === "READY" || data.status === "REJECTED") && can("executeRestoration");
  const before = row?.before;

  const save = async () => {
    const e = {};
    if (!media.photos.length) e.photos = "Take the after photo";
    if (!media.video) e.video = "Record a video";
    setErrors(e);
    if (Object.keys(e).length) {
      showToast(attentionMessage(e), "error");
      return;
    }
    if (anyPending([...media.photos, media.video])) {
      showToast("Wait for the uploads to finish", "warning");
      return;
    }
    try {
      setSaving(true);
      await executionService.saveRestorationItem(sectionId, subSectionId, { photos: media.photos.map(toMediaFile), video: toMediaFile(media.video), remarks });
      go(backTo);
    } catch (err) {
      setErrors(err.fieldErrors || {});
      reportError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 760 }}>
      {header}
      <Card sx={{ p: 2, mb: 2, display: "flex", gap: 2 }}>
        <Column caption="Before">
          {before ? (
            <MediaThumb media={before} size={150} onClick={() => setViewing(before)} />
          ) : (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              No before photo
            </Typography>
          )}
        </Column>
        <Column caption="After">
          {media.photos[0] ? (
            <MediaThumb media={media.photos[0]} size={150} onClick={() => setViewing(media.photos[0])} />
          ) : (
            <Typography variant="body2" sx={{ color: errors.photos ? "error.main" : "text.secondary" }}>
              Take the after photo below
            </Typography>
          )}
        </Column>
      </Card>
      <Card sx={{ p: 2.5 }}>
        {editable ? (
          <MediaPicker title="After photos" rule={rule} value={media} onUpdate={(fn) => setMedia((prev) => fn(prev))} errors={{ photos: errors.photos, video: errors.video }} />
        ) : (
          <MediaStrip media={media} />
        )}
        <TextField
          fullWidth
          size="small"
          label="Note (optional)"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="e.g. Trench backfilled, surface restored"
          disabled={!editable}
          sx={{ mt: 2.5 }}
        />
      </Card>
      {editable && (
        <StickyActionBar>
          <Button variant="contained" startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />} onClick={save} disabled={saving}>
            Done
          </Button>
        </StickyActionBar>
      )}
      {viewing && <ExecMediaViewer media={viewing} onClose={() => setViewing(null)} />}
    </Box>
  );
};

export default RestorationItemPage;
