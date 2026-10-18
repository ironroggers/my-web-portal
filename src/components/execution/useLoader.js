import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Loads data with `load` (a stable function, e.g. from useCallback) on mount and when it
 * changes. Only the latest request updates the state. `data` is undefined until the
 * first load finishes; a failed reload keeps the previous data and sets `error`.
 */
export const useLoader = (load) => {
  const [state, setState] = useState({ data: undefined, error: "" });
  const requestRef = useRef(0);

  const reload = useCallback(async () => {
    const id = ++requestRef.current;
    try {
      const data = await load();
      if (id === requestRef.current) setState({ data, error: "" });
      return data;
    } catch (error) {
      if (id === requestRef.current) setState((s) => ({ data: s.data, error: error.message || "Failed to load" }));
      return undefined;
    }
  }, [load]);

  useEffect(() => {
    reload();
  }, [reload]);

  const setData = useCallback((data) => setState((s) => ({ ...s, data: typeof data === "function" ? data(s.data) : data })), []);

  return { data: state.data, error: state.error, loading: state.data === undefined && !state.error, reload, setData };
};
