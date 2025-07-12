const getGoogleSymbolPath = () =>
  window.google && window.google.maps
    ? window.google.maps.SymbolPath.CIRCLE
    : undefined;

export const getRouteMarkerOptions = ({
  isSelected,
  isOthers,
  isTemporary,
  isBHQ,
  routeColor,
}) => ({
  path: getGoogleSymbolPath(),
  scale: isSelected ? (isOthers ? 8 : 11) : isOthers ? 5 : 7,
  fillColor: isTemporary
    ? "#ff9800"
    : isOthers
    ? "#ffffff"
    : isBHQ
    ? "#f44336"
    : routeColor,
  fillOpacity: 1,
  strokeColor: isSelected ? "#000" : isOthers ? "#000" : "#fff",
  strokeWeight: isSelected ? 4 : 2,
});

export const getSurveyMarkerOptions = (survey) => ({
  path: getGoogleSymbolPath(),
  scale: 8,
  fillColor: "#FFD700",
  fillOpacity: 1,
  strokeColor: "#000",
  strokeWeight: 2,
});

export const getAllSurveysMarkerOptions = (survey) => {
  let fillColor;
  switch (survey.surveyType) {
    case "block":
      fillColor = "#3498db";
      break;
    case "gp":
      fillColor = "#e74c3c";
      break;
    case "ofc":
      fillColor = "#27ae60";
      break;
    default:
      fillColor = "#FFD700";
  }

  return {
    path: getGoogleSymbolPath(),
    scale: 10,
    fillColor,
    fillOpacity: 1,
    strokeColor: "#000",
    strokeWeight: 2,
  };
}; 