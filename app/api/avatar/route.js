import { Storage } from "@google-cloud/storage";
import { NextResponse } from "next/server";
// Wichtig: 'buffer' muss importiert werden, um Base64 zu dekodieren.
import { Buffer } from "buffer";

// 1. Umgebungsvariablen laden und globale Storage-Instanz deklarieren
const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
const base64Key = process.env.GOOGLE_CLOUD_CREDENTIALS_BASE64;
const BUCKET_NAME = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || "pictures-clouddev";

// Die 'storage' Variable muss hier mit 'let' deklariert werden, damit sie von GET zugreifbar ist.
let storage;

// 2. Defensive Initialisierungslogik - nur mit echten Credentials
try {
  // Skip initialization during build or with dummy credentials
  if (!base64Key || base64Key.includes('dummy') || base64Key.includes('build')) {
    console.warn("[GCS API] ⚠️  GCS credentials not available - skipping Storage initialization");
    storage = null;
  } else if (projectId && base64Key) {
    // Base64-Schlüssel dekodieren und den JSON-Inhalt parsen
    const serviceAccountJson = Buffer.from(base64Key, "base64").toString("utf8");
    const credentials = JSON.parse(serviceAccountJson);

    // Storage mit den expliziten Credentials initialisieren
    storage = new Storage({
      projectId: projectId,
      credentials: credentials,
    });
    console.log("[GCS API] Storage initialized successfully with explicit credentials.");
  } else {
    console.warn("[GCS API] Missing credentials, skipping initialization");
    storage = null;
  }
} catch (e) {
  // Fängt Fehler beim Parsen oder Initialisieren (z.B. ungültiger JSON-Key)
  console.error("[GCS API] ERROR: Failed to initialize Storage service.", e);
  storage = null; // Setze auf null, um den 500er im GET-Handler auszulösen.
}

export async function GET(request) {
  if (!storage) {
    return NextResponse.json({ error: "Storage service initialization failed. Check environment variables and logs." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const avatarPath = searchParams.get("path");

  if (!avatarPath) {
    return NextResponse.json({ error: "Missing avatar path" }, { status: 400 });
  }

  try {
    const file = storage.bucket(BUCKET_NAME).file(avatarPath);

    console.log(`[GCS API] Attempting to generate signed URL for: gs://${BUCKET_NAME}/${avatarPath}`);

    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 60 * 60 * 1000, // 1 Stunde
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Error generating signed URL:", error);

    let status = 500;
    let errorMessage = "Failed to generate URL due to server error.";

    if (error.code === 403) {
      errorMessage = "Permission denied (403). Check if the Service Account has 'Storage Object Viewer' role on the bucket/file.";
      status = 403;
    } else if (error.code === 404) {
      errorMessage = "Object not found (404). Check the path and bucket name: " + avatarPath;
      status = 404;
    } else if (error.message) {
      errorMessage = `GCS SDK Error: ${error.message}`;
    }

    return NextResponse.json({ error: errorMessage }, { status: status });
  }
}
