import { HOTO_URL, LOCATION_URL } from "../API/api-keys";

export const fetchLocationDetails = async (locationId) => {
  const response = await fetch(`${LOCATION_URL}/api/locations/${locationId}`);
  const data = await response.json();
  return data;
};

export const fetchAllHotoList = async (locationId) => {
  try {
    let data = {
      blockHotoInfo: { data: [] },
      gpHotoInfo: { data: [] },
      ofcHotoInfo: { data: [] },
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

export const uploadHotoMedia = async (data) => {
  // data in fields array in mediaFiles array update url
  // with dummy url

  const newData = {
    ...data,
    fields: data.fields.map((field) => ({
      ...field,
      mediaFiles: field.mediaFiles.map((media) => ({
        ...media,
        url: "dummy-url",
      })),
    })),
  };

  return newData;
};

export const createHoto = async (data) => {
  try {
    const response = await fetch(`${HOTO_URL}/api/hotos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create HOTO');
    }

    const responseData = await response.json();
    return responseData.data;
  } catch (error) {
    console.error("Error creating HOTO:", error);
    throw error;
  }
};


