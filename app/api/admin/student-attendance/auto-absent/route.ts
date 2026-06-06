import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/admin-rbac";
import { sql } from "@/lib/db";
import { getStudentAttendanceSettings } from "@/lib/app-settings";

/**
 * POST /api/admin/student-attendance/auto-absent
 * Marks all active students as Absent for a given date if they have no attendance row
 * and auto_absent_if_no_punchin is enabled.
 * Body: { date: "YYYY-MM-DD" }  (defaults to yesterday IST if omitted)
 */
export async function POST(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  try {
    const settings = await getStudentAttendanceSettings();
    if (!settings.auto_absent_if_no_punchin) {
      return NextResponse.json({ ok: true, skipped: true, reason: "auto_absent_if_no_punchin is disabled" });
    }

    const body = await req.json().catch(() => ({}));

    // Default to yesterday IST
    const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    nowIST.setDate(nowIST.getDate() - 1);
    const defaultDate = `${nowIST.getFullYear()}-${String(nowIST.getMonth() + 1).padStart(2, "0")}-${String(nowIST.getDate()).padStart(2, "0")}`;
    const date: string = body.date ?? defaultDate;

    // Skip weekends
    const [yr, mo, dy] = date.split("-").map(Number);
    const DAY_NUM: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };
    const weekendSet = new Set(
      (settings.weekend_days ?? ["sunday"]).map((d) => DAY_NUM[d.toLowerCase()] ?? -1)
    );
    if (weekendSet.has(new Date(yr, mo - 1, dy).getDay())) {
      return NextResponse.json({ ok: true, skipped: true, reason: "Date is a configured weekend day" });
    }

    // Insert Absent for all active students who have no attendance row for that date
    const result = await sql`
      INSERT INTO student_attendance (student_id, date, status, note, marked_by, updated_at)
      SELECT s.id, ${date}::date, 'Absent', 'Auto-marked: no punch-in recorded', ${session.adminId}, NOW()
      FROM students s
      WHERE s.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM student_attendance sa
          WHERE sa.student_id = s.id
            AND sa.date = ${date}::date
        )
      ON CONFLICT (student_id, date) DO NOTHING
      RETURNING id
    `;

    return NextResponse.json({ ok: true, marked: result.length, date });
  } catch (err: any) {
    console.error("POST /api/admin/student-attendance/auto-absent:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
