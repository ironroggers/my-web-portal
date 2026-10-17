// Wizard drafts (create, start, end, entry, reference point) kept in the browser with
// their current step, so a half-filled form survives a reload. Storage errors are
// ignored: the form still works, it just isn't kept.
const PREFIX = "ofcDraft:";

export const loadDraft = (key) => {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveDraft = (key, value) => {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // best effort
  }
};

export const clearDraft = (key) => {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // best effort
  }
};
