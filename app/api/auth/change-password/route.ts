import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

/**
 * POST /api/auth/change-password
 * Body: { currentPassword: string, newPassword: string }
 *
 * Works for both admins (__rbac cookie + __session) and students (__session).
 * Re-authenticates via Firebase REST API with currentPassword, then uses
 * Admin SDK to set the new password.
 */
export async function POST(req: NextRequest) {
  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  // Resolve who is calling — try admin first, then student
  const token = req.cookies.get("__session")?.value ?? "";
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let uid: string;
  let email: string;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email ?? "";
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Re-authenticate with the current password via Firebase REST API
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;
  const reAuthRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: currentPassword, returnSecureToken: false }),
    }
  );

  if (!reAuthRes.ok) {
    const body = await reAuthRes.json().catch(() => ({}));
    const code = body?.error?.message ?? "";
    if (code.includes("INVALID_PASSWORD") || code.includes("INVALID_LOGIN_CREDENTIALS")) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }
    return NextResponse.json({ error: "Re-authentication failed. Please try again." }, { status: 400 });
  }

  // Update password via Admin SDK
  await adminAuth.updateUser(uid, { password: newPassword });

  return NextResponse.json({ ok: true, message: "Password updated successfully." });
}
