import { NextRequest, NextResponse } from "next/server";
import { verifyStudentToken, extractToken } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getClientIp, checkIpTrusted, notifyAdminsUnknownIp } from "@/lib/attendance";
import { getStudentAttendanceSettings } from "@/lib/app-settings";

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

  const ip = getClientIp(req);

  try {
    // Check if a row already exists for today (IST-aware)
    const existing = await sql`
    SELECT id, punch_in, marked_by FROM student_attendance
    WHERE student_id = ${student.studentId}
      AND date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
    LIMIT 1
  `;

  if (existing.length > 0) {
    if (existing[0].punch_in !== null) {
      return NextResponse.json({ error: "Already punched in today" }, { status: 409 });
    }
    if (existing[0].marked_by !== null) {
      return NextResponse.json({ error: "This day has been manually marked by an admin." }, { status: 403 });
    }
  }

  // Block punch-in on configured weekly off days
  const settings = await getStudentAttendanceSettings();
  const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  
  // Check early punch-in restriction
  const currentMinutes = nowIST.getHours() * 60 + nowIST.getMinutes();
  const [startHour, startMin] = settings.work_start_time.split(":").map(Number);
  const startMinutes = startHour * 60 + startMin;
  const earliestMinutes = startMinutes - (settings.early_punch_in_minutes ?? 60);
  
  if (currentMinutes < earliestMinutes) {
    const earliestHour = Math.floor(earliestMinutes / 60) % 24;
    const earliestMin = earliestMinutes % 60;
    const earliestTime = `${String(earliestHour).padStart(2, "0")}:${String(earliestMin).padStart(2, "0")}`;
    return NextResponse.json(
      { error: `Too early to punch in. You can punch in from ${earliestTime} onwards.` },
      { status: 403 }
    );
  }
  
  const DAY_NUM: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  const DAY_NAME = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const weekendSet = new Set(
    (settings.weekend_days ?? ["sunday"]).map((d) => DAY_NUM[d.toLowerCase()] ?? -1)
  );
  if (weekendSet.has(nowIST.getDay())) {
    return NextResponse.json(
      { error: `Today is ${DAY_NAME[nowIST.getDay()]} — a weekly off day` },
      { status: 400 }
    );
  }

  const isTrusted = await checkIpTrusted(ip);

  // Fetch student name for the notification
  const studentRows = await sql`
    SELECT name FROM students WHERE id = ${student.studentId} LIMIT 1
  `;
  const studentName = studentRows.length > 0 ? (studentRows[0].name as string) : "Unknown Student";

  // Calculate status (Present vs Late) based on attendance settings
  // (settings already fetched above)
  const graceMinutes = settings.grace_period_minutes;

  const status = currentMinutes > (startMinutes + graceMinutes) ? "Late" : "Present";

  // UPSERT: create or update today's row with punch-in data
  // ON CONFLICT: only update if punch_in is still NULL (admin pre-marked day, no punch yet)
  const rows = await sql`
    INSERT INTO student_attendance (student_id, date, status, punch_in, punch_in_ip, is_trusted)
    VALUES (
      ${student.studentId},
      (NOW() AT TIME ZONE 'Asia/Kolkata')::date,
      ${status},
      NOW(),
      ${ip},
      ${isTrusted}
    )
    ON CONFLICT (student_id, date)
    DO UPDATE SET
      punch_in   = NOW(),
      punch_in_ip = ${ip},
      is_trusted  = ${isTrusted},
      status      = ${status},
      updated_at  = NOW()
    WHERE student_attendance.punch_in IS NULL
    RETURNING id
  `;

  if (rows.length === 0) {
    // Conflict hit but punch_in was already set — double punch attempt
    return NextResponse.json({ error: "Already punched in today" }, { status: 409 });
  }

  const attendanceId = rows[0].id as string;

  if (!isTrusted) {
    notifyAdminsUnknownIp({
      studentId: student.studentId,
      studentName,
      ip,
      attendanceId,
    }).catch(console.error);
  }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("POST /api/student/attendance/punch-in error:", error);
    return NextResponse.json(
      { error: "Failed to punch in" },
      { status: 500 }
    );
  }
}
