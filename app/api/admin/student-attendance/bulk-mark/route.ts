import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/admin-rbac";
import { sql } from "@/lib/db";
import { getStudentAttendanceSettings, getStudentLeaveFineSettings } from "@/lib/app-settings";
import { processAbsentDay } from "@/lib/attendance-fines";

const VALID_STATUSES = ["Present", "Late", "Half_Day", "Absent", "Leave", "Holiday", "CLEAR"] as const;

export async function POST(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const body = await req.json();
  const { studentIds, date, status, holiday_type } = body as {
    studentIds?: string[];
    date?: string;
    status?: string;
    holiday_type?: string;
  };

  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0 || !date || !status) {
    return NextResponse.json(
      { error: "studentIds array, date, and status are required" },
      { status: 400 }
    );
  }

  if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    if (status === "CLEAR") {
      const results = await Promise.allSettled(studentIds.map(async (studentId) => {
        await sql`
          DELETE FROM student_attendance
          WHERE student_id = ${studentId}
            AND date = ${date}::date
            AND marked_by IS NOT NULL
        `;
      }));
      const failed = results.filter(r => r.status === "rejected").length;
      return NextResponse.json({ ok: true, failed });
    }

    // Block marking on configured weekly off days
    const [yr, mo, dy] = date.split("-").map(Number);
    const markSettings = await getStudentAttendanceSettings();
    const DAY_NUM: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };
    const DAY_NAME = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekendSet = new Set(
      (markSettings.weekend_days ?? ["sunday"]).map((d) => DAY_NUM[d.toLowerCase()] ?? -1)
    );
    const dayOfWeek = new Date(yr, mo - 1, dy).getDay();
    if (weekendSet.has(dayOfWeek)) {
      return NextResponse.json(
        { error: `Cannot manually mark ${DAY_NAME[dayOfWeek]}s — they are configured as weekly off days` },
        { status: 400 }
      );
    }

    const resolvedHolidayType: string | null =
      status === "Holiday"
        ? (holiday_type === "optional" ? "optional" : "required")
        : null;

    const fineSettings = await getStudentLeaveFineSettings();

    // Process each student
    const results = await Promise.allSettled(studentIds.map(async (studentId) => {
      const rows = await sql`
        INSERT INTO student_attendance (student_id, date, status, note, marked_by, holiday_type)
        VALUES (${studentId}, ${date}::date, ${status}, null, ${session.adminId}, ${resolvedHolidayType})
        ON CONFLICT (student_id, date)
        DO UPDATE SET
          status       = EXCLUDED.status,
          note         = EXCLUDED.note,
          marked_by    = EXCLUDED.marked_by,
          holiday_type = EXCLUDED.holiday_type,
          updated_at   = NOW()
        RETURNING id
      `;

      const attendanceId = rows[0].id as string;

      if (status === "Absent") {
        await processAbsentDay(studentId, attendanceId, date, fineSettings, markSettings);
      } else {
        await sql`
          UPDATE student_leave_fines
          SET status = 'waived', waive_reason = 'Attendance status changed by admin (bulk)', updated_at = NOW()
          WHERE attendance_id = ${attendanceId}
            AND fine_type = 'absent'
            AND status = 'pending'
        `;
      }
    }));

    const failed = results.filter(r => r.status === "rejected").length;
    
    return NextResponse.json({ 
      ok: true, 
      count: studentIds.length,
      failed 
    });
  } catch (err: any) {
    console.error("POST /api/admin/student-attendance/bulk-mark:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
