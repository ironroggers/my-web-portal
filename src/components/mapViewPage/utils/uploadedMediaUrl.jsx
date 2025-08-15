import { HOTO_URL } from "../../../API/api-keys";

const uploadedMediaUrl = async (file) => {
  console.log("file", file.name);
  const response = await fetch(`${HOTO_URL}/api/media/upload-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
    }),
  });

  const { data: uploadData } = await response.json();

  // Upload file to S3 using signed URL
  const uploadResponse = await fetch(uploadData.signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error("Failed to upload file to S3");
  }

  return uploadData.fileUrl;
};

export default uploadedMediaUrl;
