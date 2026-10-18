import { EXECUTION_URL } from "../API/api-keys.jsx";

const base = EXECUTION_URL?.replace(/\/$/, "");

// The execution service doesn't check tokens yet; sending one now means
// nothing changes here once it does.
const headers = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Errors keep the status and per-field messages so forms can point at the right input
const handle = async (res) => {
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    const error = new Error(err?.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.fieldErrors = err?.errors || {};
    throw error;
  }
  return res.json();
};

const KML_CONTENT_TYPES = {
  kml: "application/vnd.google-earth.kml+xml",
  kmz: "application/vnd.google-earth.kmz",
};

const blockProfileService = {
  async list({ page = 1, limit = 20, q = "", status = "", district = "" } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", String(page));
    if (limit) params.set("limit", String(limit));
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (district) params.set("district", district);
    const res = await fetch(`${base}/api/block-profiles?${params.toString()}`, { headers: headers() });
    return handle(res);
  },

  async get(id) {
    const res = await fetch(`${base}/api/block-profiles/${id}`, { headers: headers() });
    return handle(res);
  },

  async create(payload) {
    const res = await fetch(`${base}/api/block-profiles`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    });
    return handle(res);
  },

  async update(id, payload) {
    const res = await fetch(`${base}/api/block-profiles/${id}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(payload),
    });
    return handle(res);
  },

  // Soft delete (sets INACTIVE). The server refuses with 409 while sections exist unless forced.
  async deactivate(id, { force = false, updatedBy } = {}) {
    const params = new URLSearchParams();
    if (force) params.set("force", "true");
    if (updatedBy) params.set("updatedBy", updatedBy);
    const res = await fetch(`${base}/api/block-profiles/${id}?${params.toString()}`, {
      method: "DELETE",
      headers: headers(),
    });
    return handle(res);
  },

  // { action: { allowed, scope } } for a role, from the server's permission matrix
  async permissions(role) {
    const res = await fetch(`${base}/api/block-profiles/permissions?role=${encodeURIComponent(role)}`, {
      headers: headers(),
    });
    const data = await handle(res);
    return data.actions;
  },

  // Uploads to S3 through the execution service's presign endpoint, then attaches it to the block
  async uploadKml(id, file, uploadedBy) {
    const extension = file.name.split(".").pop().toLowerCase();
    const contentType = file.type || KML_CONTENT_TYPES[extension] || "application/octet-stream";
    // The filename becomes part of the S3 key and public URL
    const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, "_");
    const presign = await handle(
      await fetch(`${base}/api/uploads/presign`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ filename: safeName, contentType }),
      })
    );
    const upload = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: file,
    });
    if (!upload.ok) throw new Error("Failed to upload the file to S3");

    const res = await fetch(`${base}/api/block-profiles/${id}/kml`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        name: file.name,
        url: presign.publicUrl,
        s3Key: presign.key,
        sizeBytes: file.size,
        uploadedBy,
      }),
    });
    return handle(res);
  },

  async removeKml(id, fileId) {
    const res = await fetch(`${base}/api/block-profiles/${id}/kml/${fileId}`, {
      method: "DELETE",
      headers: headers(),
    });
    return handle(res);
  },
};

export default blockProfileService;
