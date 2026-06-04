import { NextRequest, NextResponse } from "next/server";
import { verifyStudentToken, extractToken } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getClientIp } from "@/lib/attendance";
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
  const durationHours = (now.getTime() - punchInTime.getTime()) / (1000 * 60 * 60);

  const nowIST = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const checkoutMinutes = nowIST.getHours() * 60 + nowIST.getMinutes();

  const [endHour, endMin] = settings.work_end_time.split(":").map(Number);
  const endMinutes = endHour * 60 + endMin;

  // ── Classify status based on duration + checkout time ──────────────────
  // Tier 1: too few hours to even count as Half Day → Absent
  // Tier 2: not enough hours for Full Day           → Half_Day
  // Tier 3: left before the work end time           → Early_Checkout
  // Tier 4: everything else                          → keep punch-in status (Present / Late)
  const minHalfDayHours = settings.min_hours_for_half_day ?? 2;
  const fullDayHours    = settings.half_day_min_hours;

  let status = openRow[0].status as string;

  // Only automatically classify if an admin hasn't manually overridden the day
  if (openRow[0].marked_by === null) {
    if (durationHours < minHalfDayHours) {
      status = "Absent";
    } else if (durationHours < fullDayHours) {
      status = "Half_Day";
    } else if (checkoutMinutes < endMinutes) {
      // NOTE: Here we could preserve a "Late" status, but currently it's overwritten by Early_Checkout
      status = "Early_Checkout";
    }
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

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("POST /api/student/attendance/punch-out error:", error);
    return NextResponse.json(
      { error: "Failed to punch out" },
      { status: 500 }
    );
  }
}
