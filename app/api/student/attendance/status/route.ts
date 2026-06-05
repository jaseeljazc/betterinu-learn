import { NextRequest, NextResponse } from "next/server";
import { verifyStudentToken, extractToken } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getStudentAttendanceSettings } from "@/lib/app-settings";

export async function GET(req: NextRequest) {
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
    // Single query for today's row — IST-aware
    const rows = await sql`
    SELECT id, status, punch_in, punch_out, marked_by
    FROM student_attendance
    WHERE student_id = ${student.studentId}
      AND date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
    LIMIT 1
  `;

  const row = rows.length > 0 ? rows[0] : null;

  // punchedIn = has an open punch (in but not out yet)
  const punchedIn = row !== null && row.punch_in !== null && row.punch_out === null;
  // hasMarkedAttendance = punched in at some point today (may already have punched out)
  const hasMarkedAttendance = row !== null && row.punch_in !== null;

  // Compute overtime: student still punched in AND current IST time is past work_end_time
  const settings = await getStudentAttendanceSettings();
  let isOvertime = false;
  let overtimeMessage: string | null = null;

  // Use ?? fallbacks — existing DB rows may not have the new fields yet
  const overtimeEnabled = settings.overtime_message_enabled ?? true;
  const overtimeText = settings.overtime_message_text
    ?? "You've been working past your scheduled hours. Great dedication — don't forget to rest!";

  if (punchedIn && overtimeEnabled) {
    const nowIST = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );
    const [endHour, endMin] = settings.work_end_time.split(":").map(Number);
    const endMinutes = endHour * 60 + endMin;
    const currentMinutes = nowIST.getHours() * 60 + nowIST.getMinutes();

    if (currentMinutes > endMinutes) {
      isOvertime = true;
      overtimeMessage = overtimeText;
    }
  }

  // Calculate if the day is blocked from punch actions
  const DAY_NUM: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  const DAY_NAME = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const weekendSet = new Set(
    (settings.weekend_days ?? ["sunday"]).map((d) => DAY_NUM[d.toLowerCase()] ?? -1)
  );
  
  const isWeeklyOff = weekendSet.has(nowIST.getDay());
  const isAdminMarked = row !== null && row.marked_by !== null;
  
  let isBlocked = false;
  let blockedReason = null;
  
  if (isAdminMarked) {
    isBlocked = true;
    blockedReason = `Attendance for today has been manually marked by an admin as ${row.status.replace(/_/g, " ")}.`;
  } else if (isWeeklyOff) {
    isBlocked = true;
    blockedReason = `Today is ${DAY_NAME[nowIST.getDay()]} — a weekly off day.`;
  }

  return NextResponse.json({
    punchedIn,
    hasMarkedAttendance,
    punchInTime: row?.punch_in ?? null,
    punchOutTime: row?.punch_out ?? null,
    isOvertime,
    overtimeMessage,
    isBlocked,
    blockedReason,
  });
  } catch (error: any) {
    console.error("GET /api/student/attendance/status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance status" },
      { status: 500 }
    );
  }
}
