"use client";

import { useEffect } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { clientAuth } from "@/lib/firebase-client";

/**
 * StudentTokenRefresher
 *
 * Invisible component that keeps the __session cookie alive for the student portal.
 * Firebase rotates ID tokens every ~55 minutes. This component listens for that
 * rotation and calls /api/auth/refresh-session to update the httpOnly cookie,
 * preventing silent 401 logouts in the student app.
 *
 * Mount this once inside the student layout (server component is fine — this
 * is a client-only boundary).
 */
export function StudentTokenRefresher() {
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(clientAuth, async (user) => {
      if (user) {
        try {
          const freshToken = await user.getIdToken();
          await fetch("/api/auth/refresh-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: freshToken }),
          });
        } catch {
          // Network error — non-fatal, Firebase will retry on the next rotation
        }
      } else {
        // User signed out — clear the cookie
        document.cookie = "__session=; path=/; max-age=0; SameSite=Lax";
      }
    });

    return () => unsubscribe();
  }, []);

  return null;
}
