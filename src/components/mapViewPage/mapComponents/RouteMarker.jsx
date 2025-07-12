import React from "react";
import { Marker } from "@react-google-maps/api";
import { getRouteMarkerOptions } from "../utils/mapUtils";

const RouteMarker = ({
  point,
  route,
  pidx,
  isSelected,
  routeColor,
  handleRemoveTemporaryPoint,
  handleRemoveOthersPoint,
  handleLocationMarkerClick,
}) => {
  const routePoint = route.location?.route[pidx];
  const isBHQ = routePoint?.type === "BHQ";
  const isTemporary = routePoint?.isTemporary;
  const isOthers = routePoint?.type === "others";

  const handleClick = () => {
    if (isTemporary) {
      if (window.confirm("Remove this temporary point from the route?")) {
        handleRemoveTemporaryPoint(route.location._id, pidx);
      }
    } else if (isOthers) {
      if (window.confirm("Remove this point from the route?")) {
        handleRemoveOthersPoint(route.location._id, pidx);
      }
    } else {
      handleLocationMarkerClick(route.location._id);
    }
  };

  const markerOptions = getRouteMarkerOptions({
    isSelected,
    isOthers,
    isTemporary,
    isBHQ,
    routeColor,
  });

  const title = isTemporary
    ? "Click to remove this temporary point"
    : isOthers
    ? "Click to remove this point from route"
    : undefined;

  return (
    <Marker
      position={point}
      label={isTemporary ? "+" : `${pidx + 1}`}
      onClick={handleClick}
      icon={markerOptions}
      title={title}
    />
  );
};

export default RouteMarker; 