/**
 * lib/firebase-admin.ts — Firebase Admin SDK (server-only).
 *
 * NEVER import this file from a Client Component.
 * The service account key must be in FIREBASE_SERVICE_ACCOUNT_KEY (no NEXT_PUBLIC_ prefix).
 */
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!)),
  });
}

export const adminAuth = getAuth();
