import { NextRequest, NextResponse } from "next/server";
import { verifyStudentToken, extractToken } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getStudentAttendanceSettings, getStudentLeaveFineSettings } from "@/lib/app-settings";
import { runCatchUp } from "@/lib/attendance-fines";

/**
 * GET /api/student/attendance/history
 * Query params: year=YYYY&month=M (1-12)
 *
 * Returns a day-by-day attendance array for the requested month.
 * Status priority: Sunday → holiday | DB row status (Leave/Holiday) |
 *                  punch_in present → present | past date → absent | future → future
 */
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

  const { searchParams } = req.nextUrl;
  const yearStr  = searchParams.get("year");
  const monthStr = searchParams.get("month");

  if (!yearStr || !monthStr) {
    return NextResponse.json({ error: "year and month are required" }, { status: 400 });
  }

  const year  = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid year or month" }, { status: 400 });
  }

  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDayNum = new Date(year, month, 0).getDate();
  const lastDay  = `${year}-${String(month).padStart(2, "0")}-${lastDayNum}`;

  try {
    // Run catch-up before fetching (silently marks missed absent days)
    const [attSettings, fineSettings, studentRow] = await Promise.all([
      getStudentAttendanceSettings(),
      getStudentLeaveFineSettings(),
      sql`SELECT started_at::text AS started_at FROM students WHERE id = ${student.studentId} LIMIT 1`,
    ]);
    const startedAt = studentRow[0]?.started_at ?? null;
    await runCatchUp(student.studentId, attSettings, fineSettings, startedAt).catch((e) =>
      console.error("runCatchUp failed:", e)
    );

    // Fetch all attendance rows for this student in the month
    const rows = await sql`
    SELECT
      date::text AS date,
      status,
      punch_in,
      punch_out,
      note,
      marked_by,
      holiday_type
    FROM student_attendance
    WHERE student_id = ${student.studentId}
      AND date >= ${firstDay}::date
      AND date <= ${lastDay}::date
    ORDER BY date ASC
  `;

  // Fetch leave requests for the same month
  const leaveReqRows = await sql`
    SELECT date::text AS date, status AS lr_status, reason
    FROM student_leave_requests
    WHERE student_id = ${student.studentId}
      AND date >= ${firstDay}::date
      AND date <= ${lastDay}::date
  `;
  const leaveReqMap = new Map<string, { status: string; reason: string | null }>(); // date → {status, reason}
  for (const lr of leaveReqRows) {
    leaveReqMap.set(lr.date as string, { 
      status: lr.lr_status as string, 
      reason: lr.reason as string | null 
    });
  }

  // Build lookup map: date-string → row
  const rowMap = new Map<string, typeof rows[0]>();
  for (const row of rows) {
    rowMap.set(row.date as string, row);
  }

  // Today in IST (YYYY-MM-DD)
  const todayIST = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const todayStr = `${todayIST.getFullYear()}-${String(todayIST.getMonth() + 1).padStart(2, "0")}-${String(todayIST.getDate()).padStart(2, "0")}`;

  // Helper: duration string from two timestamps
  function duration(punchIn: unknown, punchOut: unknown): string | null {
    if (!punchIn || !punchOut) return null;
    const ms = new Date(punchOut as string).getTime() - new Date(punchIn as string).getTime();
    const totalMins = Math.floor(ms / 60_000);
    const hours = Math.floor(totalMins / 60);
    const mins  = totalMins % 60;
    return `${hours}h ${mins}m`;
  }

  const DAY_NUM: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  const DAY_NAME = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

  // Fetch settings once — needed for weekend_days (already fetched above via runCatchUp)
  const weekendSet = new Set(
    (attSettings.weekend_days ?? ["sunday"]).map((d) => DAY_NUM[d.toLowerCase()] ?? -1)
  );

  const days: object[] = [];
  let present = 0, absent = 0, leave = 0, holiday = 0;
  let late = 0, halfDay = 0;

  for (let d = 1; d <= lastDayNum; d++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayOfWeek = new Date(year, month - 1, d).getDay(); // 0 = Sunday
    const isWeekend = weekendSet.has(dayOfWeek);
    const isFuture  = dateStr > todayStr;
    const row       = rowMap.get(dateStr);

    // Admin has explicitly set a status — always takes full priority over isFuture logic.
    // Must be checked BEFORE isFuture so that admin-marked holidays/leaves on future dates appear correctly.
    if (row && row.marked_by) {
      const statusLower = row.status.toLowerCase();
      if (row.status === "Leave")               leave++;
      else if (row.status === "Holiday")        holiday++;
      else if (row.status === "Absent")         absent++;
      else if (row.status === "Half_Day")       halfDay++;
      else if (row.status === "Late")           late++;
      else present++;

      // Include leave reason separately for leave days
      const leaveReq = leaveReqMap.get(dateStr);
      
      days.push({
        date: dateStr,
        status: statusLower === "half_day" ? "half_day" : statusLower,
        note: row.note ?? null,
        leaveReason: row.status === "Leave" ? (leaveReq?.reason ?? null) : null,
        punchIn: row.punch_in,
        punchOut: row.punch_out ?? null,
        duration: duration(row.punch_in, row.punch_out),
      });
      continue;
    }

    if (isFuture) {
      // Check if admin has already approved leave for this future date
      const leaveReq = leaveReqMap.get(dateStr);
      if (leaveReq?.status === "approved" || (row && row.status === "Leave")) {
        leave++;
        days.push({ date: dateStr, status: "leave", note: "Leave approved", leaveReason: leaveReq?.reason ?? null });
      } else if (leaveReq?.status === "pending") {
        days.push({ date: dateStr, status: "pending_leave", note: null, leaveReason: leaveReq?.reason ?? null });
      } else {
        days.push({ date: dateStr, status: "future" });
      }
      continue;
    }

    // Past date before program start
    if (!row && startedAt && dateStr < startedAt) {
      days.push({ date: dateStr, status: "future" }); // Renders as before_start in UI
      continue;
    }

    if (isWeekend) {
      // Only treat as holiday if NO real DB record exists for this day.
      // If a student punched in on a day that was later added as a weekly off,
      // the real attendance row must take priority — we skip to the normal logic below.
      if (!row) {
        holiday++;
        days.push({ date: dateStr, status: "holiday", note: DAY_NAME[dayOfWeek] });
        continue;
      }
    }

    // Student punched in (self-service)
    if (row && row.punch_in) {
      const isOpen = row.punch_out === null && dateStr === todayStr;
      
      const dbStatus = row.status || "Present";
      const statusLower = dbStatus.toLowerCase();
      
      if (dbStatus === "Late")          late++;
      else if (dbStatus === "Half_Day") halfDay++;
      else present++;

      days.push({
        date:      dateStr,
        status:    isOpen ? "open" : (statusLower === "half_day" ? "half_day" : statusLower),
        punchIn:   row.punch_in,
        punchOut:  row.punch_out ?? null,
        duration:  duration(row.punch_in, row.punch_out),
        note:      row.note ?? null,
      });
      continue;
    }

    // Past date with no record
    absent++;
    days.push({ date: dateStr, status: "absent" });
  }

  // Percentage calculation
  const workDays = present + late + halfDay + absent + leave;
  const presentScore = present + late + (halfDay * 0.5);
  const percentage = workDays > 0 ? Math.round((presentScore / workDays) * 100) : 0;

  // Count pending leave requests for this month
  let pendingLeave = 0;
  for (const req of leaveReqMap.values()) {
    if (req.status === "pending") pendingLeave++;
  }

    return NextResponse.json({
      days,
      summary: { present, absent, leave, holiday, late, halfDay, pendingLeave, percentage },
      startedAt,
    });
  } catch (error: any) {
    console.error("GET /api/student/attendance/history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance history" },
      { status: 500 }
    );
  }
}
