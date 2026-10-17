import { useEffect, useState } from "react";
import executionService from "../services/executionService.jsx";

// Loaded once per page load and shared by every page
let request = null;
let cached = null;

const loadConfig = () => {
  if (!request) {
    request = executionService
      .getConfig()
      .then((config) => {
        cached = config;
        return config;
      })
      .catch((error) => {
        request = null;
        throw error;
      });
  }
  return request;
};

/**
 * The execution config: types, entry fields, options, status labels and tones,
 * media rules and limits. Pages render their type-specific forms from it.
 */
export const useExecutionConfig = () => {
  const [state, setState] = useState({ config: cached, error: "" });

  useEffect(() => {
    if (cached) return undefined;
    let active = true;
    loadConfig()
      .then((config) => active && setState({ config, error: "" }))
      .catch((error) => active && setState({ config: null, error: error.message || "Failed to load the execution settings" }));
    return () => {
      active = false;
    };
  }, []);

  const { config } = state;
  return {
    config,
    error: state.error,
    loading: !config && !state.error,
    typeOf: (key) => config?.types?.[key],
    statusOf: (key) => config?.statuses?.[key] || { label: key || "Unknown", tone: "neutral" },
    restorationOf: (key) => config?.restorationStates?.[key] || { label: key || "Unknown", tone: "neutral" },
    isDucting: (key) => config?.types?.[key]?.kind === "ducting",
  };
};

// Config tones → MUI palette keys (StatusPill takes these)
export const toneColor = (tone) => ({ neutral: "default", info: "info", warning: "warning", success: "success", error: "error" })[tone] || "default";
