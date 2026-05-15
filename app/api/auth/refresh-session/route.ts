import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

/**
 * POST /api/auth/refresh-session
 * Body: { idToken: string }
 *
 * Called by the client every ~55 minutes when Firebase auto-rotates the ID token.
 * Verifies the new token and updates the httpOnly __session cookie so
 * server-side middleware and API routes stay authenticated.
 *
 * This is intentionally lightweight — it does NOT re-check the DB (admin/student).
 * That check already happened at login time; here we just keep the session alive.
 */
export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    // Verify the token is still valid with Firebase Admin
    await adminAuth.verifyIdToken(idToken);

    const response = NextResponse.json({ ok: true });
    response.cookies.set("__session", idToken, {
      httpOnly: true,
      sameSite: "lax",
      // 7 days — Firebase refresh tokens keep the session alive automatically.
      // The client calls this endpoint every ~55 min so the cookie never goes stale.
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  } catch {
    // Token invalid / expired — clear the cookie so middleware redirects to login
    const response = NextResponse.json({ error: "Invalid token" }, { status: 401 });
    response.cookies.set("__session", "", { maxAge: 0, path: "/" });
    return response;
  }
}
