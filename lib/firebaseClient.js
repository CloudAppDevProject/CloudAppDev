import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_CLOUD_AUTH_KEY,
  authDomain: process.env.NEXT_PUBLIC_GOOGLE_CLOUD_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
