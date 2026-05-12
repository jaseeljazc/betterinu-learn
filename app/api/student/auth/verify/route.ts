import { NextRequest, NextResponse } from "next/server";
import { verifyStudentToken } from "@/lib/auth";

/**
 * POST /api/student/auth/verify
 * Body: { idToken: string }
 *
 * Verifies the Firebase ID token AND checks that the uid exists in the
 * students table. Called immediately after Firebase client-side sign-in.
 * On success sets the __session cookie (httpOnly).
 */
export async function POST(req: NextRequest) {
  const { idToken } = await req.json();

  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  const result = await verifyStudentToken(idToken);

  if (!result) {
    return NextResponse.json(
      { error: "Not authorised. This account is not registered as a student." },
      { status: 403 },
    );
  }

  // Set httpOnly session cookie (1 hour — Firebase ID tokens expire in 1h)
  const response = NextResponse.json({ ok: true, studentId: result.studentId });
  response.cookies.set("__session", idToken, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60,
    path: "/",
  });
  return response;
}
