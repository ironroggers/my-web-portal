import { HOTO_URL, LOCATION_URL } from "../API/api-keys";

export const fetchLocationDetails = async (locationId) => {
  const response = await fetch(`${LOCATION_URL}/api/locations/${locationId}`);
  const data = await response.json();
  return data;
};

export const fetchAllHotoList = async (locationId) => {
  try {
    console.log("locationId", locationId);
    const blockData = await fetchBlockHotoInfo(locationId);
    const gpData = await fetchGpHotoInfo(locationId);
    const ofcData = await fetchOFCInfo(locationId);
    const data = {
      blockHotoInfo: blockData,
      gpHotoInfo: gpData,
      ofcHotoInfo: ofcData,
    };
    return data;
  } catch (error) {
    console.error("Error fetching HOTO entries:", error);
    throw error;
  }
};

const fetchBlockHotoInfo = async (locationId) => {
  const response = await fetch(
    `${HOTO_URL}/api/blockhoto?location=${locationId}`
  );
  const data = await response.json();
  return data;
};

const fetchGpHotoInfo = async (locationId) => {
  const response = await fetch(`${HOTO_URL}/api/gphoto?location=${locationId}`);

  const data = await response.json();
  return data;
};

const fetchOFCInfo = async (locationId) => {
  const response = await fetch(
    `${HOTO_URL}/api/ofchoto?location=${locationId}`
  );

  const data = await response.json();
  return data;
};
