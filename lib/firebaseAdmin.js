import * as admin from "firebase-admin";

// Die Umgebungsvariable MUSS den gesamten Service Account JSON als Base64-String enthalten.
const jsonBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;
let serviceAccount = null;

// Skip initialization during build or with dummy/missing credentials
if (!jsonBase64 || jsonBase64.includes('dummy') || jsonBase64.includes('build')) {
  console.warn("[Firebase Admin] ⚠️  Firebase credentials not available - skipping Admin SDK initialization");
} else if (jsonBase64) {
  try {
    // 1. Decode the Base64 string back into a JSON string
    // .trim() entfernt alle Leerzeichen am Anfang oder Ende des Strings
    const jsonString = Buffer.from(jsonBase64.trim(), "base64").toString("utf8");

    // 2. Parse the JSON string into the serviceAccount object
    serviceAccount = JSON.parse(jsonString);

    console.log("[Firebase Admin] Service Account JSON erfolgreich per Base64 dekodiert und geparst.");
  } catch (e) {
    // Zeigt Fehler beim Dekodieren oder Parsen an
    console.error("[Firebase Admin] ERROR: Konnte Service Account JSON nicht dekodieren oder parsen. Bitte Base64-String und Formatierung in der .env-Variable prüfen.", e);
  }
}

// 3. Initialisierung nur, wenn das Service Account Objekt vorhanden und gültig ist
if (!admin.apps.length && serviceAccount && serviceAccount.project_id) {
  console.log(`Firebase Admin SDK wird für Projekt "${serviceAccount.project_id}" initialisiert...`);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export async function verifyIdToken(token) {
  // Stellen Sie sicher, dass die App initialisiert wurde, bevor Sie auth aufrufen
  if (!admin.apps.length) {
    console.error("ADMIN SDK ERROR: Admin SDK wurde nicht initialisiert, kann Token nicht prüfen.");
    return null;
  }

  try {
    return await admin.auth().verifyIdToken(token);
  } catch (err) {
    // Fehler wird hier abgefangen und verständlicher geloggt
    console.error("Token verification failed (Auth Error):", err.code || err.message);
    return null;
  }
}
