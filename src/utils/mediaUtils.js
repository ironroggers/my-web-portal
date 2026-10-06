// Helpers for survey and HOTO media records

const IMAGE_TYPES = ["image", "jpg", "jpeg", "png", "gif", "bmp", "webp"];
const VIDEO_TYPES = ["video", "mp4", "avi", "mov", "wmv", "flv", "webm"];

// Media records store their type as "IMAGE", "image", "jpg", "video/mp4"…
export const getMediaKind = (fileType) => {
  const value = String(fileType || "").toLowerCase();
  const type = value.split("/")[0];
  const extension = value.split("/").pop();
  if (IMAGE_TYPES.includes(type) || IMAGE_TYPES.includes(extension)) return "image";
  if (VIDEO_TYPES.includes(type) || VIDEO_TYPES.includes(extension)) return "video";
  return "file";
};

export const formatMediaDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const getMediaCapturedAt = (media) =>
  media?.uploadedAt || media?.uploaded_at || media?.timestamp || media?.createdOn || media?.created_on || null;

export const getCoordinates = (item) => {
  const latitude = Number.parseFloat(item?.latitude);
  const longitude = Number.parseFloat(item?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { latitude: latitude.toFixed(6), longitude: longitude.toFixed(6) }
    : null;
};

export const googleMapsUrl = (latitude, longitude) => `https://www.google.com/maps?q=${latitude},${longitude}`;
