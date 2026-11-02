import { useEffect, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { GOOGLE_MAPS_LOADER_OPTIONS } from "../components/mapViewPage/utils/googleMapsLoader";

/** Address for a coordinate pair from Google's geocoder; "" until it resolves or when unavailable. */
const useReverseGeocode = (latitude, longitude) => {
  const [locationName, setLocationName] = useState("");
  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_LOADER_OPTIONS);

  useEffect(() => {
    if (!isLoaded || latitude == null || longitude == null || Number.isNaN(Number(latitude)) || Number.isNaN(Number(longitude))) {
      setLocationName("");
      return undefined;
    }
    let cancelled = false;
    new window.google.maps.Geocoder().geocode(
      { location: { lat: Number(latitude), lng: Number(longitude) } },
      (results, status) => {
        if (!cancelled) setLocationName(status === "OK" && results?.[0] ? results[0].formatted_address : "");
      }
    );
    return () => {
      cancelled = true;
    };
  }, [isLoaded, latitude, longitude]);

  return locationName;
};

export default useReverseGeocode;
