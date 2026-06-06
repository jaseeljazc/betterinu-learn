import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/admin-rbac";
import { getStudentAttendanceSettings, upsertSettings } from "@/lib/app-settings";

/**
 * GET /api/admin/student-attendance/settings
 * Returns the current student attendance settings JSON blob.
 */
export async function GET(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const value = await getStudentAttendanceSettings();
  return NextResponse.json({ value });
}

/**
 * PUT /api/admin/student-attendance/settings
 * Updates the student attendance settings. Requires super_admin or developer role.
 */
export async function PUT(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const isSuperOrDev =
    session.roles.includes("super_admin") || session.roles.includes("developer");
  if (!isSuperOrDev) {
    return NextResponse.json(
      { error: "Forbidden: Super admin or Developer privilege required" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { value } = body;

  if (!value || typeof value !== "object") {
    return NextResponse.json({ error: "value is required and must be an object" }, { status: 400 });
  }

  // Prevent negative values for any duration settings
  if (
    (typeof value.grace_period_minutes === "number" && value.grace_period_minutes < 0) ||
    (typeof value.half_day_min_minutes === "number" && value.half_day_min_minutes < 0) ||
    (typeof value.half_day_threshold_minutes === "number" && value.half_day_threshold_minutes < 0) ||
    (typeof value.early_punch_in_minutes === "number" && value.early_punch_in_minutes < 0)
  ) {
    return NextResponse.json({ error: "Duration values cannot be negative" }, { status: 400 });
  }

  try {
    await upsertSettings(
      "student_attendance",
      "student_attendance",
      value,
      session.adminId,
      "Controls how student punch-in times are classified into Present / Late / Half Day / Early Checkout"
    );
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("PUT /api/admin/student-attendance/settings:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
