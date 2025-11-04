import { Storage } from "@google-cloud/storage";
import { v4 as uuidv4 } from "uuid";

/**
 * Generates pre-signed URL and metadata for file upload
 * @param userId - User identifier for organizing files
 * @param fileName - Optional custom filename
 * @returns Upload credentials object
 */
export const generateUploadCredentials = async (userId, fileName) => {
  try {
    console.log("[Generate Upload URLs] Starting credential generation for userId:", userId);

    // Generate unique file identifier
    const fileId = uuidv4();
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

    // Create organized file path: user_[userId]/[date]/[fileId].[extension]
    const fileExtension = fileName ? fileName.split(".").pop() : "bin";
    const gcsPath = `user_${userId}/${today}/${fileId}.${fileExtension}`;

    // Create file reference in bucket
    const file = bucket.file(gcsPath);

    // Generate pre-signed URL for upload (valid for 15 minutes)
    const [uploadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: "application/octet-stream",
    });

    const credentials = {
      uploadUrl,
      gcsPath,
      gcsUri: `gs://${process.env.GOOGLE_CLOUD_STORAGE_BUCKET}/${gcsPath}`,
      bucketName: process.env.GOOGLE_CLOUD_STORAGE_BUCKET,
      fileId,
    };

    console.log("[Generate Upload URLs] Generated credentials successfully");

    return credentials;
  } catch (error) {
    console.error("[Generate Upload URLs] Error generating credentials:", error);
    throw new Error("Failed to generate upload credentials");
  }
};

// Defensive initialization: Only initialize Storage if credentials are available
let storage = null;
let bucket = null;

try {
  const base64Key = process.env.GOOGLE_CLOUD_CREDENTIALS_BASE64;
  
  // Skip initialization during build or with dummy/missing credentials
  if (!base64Key || base64Key.includes('dummy') || base64Key.includes('build')) {
    console.warn("[GCS Lib] ⚠️  GCS credentials not available - skipping Storage initialization");
  } else {
    // Decode the Base64 service account key
    const credentials = JSON.parse(Buffer.from(base64Key, "base64").toString());

    // Initialize Google Cloud Storage client
    storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      credentials,
    });

    bucket = storage.bucket(process.env.GOOGLE_CLOUD_STORAGE_BUCKET);
    console.log("[GCS Lib] Storage initialized successfully");
  }
} catch (error) {
  console.error("[GCS Lib] Failed to initialize Storage:", error);
  storage = null;
  bucket = null;
}

export { storage, bucket };
