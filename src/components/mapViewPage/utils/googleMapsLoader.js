import { GOOGLE_MAPS_DIRECTIONS_API } from "../../../API/api-keys.jsx";

// Every useJsApiLoader call must pass the same options (the script loads once per
// page), so the Locations map and the block profile map both use this object.
// The libraries array stays module-level so the loader doesn't reload.
export const GOOGLE_MAPS_LOADER_OPTIONS = {
  googleMapsApiKey: GOOGLE_MAPS_DIRECTIONS_API,
  libraries: ["places"],
};
