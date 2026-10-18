import { STALE_MESSAGE } from "../../utils/executionFormat";

// Short messages for the execution pages: showToast("Entry saved", "success").
// ToastHost (execUi.jsx) is mounted once in App.jsx.
const listeners = new Set();

export const subscribeToasts = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const showToast = (text, severity = "success") => listeners.forEach((fn) => fn({ text, severity, key: Date.now() }));

// A 409 STALE means someone saved first: say so and refetch instead of overwriting
export const reportError = (error, refetch) => {
  if (error?.isStale) {
    showToast(STALE_MESSAGE, "warning");
    refetch?.();
    return;
  }
  showToast(error?.message || "Something went wrong", "error");
};

// "2 things need attention on this step"
export const attentionMessage = (errors) => {
  const n = Object.keys(errors).length;
  return `${n} ${n === 1 ? "thing needs" : "things need"} attention on this step`;
};
