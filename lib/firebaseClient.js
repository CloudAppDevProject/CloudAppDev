import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_CLOUD_AUTH_KEY,
  authDomain: process.env.NEXT_PUBLIC_GOOGLE_CLOUD_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_ID,
};

// Defensive initialization: Only initialize Firebase Client if API key is available
let app = null;
let auth = null;

try {
  // Skip initialization if API key is missing or dummy
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_CLOUD_AUTH_KEY;
  
  if (!apiKey || apiKey.includes('dummy') || apiKey.includes('build')) {
    console.warn('[Firebase Client] ⚠️  Firebase API key not available - skipping Client initialization');
  } else {
    // Only initialize if not already initialized
    app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    console.log('[Firebase Client] Firebase Client initialized successfully');
  }
} catch (error) {
  console.error('[Firebase Client] Failed to initialize Firebase Client:', error);
  app = null;
  auth = null;
}

export { auth };
