import { NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
const BASE64_KEY = process.env.GOOGLE_CLOUD_CREDENTIALS_BASE64;
const BUCKET_NAME =
  process.env.GOOGLE_CLOUD_STORAGE_BUCKET || "pictures-clouddev";

// Defensive initialization: Only initialize Storage if credentials are available
let storage: Storage | null = null;
let bucket: ReturnType<Storage['bucket']> | null = null;

try {
  if (BASE64_KEY && !BASE64_KEY.includes('dummy') && !BASE64_KEY.includes('build')) {
    // Base64-Schlüssel dekodieren und den JSON-Inhalt parsen
    const serviceAccountJson = Buffer.from(BASE64_KEY, "base64").toString("utf8");
    const credentials = JSON.parse(serviceAccountJson);

    storage = new Storage({
      projectId: PROJECT_ID,
      credentials: credentials,
    });

    bucket = storage.bucket(BUCKET_NAME);
    console.log("[GCS API] Storage initialized successfully");
  } else {
    console.warn("[GCS API] ⚠️  GCS credentials not available - skipping Storage initialization");
  }
} catch (error) {
  console.error("[GCS API] Failed to initialize Storage:", error);
  storage = null;
  bucket = null;
}

export async function GET(request: Request) {
  if (!storage) {
    return NextResponse.json(
      {
        error:
          "Storage service initialization failed. Check environment variables and logs.",
      },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const imagePath = searchParams.get("path");

  if (!imagePath) {
    return NextResponse.json({ error: "Missing image path" }, { status: 400 });
  }

  try {
    const pathParts = imagePath.split("/");

    if (pathParts.length < 4) {
      console.error("Invalid GCS URI format:", imagePath);
      return;
    }

    // Der Pfad, den die API Route erwartet (z.B. user_1/2025-10-23/...)
    const gcsFilePath = pathParts.slice(3).join("/");

    const file = storage.bucket(BUCKET_NAME).file(gcsFilePath);

    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 60 * 60 * 1000, // 1 Stunde
    });

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error("Error generating signed URL:", error);

    let status = 500;
    let errorMessage = "Failed to generate URL due to server error.";

    if (error.code === 403) {
      errorMessage =
        "Permission denied (403). Check if the Service Account has 'Storage Object Viewer' role on the bucket/file.";
      status = 403;
    } else if (error.code === 404) {
      errorMessage =
        "Object not found (404). Check the path and bucket name: " + imagePath;
      status = 404;
    } else if (error.message) {
      errorMessage = `GCS SDK Error: ${error.message}`;
    }

    return NextResponse.json({ error: errorMessage }, { status: status });
  }
}
