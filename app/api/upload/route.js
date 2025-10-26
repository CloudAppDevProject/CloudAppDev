import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { performServerUpload } from "@/lib/server-upload";

/**
 * ==========================================
 *  UPLOAD CONFIGURATION
 * ==========================================
 */
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = ["audio/wav", "audio/mpeg", "audio/mp4", "audio/webm", "image/jpeg", "image/png", "application/pdf"];

// Simple in-memory rate limiting (per IP)
const uploadAttempts = new Map();
const MAX_UPLOADS_PER_HOUR = 50;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(clientId) {
  const now = Date.now();
  const attempts = uploadAttempts.get(clientId);

  if (!attempts || now > attempts.resetTime) {
    uploadAttempts.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (attempts.count >= MAX_UPLOADS_PER_HOUR) return false;
  attempts.count++;
  return true;
}

/**
 * ==========================================
 *  MAIN UPLOAD HANDLER
 * ==========================================
 */
export async function POST(request) {
  try {
    console.log("[Upload API] Incoming request");

    // Identify client (for rate limit)
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
    }

    const formData = await request.formData();
    const files = formData.getAll("file");
    const userId = formData.get("userId");
    const fileNameOverride = formData.get("fileName");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const results = [];

    for (const file of files) {
      if (!file) continue;

      // --- Validate file ---
      if (file.size === 0) {
        results.push({ success: false, error: "File is empty", fileName: file.name });
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        results.push({
          success: false,
          error: `File ${file.name} exceeds 20MB limit`,
          fileName: file.name,
        });
        continue;
      }

      if (file.type && !ALLOWED_TYPES.includes(file.type)) {
        results.push({
          success: false,
          error: `Unsupported type: ${file.type}`,
          fileName: file.name,
        });
        continue;
      }

      // --- Generate unique file name ---
      const fileId = uuidv4();
      const fileExtension = fileNameOverride?.split(".").pop() || file.name?.split(".").pop() || "bin";
      const uniqueFileName = `${fileId}.${fileExtension}`;

      // --- Convert file ---
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      console.log(`[Upload API] Uploading file ${uniqueFileName}`);

      // --- Perform actual upload ---
      const uploadResult = await performServerUpload(fileBuffer, userId, uniqueFileName, file.type || "application/octet-stream");

      if (!uploadResult.success) {
        results.push({
          success: false,
          fileName: uniqueFileName,
          error: uploadResult.error || "Unknown upload error",
        });
        continue;
      }

      // --- Store result ---
      results.push({
        success: true,
        fileId: uploadResult.fileId,
        fileName: uniqueFileName,
        gcsUri: uploadResult.gcsUri,
        message: "File uploaded successfully",
      });
    }

    console.log(`[Upload API] ${results.length} file(s) processed`);

    // If only one file uploaded, return simplified result
    if (results.length === 1) {
      return NextResponse.json(results[0]);
    }

    return NextResponse.json({
      success: true,
      files: results,
      message: `${results.filter((r) => r.success).length} of ${results.length} uploaded successfully`,
    });
  } catch (error) {
    const errorId = uuidv4().slice(0, 8);
    console.error("[Upload API] Fatal error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Upload failed",
        details: error.message,
        errorId,
      },
      { status: 500 }
    );
  }
}

/**
 * ==========================================
 *  CORS SUPPORT
 * ==========================================
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
