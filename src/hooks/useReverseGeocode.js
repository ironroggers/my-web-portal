import { useEffect, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { GOOGLE_MAPS_DIRECTIONS_API } from "../API/api-keys";

// Same loader options as the map page, so the Google script is loaded once
const GOOGLE_MAPS_LIBRARIES = ["places"];

/** Address for a coordinate pair from Google's geocoder; "" until it resolves or when unavailable. */
const useReverseGeocode = (latitude, longitude) => {
  const [locationName, setLocationName] = useState("");
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_DIRECTIONS_API,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

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
