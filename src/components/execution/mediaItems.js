import executionService from "../../services/executionService.jsx";

// A media item on a form: the captured file plus its upload state. Each one is
// uploaded right after capture, so a step can only be submitted once all are done.

const CLIENT_FIELDS = ["key", "file", "originalFile", "previewUrl", "posterBlob", "posterPreviewUrl", "uploadStatus", "progress", "filename"];

export const newMediaItem = (captured) => ({
  key: `m${Date.now()}${Math.round(Math.random() * 1e6)}`,
  ...captured,
  uploadStatus: "uploading",
  progress: 0,
});

export const isPending = (m) => Boolean(m && m.uploadStatus && m.uploadStatus !== "done");
export const anyPending = (items) => items.filter(Boolean).some(isPending);
export const mediaSrc = (m) => m?.previewUrl || m?.url || "";
export const posterSrc = (m) => m?.posterPreviewUrl || m?.posterUrl || "";

// What the server stores (a MediaFile)
export const toMediaFile = (m) => {
  if (!m) return undefined;
  const out = { ...m };
  CLIENT_FIELDS.forEach((k) => delete out[k]);
  return out;
};

// A saved MediaFile shown on a form again
export const fromSaved = (m, key) => (m ? { ...m, key, uploadStatus: "done" } : null);

// Drafts live in localStorage, which can't hold files: keep uploaded items only
export const toDraftMedia = (m) => (m && m.uploadStatus === "done" ? { ...toMediaFile(m), key: m.key, uploadStatus: "done" } : null);

// Upload the poster (videos) and the file; onPatch(changes) gets progress and the result
export const uploadItem = async (item, onPatch) => {
  if (!item.file) {
    onPatch({ uploadStatus: "failed" });
    return;
  }
  onPatch({ uploadStatus: "uploading", progress: 0 });
  try {
    let posterUrl = item.posterUrl;
    if (item.posterBlob && !posterUrl) {
      const poster = await executionService.uploadMedia(item.posterBlob, { filename: `poster-${Date.now()}.jpg`, contentType: "image/jpeg" });
      posterUrl = poster.url;
    }
    const uploaded = await executionService.uploadMedia(item.file, {
      filename: item.filename,
      contentType: item.contentType,
      onProgress: (progress) => onPatch({ progress }),
    });
    onPatch({ ...uploaded, posterUrl, uploadStatus: "done", progress: 1 });
  } catch {
    onPatch({ uploadStatus: "failed" });
  }
};
