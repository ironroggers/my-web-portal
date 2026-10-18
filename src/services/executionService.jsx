import { EXECUTION_URL } from "../API/api-keys.jsx";

// OFC execution API. Function names match Locus/src/services/executionApi.js one to one.
//
// The execution service has no auth yet: these headers say who is acting so the
// server can record it in the history. The token is sent too, for when auth lands.
const base = EXECUTION_URL?.replace(/\/$/, "");

const storedUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
};

export const executionHeaders = () => {
  const user = storedUser();
  let token = null;
  try {
    token = localStorage.getItem("token");
  } catch {
    token = null;
  }
  const id = user._id || user.id;
  return {
    "Content-Type": "application/json",
    "X-Client": "web",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(id ? { "X-User-Id": String(id) } : {}),
    ...(user.username ? { "X-User-Name": encodeURIComponent(user.username) } : {}),
    ...(user.role ? { "X-User-Role": encodeURIComponent(user.role) } : {}),
  };
};

// Errors carry the status, the server's code (STALE, WRONG_STATE, …) and per-field
// messages keyed by request path, e.g. "pit.refs.1.tapeDistanceM"
const request = async (path, { method = "GET", body, query } = {}) => {
  const params = query
    ? new URLSearchParams(
        Object.entries(query)
          .filter(([, value]) => value !== undefined && value !== null && value !== "")
          .map(([key, value]) => [key, String(value)])
      ).toString()
    : "";
  const res = await fetch(`${base}${path}${params ? `?${params}` : ""}`, {
    method,
    headers: executionHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error(data?.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.code = data?.code;
    error.fieldErrors = data?.errors || {};
    error.isStale = res.status === 409 && data?.code === "STALE";
    throw error;
  }
  return data;
};

const id = (value) => encodeURIComponent(value);

const executionService = {
  // ---- config and permissions
  getConfig: () => request("/api/execution/config"),
  getPermissions: (role) => request("/api/permissions", { query: { role } }),

  // ---- blocks
  listBlocks: ({ q, status, district, page = 1, limit = 20 } = {}) =>
    request("/api/block-profiles", { query: { q, status, district, page, limit } }),
  getDistricts: () => request("/api/block-profiles/districts"),
  getBlock: (blockId) => request(`/api/block-profiles/${id(blockId)}`),
  // Everything of a block with a place on the map: infra, sections, subsections, geotagged media
  getBlockMap: (blockId) => request(`/api/block-profiles/${id(blockId)}/map`),

  // ---- infra
  getBlockInfra: (blockId) => request(`/api/block-profiles/${id(blockId)}/infra`),
  saveBlockInfra: (blockId, body) => request(`/api/block-profiles/${id(blockId)}/infra`, { method: "PUT", body }),
  getGpInfraList: (blockId) => request(`/api/block-profiles/${id(blockId)}/gp-infra`),
  getGpInfra: (blockId, lgdCode) => request(`/api/block-profiles/${id(blockId)}/gps/${id(lgdCode)}/infra`),
  saveGpInfra: (blockId, lgdCode, body) =>
    request(`/api/block-profiles/${id(blockId)}/gps/${id(lgdCode)}/infra`, { method: "PUT", body }),

  // ---- sections and subsections
  listSections: (blockId, { page = 1, limit = 1000 } = {}) =>
    request("/api/sections", { query: { blockProfile: blockId, page, limit } }),
  getSection: (sectionId) => request(`/api/sections/${id(sectionId)}`),
  listSubsections: (sectionId, { typeOfWork, executionStatus, q, page = 1, limit = 1000 } = {}) =>
    request("/api/subsections", { query: { section: sectionId, typeOfWork, executionStatus, q, page, limit } }),
  previewName: (sectionId, { roadName, typeOfWork } = {}) =>
    request("/api/subsections/next-name", { query: { section: sectionId, roadName, typeOfWork } }),
  createSubsection: (body) => request("/api/subsections", { method: "POST", body }),
  getSubsection: (subId) => request(`/api/subsections/${id(subId)}`),
  getStartPitSuggestion: (subId) => request(`/api/subsections/${id(subId)}/start-pit-suggestion`),
  startSubsection: (subId, body) => request(`/api/subsections/${id(subId)}/start`, { method: "POST", body }),
  addEntry: (subId, body) => request(`/api/subsections/${id(subId)}/entries`, { method: "POST", body }),
  updateEntry: (subId, entryId, body) =>
    request(`/api/subsections/${id(subId)}/entries/${id(entryId)}`, { method: "PUT", body }),
  deleteEntry: (subId, entryId) => request(`/api/subsections/${id(subId)}/entries/${id(entryId)}`, { method: "DELETE" }),
  endSubsection: (subId, body) => request(`/api/subsections/${id(subId)}/end`, { method: "POST", body }),
  reopenSubsection: (subId, version) => request(`/api/subsections/${id(subId)}/reopen`, { method: "POST", body: { version } }),
  approveSubsection: (subId, version) =>
    request(`/api/subsections/${id(subId)}/approve`, { method: "POST", body: { version } }),
  rejectSubsection: (subId, version, remark) =>
    request(`/api/subsections/${id(subId)}/reject`, { method: "POST", body: { version, remark } }),

  // ---- restoration
  getRestoration: (sectionId) => request(`/api/sections/${id(sectionId)}/restoration`),
  saveRestorationItem: (sectionId, subId, body) =>
    request(`/api/sections/${id(sectionId)}/restoration/items/${id(subId)}`, { method: "PUT", body }),
  submitRestoration: (sectionId, version) =>
    request(`/api/sections/${id(sectionId)}/restoration/submit`, { method: "POST", body: { version } }),
  approveRestoration: (sectionId, version) =>
    request(`/api/sections/${id(sectionId)}/restoration/approve`, { method: "POST", body: { version } }),
  rejectRestoration: (sectionId, version, remark) =>
    request(`/api/sections/${id(sectionId)}/restoration/reject`, { method: "POST", body: { version, remark } }),

  // ---- inboxes
  listApprovals: (filters = {}) => request("/api/approvals", { query: filters }),
  getMyWork: () => request("/api/my-work"),

  // ---- HDD autofill: server OCR of the locator screen photo -> { depth, temperature, angle }
  async extractDigits(file) {
    const form = new FormData();
    form.append("image", file, file.name || "locator.jpg");
    const headers = executionHeaders();
    delete headers["Content-Type"];
    const res = await fetch(`${base}/api/ai/extract-digits`, { method: "POST", headers, body: form });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  // ---- media: presign, then PUT the file to S3 (XHR for progress). Returns the fields a MediaFile needs.
  async uploadMedia(file, { filename, contentType, onProgress } = {}) {
    const type = contentType || file.type || "application/octet-stream";
    const safeName = String(filename || file.name || `media-${Date.now()}`).replace(/[^A-Za-z0-9._-]+/g, "_");
    const presign = await request("/api/uploads/presign", { method: "POST", body: { filename: safeName, contentType: type } });
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", presign.uploadUrl);
      xhr.setRequestHeader("Content-Type", type);
      xhr.upload.onprogress = (event) => {
        if (onProgress && event.lengthComputable) onProgress(event.loaded / event.total);
      };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed. Try again.")));
      xhr.onerror = () => reject(new Error("Upload failed. Check the connection and try again."));
      xhr.send(file);
    });
    return { url: presign.publicUrl, s3Key: presign.key, contentType: type, sizeBytes: file.size };
  },
};

export default executionService;
