import { NextRequest, NextResponse } from "next/server";
import { verifyStudentToken, extractToken } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getStudentAttendanceSettings, getStudentLeaveFineSettings } from "@/lib/app-settings";
import { runCatchUp } from "@/lib/attendance-fines";

/**
 * GET /api/student/fines
 * Returns all fines for the authenticated student.
 */
export async function GET(req: NextRequest) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  if (!token) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const student = await verifyStudentToken(token);
  if (!student) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  // Run catch-up silently before returning fines
  try {
    const [attSettings, fineSettings, studentRow] = await Promise.all([
      getStudentAttendanceSettings(),
      getStudentLeaveFineSettings(),
      sql`SELECT started_at FROM students WHERE id = ${student.studentId} LIMIT 1`,
    ]);
    const startedAt = studentRow[0]?.started_at ?? null;
    await runCatchUp(student.studentId, attSettings, fineSettings, startedAt).catch((e) =>
      console.error("runCatchUp failed:", e)
    );
  } catch (e) {
    console.error("runCatchUp setup failed:", e);
  }

  try {
    const rows = await sql`
      SELECT
        f.id,
        f.fine_type,
        f.period_label,
        f.fine_amount,
        f.status,
        f.waive_reason,
        lr.date::text AS leave_date,
        sa.date::text AS absent_date,
        f.created_at
      FROM student_leave_fines f
      LEFT JOIN student_leave_requests lr ON lr.id = f.leave_request_id
      LEFT JOIN student_attendance sa ON sa.id = f.attendance_id
      WHERE f.student_id = ${student.studentId}
      ORDER BY f.created_at DESC
    `;
    return NextResponse.json({ fines: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
