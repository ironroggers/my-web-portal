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

const sectionsService = {
  async get(id) {
    const res = await fetch(`${base}/api/sections/${id}`, {
      method: "GET",
      headers: headers(),
    });
    return handle(res);
  },
  async list({ locationId, page = 1, limit = 20, q = "" } = {}) {
    const params = new URLSearchParams();
    if (page) params.set("page", String(page));
    if (limit) params.set("limit", String(limit));
    if (q) params.set("q", q);
    // Backend list supports generic filters via q; filter by location on client for now
    const res = await fetch(`${base}/api/sections?${params.toString()}`, {
      method: "GET",
      headers: headers(),
    });
    const data = await handle(res);
    if (locationId) {
      const items = (data.items || []).filter((s) => String(s.location) === String(locationId));
      return { ...data, items, total: items.length };
    }
    return data;
  },

  async create(payload) {
    const res = await fetch(`${base}/api/sections`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    });
    return handle(res);
  },

  async update(id, updates) {
    const res = await fetch(`${base}/api/sections/${id}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(updates),
    });
    return handle(res);
  },

  async remove(id) {
    const res = await fetch(`${base}/api/sections/${id}`, {
      method: "DELETE",
      headers: headers(),
    });
    return handle(res);
  },
};

export default sectionsService;


