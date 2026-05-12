import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";

/**
 * POST /api/admin/auth/verify
 * Body: { idToken: string }
 *
 * Verifies Firebase ID token AND checks admins table.
 * Sets httpOnly __session cookie on success.
 */
export async function POST(req: NextRequest) {
  const { idToken } = await req.json();
  if (!idToken) return NextResponse.json({ error: "Missing idToken" }, { status: 400 });

  const result = await verifyAdminToken(idToken);
  if (!result) {
    return NextResponse.json(
      { error: "Access denied. This account is not an admin." },
      { status: 403 },
    );
  }

  const response = NextResponse.json({ ok: true, adminId: result.adminId });
  response.cookies.set("__session", idToken, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60,
    path: "/",
  });
  return response;
}
