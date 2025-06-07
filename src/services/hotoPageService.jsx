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
    // Function to get current position
    const getCurrentPosition = () => {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported'));
          return;
        }
        
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        });
      });
    };

    // Function to get place name from coordinates
    const getPlaceFromCoordinates = async (latitude, longitude) => {
      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );
        const data = await response.json();
        return data.locality || data.city || data.principalSubdivision || 'Unknown Location';
      } catch (error) {
        console.error('Error getting place name:', error);
        return 'Unknown Location';
      }
    };

    // Process each field's media files
    const updatedFields = await Promise.all(
      data.fields.map(async (field) => {
        if (!field.mediaFiles || field.mediaFiles.length === 0) {
          return field;
        }

        // Upload each media file in the field
        const updatedMediaFiles = await Promise.all(
          field.mediaFiles.map(async (media) => {
            // Skip if this media doesn't have a file (already uploaded)
            if (!media.file) {
              return media;
            }

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
            const uploadResponse = await fetch(uploadData.signedUrl, {
              method: "PUT",
              headers: {
                "Content-Type": media.file.type,
              },
              body: media.file,
            });

            if (!uploadResponse.ok) {
              throw new Error(`Failed to upload file to S3: ${uploadResponse.status}`);
            }

            // Get location data
            let latitude = "";
            let longitude = "";
            let place = "";
            let accuracy = null;

            try {
              const position = await getCurrentPosition();
              latitude = position.coords.latitude.toString();
              longitude = position.coords.longitude.toString();
              accuracy = position.coords.accuracy;
              place = await getPlaceFromCoordinates(latitude, longitude);
            } catch (error) {
              console.log('Location not available for web upload:', error.message);
              // Use existing location data from media if available
              latitude = media.latitude || "";
              longitude = media.longitude || "";
              place = media.place || "";
              accuracy = media.accuracy || null;
            }

            // Get device info
            const deviceName = navigator.userAgent || 'Unknown Web Browser';

            // Return updated media object with complete structure matching mobile app
            return {
              url: uploadData.fileUrl,
              fileType: uploadData.fileType,
              description: media.description || '',
              latitude: latitude,
              longitude: longitude,
              deviceName: deviceName,
              accuracy: accuracy,
              place: place,
              source: 'web'
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
