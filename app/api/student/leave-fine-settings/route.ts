import { NextRequest, NextResponse } from "next/server";
import { verifyStudentToken, extractToken } from "@/lib/auth";
import { getStudentLeaveFineSettings } from "@/lib/app-settings";

/**
 * GET /api/student/leave-fine-settings
 * Returns the current fine settings (read-only for students)
 */
export async function GET(req: NextRequest) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  if (!token) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const student = await verifyStudentToken(token);
  if (!student) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const settings = await getStudentLeaveFineSettings();
    return NextResponse.json(settings);
  } catch (err: any) {
    console.error("GET /api/student/leave-fine-settings:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch settings" }, { status: 500 });
  }
}
