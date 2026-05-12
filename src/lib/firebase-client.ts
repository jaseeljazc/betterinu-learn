/**
 * lib/firebase-client.ts — Firebase client SDK.
 * Safe to import in Client Components. Uses NEXT_PUBLIC_ env vars.
 */
import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey:    process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  appId:     process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const clientAuth = getAuth(app);
