import { HOTO_URL, LOCATION_URL } from "../API/api-keys";
import { Alert } from "@mui/material";

export const fetchLocationDetails = async (locationId) => {
  const response = await fetch(`${LOCATION_URL}/api/locations/${locationId}`);
  const data = await response.json();
  return data;
};

export const fetchAllHotoList = async (locationId) => {
  try {
    // Fetch all three types of HOTO data in parallel
    const result = await fetch(`${HOTO_URL}/api/hotos/location/${locationId}`);
    const data = (await result.json()).data;
    // console.log(data);

    const blockHotoInfo = data.filter((hoto) => hoto.hotoType === "block");
    const gpHotoInfo = data.filter((hoto) => hoto.hotoType === "gp");
    const ofcHotoInfo = data.filter((hoto) => hoto.hotoType === "ofc");

    return {
      blockHotoInfo,
      gpHotoInfo,
      ofcHotoInfo,
    };
  } catch (error) {
    console.error("Error fetching HOTO entries:", error);
    throw error;
  }
};

export const uploadHotoMedia = async (data) => {
  try {
    // Process each field's media files
    const updatedFields = await Promise.all(
      data.fields.map(async (field) => {
        if (!field.mediaFiles || field.mediaFiles.length === 0) {
          return field;
        }

        // Upload each media file in the field
        const updatedMediaFiles = await Promise.all(
          field.mediaFiles.map(async (media) => {
            // Get signed URL for upload
            const response = await fetch(`${HOTO_URL}/api/media/upload-url`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                filename: media.file.name,
                contentType: media.file.type,
              }),
            });

            if (!response.ok) {
              throw new Error("Failed to get upload URL");
            }

            const { data: uploadData } = await response.json();

            // Upload file to S3 using signed URL
            const uploadResponse = fetch(uploadData.signedUrl, {
              method: "PUT",
              headers: {
                "Content-Type": media.file.type,
              },
              body: media.file,
            });

            // if (!uploadResponse.ok) {
            //   throw new Error('Failed to upload file to S3');
            // }

            // Return updated media object with the S3 URL
            return {
              ...media,
              url: uploadData.fileUrl,
              fileName: uploadData.fileName,
              fileType: uploadData.fileType,
            };
          })
        );

        // Return updated field with new media files
        return {
          ...field,
          mediaFiles: updatedMediaFiles,
        };
      })
    );

    // Return updated data with new fields
    return {
      ...data,
      fields: updatedFields,
    };
  } catch (error) {
    console.error("Error uploading media:", error);
    throw error;
  }
};

export const createHoto = async (data) => {
  try {
    const response = await fetch(`${HOTO_URL}/api/hotos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create HOTO");
    }

    const responseData = await response.json();
    return responseData.data;
  } catch (error) {
    console.error("Error creating HOTO:", error);
    // display error message to user
    alert(
      error.message || "Failed to create HOTO entry. Please try again later."
    );

    throw error;
  }
};

export const updateHoto = async (hotoId, data) => {
  try {
    const response = await fetch(`${HOTO_URL}/api/hotos/${hotoId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update HOTO");
    }

    const responseData = await response.json();
    return responseData.data;
  } catch (error) {
    console.error("Error updating HOTO:", error);
    alert(
      error.message || "Failed to update HOTO entry. Please try again later."
    );
    throw error;
  }
};

export const deleteHoto = async (hotoId) => {
  try {
    const response = await fetch(`${HOTO_URL}/api/hotos/${hotoId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete HOTO");
    }

    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error("Error deleting HOTO:", error);
    alert(
      error.message || "Failed to delete HOTO entry. Please try again later."
    );
    throw error;
  }
};

export const fetchSingleHoto = async (hotoId) => {
  try {
    const response = await fetch(`${HOTO_URL}/api/hotos/${hotoId}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch HOTO details");
    }

    const responseData = await response.json();
    return responseData.data;
  } catch (error) {
    console.error("Error fetching HOTO details:", error);
    alert(
      error.message || "Failed to fetch HOTO details. Please try again later."
    );
    throw error;
  }
};
