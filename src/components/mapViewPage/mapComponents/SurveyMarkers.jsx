import React from "react";
import { Marker } from "@react-google-maps/api";
import {
  getSurveyMarkerOptions,
  getAllSurveysMarkerOptions,
} from "../utils/mapUtils";

const SurveyMarker = ({ survey, handleSurveyMarkerClick, isAllSurveys }) => {
  if (isAllSurveys) {
    if (!survey.lat || !survey.lng || survey.lat === 0 || survey.lng === 0) {
      return null;
    }
  }

  const position = {
    lat: survey.lat || parseFloat(survey.latitude) || 0,
    lng: survey.lng || parseFloat(survey.longitude) || 0,
  };

  const title = survey.name || survey.title || "Survey Point";

  const markerOptions = isAllSurveys
    ? getAllSurveysMarkerOptions(survey)
    : getSurveyMarkerOptions(survey);

  return (
    <Marker
      position={position}
      title={title}
      onClick={() => handleSurveyMarkerClick(survey._id)}
      icon={markerOptions}
    />
  );
};

const SurveyMarkers = ({
  surveys,
  getSurveysForLocation,
  handleSurveyMarkerClick,
  locationId,
  isAllSurveys = false,
}) => {
  const surveyList = isAllSurveys
    ? surveys
    : getSurveysForLocation(locationId);

  return (
    <>
      {surveyList.map((survey, sidx) => (
        <SurveyMarker
          key={`survey-${locationId || "all"}-${sidx}`}
          survey={survey}
          handleSurveyMarkerClick={handleSurveyMarkerClick}
          isAllSurveys={isAllSurveys}
        />
      ))}
    </>
  );
};

export default SurveyMarkers; 