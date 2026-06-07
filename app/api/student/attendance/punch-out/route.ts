import { NextRequest, NextResponse } from "next/server";
import { verifyStudentToken, extractToken } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getClientIp, checkIpTrusted, notifyAdminsUnknownIp } from "@/lib/attendance";
import { getStudentAttendanceSettings, DEFAULT_STUDENT_ATTENDANCE_SETTINGS } from "@/lib/app-settings";

export async function POST(req: NextRequest) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    "";
  if (!token) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const student = await verifyStudentToken(token);
  if (!student) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    // Find today's row with an open punch (IST-aware)
    const openRow = await sql`
    SELECT id, punch_in, status, marked_by FROM student_attendance
    WHERE student_id = ${student.studentId}
      AND date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
      AND punch_in IS NOT NULL
      AND punch_out IS NULL
    LIMIT 1
  `;

  if (openRow.length === 0) {
    return NextResponse.json({ error: "You haven't punched in today" }, { status: 400 });
  }

  const ip = getClientIp(req);
  const settings = await getStudentAttendanceSettings();

  const punchInTime = new Date(openRow[0].punch_in as string);
  const now = new Date();
  const nowIST = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const checkoutMinutes = nowIST.getHours() * 60 + nowIST.getMinutes();
  const [endHour, endMin] = settings.work_end_time.split(":").map(Number);
  const endMinutes = endHour * 60 + endMin;

  let status = openRow[0].status as string;

  // Only automatically classify if an admin hasn't manually overridden the day
  if (openRow[0].marked_by === null) {
    const durationMinutes = (now.getTime() - punchInTime.getTime()) / (1000 * 60);
    const halfDayThreshold = settings.half_day_threshold_minutes ?? DEFAULT_STUDENT_ATTENDANCE_SETTINGS.half_day_threshold_minutes;
    const halfDayMin = settings.half_day_min_minutes ?? DEFAULT_STUDENT_ATTENDANCE_SETTINGS.half_day_min_minutes;

    if (durationMinutes < halfDayThreshold) {
      // Too short to count as work
      status = "Absent";
    } else if (checkoutMinutes < endMinutes) {
      // Present long enough to count, but left before end time
      status = "Half_Day";
    } else if (durationMinutes < halfDayMin) {
      // Left at/after end time but didn't work full day threshold
      status = "Half_Day";
    }
    // else: worked full duration and left at/after end time → keep Present / Late
  }

  await sql`
    UPDATE student_attendance
    SET
      punch_out    = NOW(),
      punch_out_ip = ${ip},
      status       = ${status},
      updated_at   = NOW()
    WHERE id = ${openRow[0].id as string}
  `;

  // Check if punch-out IP is trusted — reuse same logic as punch-in
  const isPunchOutTrusted = await checkIpTrusted(ip);
  if (!isPunchOutTrusted) {
    const studentRows = await sql`
      SELECT name FROM students WHERE id = ${student.studentId} LIMIT 1
    `;
    const studentName = studentRows.length > 0
      ? (studentRows[0].name as string)
      : "Unknown Student";
    notifyAdminsUnknownIp({
      studentId: student.studentId,
      studentName,
      ip,
      attendanceId: openRow[0].id as string,
    }).catch(console.error);
  }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("POST /api/student/attendance/punch-out error:", error);
    return NextResponse.json(
      { error: "Failed to punch out" },
      { status: 500 }
    );
  }
}
