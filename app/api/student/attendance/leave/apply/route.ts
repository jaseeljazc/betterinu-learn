import { NextRequest, NextResponse } from "next/server";
import { verifyStudentToken, extractToken } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getStudentAttendanceSettings } from "@/lib/app-settings";

/**
 * POST /api/student/attendance/leave/apply
 * Body: { date: "YYYY-MM-DD", reason: string }
 */
export async function POST(req: NextRequest) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  if (!token) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const student = await verifyStudentToken(token);
  if (!student) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = await req.json();
  const { date, reason } = body as { date?: string; reason?: string };

  if (!date || !reason?.trim()) {
    return NextResponse.json({ error: "date and reason are required" }, { status: 400 });
  }

  // Reject configured weekly off days
  const settings = await getStudentAttendanceSettings();
  const DAY_NUM: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  const DAY_NAME = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const weekendSet = new Set(
    (settings.weekend_days ?? ["sunday"]).map((d) => DAY_NUM[d.toLowerCase()] ?? -1)
  );
  const d = new Date(date);
  if (weekendSet.has(d.getDay())) {
    return NextResponse.json(
      { error: `Cannot apply for leave on ${DAY_NAME[d.getDay()]} (weekly off day)` },
      { status: 400 }
    );
  }

  // Reject if punch-in already exists for that day
  const punchRows = await sql`
    SELECT id FROM student_attendance
    WHERE student_id = ${student.studentId}
      AND date = ${date}::date
      AND punch_in IS NOT NULL
    LIMIT 1
  `;
  if (punchRows.length > 0) {
    return NextResponse.json({ error: "You already punched in on this date — leave cannot be applied" }, { status: 409 });
  }

  // Insert (UNIQUE constraint on student_id + date handles duplicates)
  try {
    const rows = await sql`
      INSERT INTO student_leave_requests (student_id, date, reason)
      VALUES (${student.studentId}, ${date}::date, ${reason.trim()})
      ON CONFLICT (student_id, date) DO UPDATE
        SET reason = EXCLUDED.reason,
            status = 'pending',
            updated_at = NOW()
      RETURNING id, status
    `;
    return NextResponse.json({ ok: true, id: rows[0].id, status: rows[0].status });
  } catch (err: any) {
    console.error("POST /api/student/attendance/leave/apply:", err);
    return NextResponse.json({ error: err.message || "Failed to submit leave request" }, { status: 500 });
  }
}
