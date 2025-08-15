import { LOCATION_URL } from "../../../API/api-keys";
import uploadedMediaUrl from "./uploadedMediaUrl";

const handleKMLUpload = async (file, locationId) => {
  const url = await uploadedMediaUrl(file);

  const kmlData = {
    name: file.name,
    content: url,
    deleteOrAdd: "add",
  };

  console.log("kmlData", kmlData);

  const response = await fetch(
    `${LOCATION_URL}/api/locations/kml/${locationId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(kmlData),
    }
  );
  console.log("response", response);
};

const handleKMLDelete = async (locationId, index) => {
  const response = await fetch(
    `${LOCATION_URL}/api/locations/kml/${locationId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ index, deleteOrAdd: "delete" }),
    }
  );
};

export { handleKMLUpload, handleKMLDelete };
