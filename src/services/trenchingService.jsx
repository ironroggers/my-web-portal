import { EXECUTION_URL } from "../API/api-keys.jsx";

const base = EXECUTION_URL?.replace(/\/$/, "");

const headers = () => ({
  "Content-Type": "application/json",
});

const handle = async (res) => {
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message || `HTTP ${res.status}`);
  }
  return res.json();
};

const trenchingService = {
  async list({ subSectionId, page = 1, limit = 100 } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", String(page));
    if (limit) params.set("limit", String(limit));
    if (subSectionId) params.set("subSection", subSectionId);
    const res = await fetch(`${base}/api/trenchings?${params.toString()}`, {
      method: "GET",
      headers: headers(),
    });
    return handle(res);
  },
  async create(payload) {
    const res = await fetch(`${base}/api/trenchings`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    });
    return handle(res);
  },
  async update(id, updates) {
    const res = await fetch(`${base}/api/trenchings/${id}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(updates),
    });
    return handle(res);
  },
  async remove(id) {
    const res = await fetch(`${base}/api/trenchings/${id}`, {
      method: "DELETE",
      headers: headers(),
    });
    return handle(res);
  },
};

export default trenchingService;


