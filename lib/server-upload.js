import { generateUploadCredentials, UploadCredentials } from "./google-storage";

/**
 * Uploads a file to Google Cloud Storage from the server
 * @param fileBuffer - The file data as a Buffer
 * @param userId - User identifier
 * @param fileName - Original filename
 * @param contentType - MIME type of the file
 * @returns Upload result with success status and file information
 */
export const performServerUpload = async (fileBuffer, userId, fileName, contentType) => {
  try {
    console.log("[Server Upload] Starting upload process", {
      bufferSize: fileBuffer.length,
      fileName,
      contentType,
      userId,
    });

    // Generate upload credentials
    const credentials = await generateUploadCredentials(userId, fileName);

    console.log("[Server Upload] Generated credentials successfully");

    // Upload file to Google Cloud Storage
    const uploadResult = await uploadToGCS(fileBuffer, credentials, contentType);

    console.log("[Server Upload] Upload completed successfully");

    return {
      success: true,
      fileId: credentials.fileId,
      gcsUri: credentials.gcsUri,
    };
  } catch (error) {
    console.error("[Server Upload] Upload failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Performs the actual upload to Google Cloud Storage
 * @param fileBuffer - File data
 * @param credentials - Upload credentials from generateUploadCredentials
 * @param contentType - MIME type
 */
const uploadToGCS = async (fileBuffer, credentials, contentType) => {
  console.log("[GCS Upload] Starting upload to Google Cloud Storage");

  try {
    const response = await fetch(credentials.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": fileBuffer.length.toString(),
      },
      body: fileBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[GCS Upload] Upload failed:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`GCS upload failed with status ${response.status}: ${errorText}`);
    }

    console.log("[GCS Upload] Upload successful");
  } catch (error) {
    console.error("[GCS Upload] Upload error:", error);
    throw new Error(`GCS upload failed: ${error.message}`);
  }
};
