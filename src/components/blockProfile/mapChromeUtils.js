import { useEffect, useRef, useState } from "react";

// What the Master Map and the block profile map share besides their components (MapChrome.jsx):
// a quieter base map, the panel width, settings remembered per browser and the cursor.

// Quieter base map so the network's colours stand out
const QUIET_MAP_STYLES = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "landscape", stylers: [{ saturation: -60 }] },
];

/** Google Map options, once the Maps API has loaded */
export const quietMapOptions = () => ({
  styles: QUIET_MAP_STYLES,
  streetViewControl: false,
  fullscreenControl: true,
  mapTypeControl: true,
  mapTypeControlOptions: {
    style: window.google.maps.MapTypeControlStyle.DROPDOWN_MENU,
    position: window.google.maps.ControlPosition.TOP_LEFT,
    mapTypeIds: ["roadmap", "satellite", "hybrid", "terrain"],
  },
  clickableIcons: false,
});

export const MAP_PANEL_WIDTH = 320;

export const readMapPrefs = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch {
    return {};
  }
};

export const writeMapPrefs = (key, prefs) => {
  try {
    localStorage.setItem(key, JSON.stringify(prefs));
  } catch {
    // Remembering the panel is best-effort
  }
};

/** The coordinates under the mouse, updated once a frame, and copying them */
export const useMapCursor = () => {
  const [cursor, setCursor] = useState(null);
  const [copied, setCopied] = useState(false);
  const frameRef = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);
  const onMouseMove = (e) => {
    const point = e.latLng.toJSON();
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => setCursor(point));
  };
  const onMouseOut = () => setCursor(null);
  const copyCursor = async () => {
    if (!cursor) return;
    try {
      await navigator.clipboard.writeText(`${cursor.lat.toFixed(5)},${cursor.lng.toFixed(5)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return { cursor, copied, copyCursor, onMouseMove, onMouseOut };
};

export const statusBarButtonSx = { color: "text.secondary", "&:hover": { color: "text.primary" } };
