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
    console.warn('[Firebase Client] Config:', {
      apiKey: apiKey ? '***' + apiKey.slice(-4) : 'undefined',
      authDomain: process.env.NEXT_PUBLIC_GOOGLE_CLOUD_AUTH_DOMAIN || 'undefined',
      projectId: process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_ID || 'undefined'
    });
  } else {
    // Only initialize if not already initialized
    app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    console.log('[Firebase Client] ✅ Firebase Client initialized successfully');
  }
} catch (error) {
  console.error('[Firebase Client] ❌ Failed to initialize Firebase Client:', error);
  console.error('[Firebase Client] Config was:', {
    apiKey: firebaseConfig.apiKey ? '***' + firebaseConfig.apiKey.slice(-4) : 'undefined',
    authDomain: firebaseConfig.authDomain || 'undefined',
    projectId: firebaseConfig.projectId || 'undefined'
  });
  app = null;
  auth = null;
}

// Safe export - check if auth exists before using it
const safeAuth = auth;

export { safeAuth as auth, app };
