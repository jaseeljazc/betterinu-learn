import { NextRequest, NextResponse } from "next/server";
import { resolveSession } from "@/lib/admin-rbac";
import { sql } from "@/lib/db";
import { getStudentAttendanceSettings, getStudentLeaveFineSettings } from "@/lib/app-settings";
import { runCatchUp } from "@/lib/attendance-fines";

/**
 * GET /api/admin/student-attendance/calendar
 * Query params:
 *   studentId=uuid   (required)
 *   year=YYYY        (required)
 *   month=M          (required, 1-12)
 *
 * Admin-authenticated day-by-day calendar view for a specific student.
 * Returns { days[], summary }.
 */
export async function GET(req: NextRequest) {
  const session = await resolveSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");
  const yearStr   = searchParams.get("year");
  const monthStr  = searchParams.get("month");

  if (!studentId || !yearStr || !monthStr) {
    return NextResponse.json(
      { error: "studentId, year and month are required" },
      { status: 400 }
    );
  }

  const year  = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid year or month" }, { status: 400 });
  }

  const firstDay   = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDayNum = new Date(year, month, 0).getDate();
  const lastDay    = `${year}-${String(month).padStart(2, "0")}-${lastDayNum}`;

  const DAY_NUM: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  const DAY_NAME = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const todayIST = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const todayStr = `${todayIST.getFullYear()}-${String(todayIST.getMonth() + 1).padStart(2, "0")}-${String(todayIST.getDate()).padStart(2, "0")}`;

  function duration(punchIn: unknown, punchOut: unknown): string | null {
    if (!punchIn || !punchOut) return null;
    const ms = new Date(punchOut as string).getTime() - new Date(punchIn as string).getTime();
    const totalMins = Math.floor(ms / 60_000);
    return `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`;
  }

  try {
    const [attSettings, fineSettings, studentRow] = await Promise.all([
      getStudentAttendanceSettings(),
      getStudentLeaveFineSettings(),
      sql`SELECT started_at::text AS started_at FROM students WHERE id = ${studentId} LIMIT 1`,
    ]);
    const startedAt = studentRow[0]?.started_at ?? null;

    // Run catch-up silently before serving calendar data
    await runCatchUp(studentId, attSettings, fineSettings, startedAt).catch((e) =>
      console.error("runCatchUp failed:", e)
    );

    const rows = await sql`
      SELECT
        sa.id,
        sa.date::text AS date,
        sa.status,
        sa.punch_in,
        sa.punch_out,
        sa.note,
        sa.marked_by,
        sa.holiday_type
      FROM student_attendance sa
      WHERE sa.student_id = ${studentId}
        AND sa.date >= ${firstDay}::date
        AND sa.date <= ${lastDay}::date
      ORDER BY sa.date ASC
    `;

    const leaveReqRows = await sql`
      SELECT date::text AS date, status AS lr_status, reason
      FROM student_leave_requests
      WHERE student_id = ${studentId}
        AND date >= ${firstDay}::date
        AND date <= ${lastDay}::date
    `;

    // Build weekend set (attSettings already fetched above)
    const weekendSet = new Set(
      (attSettings.weekend_days ?? ["sunday"]).map((d) => DAY_NUM[d.toLowerCase()] ?? -1)
    );

    // Build lookup maps
    const rowMap = new Map<string, typeof rows[0]>();
    for (const row of rows) rowMap.set(row.date as string, row);

    const leaveReqMap = new Map<string, { status: string; reason: string | null }>();
    for (const lr of leaveReqRows) {
      leaveReqMap.set(lr.date as string, { 
        status: lr.lr_status as string, 
        reason: lr.reason as string | null 
      });
    }

    // Build day-by-day calendar
    const days: object[] = [];
    let present = 0, absent = 0, leave = 0, holiday = 0;
    let late = 0, halfDay = 0;

    for (let d = 1; d <= lastDayNum; d++) {
      const dateStr   = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayOfWeek = new Date(year, month - 1, d).getDay();
      const isWeekend = weekendSet.has(dayOfWeek);
      const isFuture  = dateStr > todayStr;
      const row       = rowMap.get(dateStr);

      // Admin-marked rows take priority over everything
      if (row && row.marked_by) {
        const s = (row.status as string).toLowerCase();
        if (row.status === "Leave")               leave++;
        else if (row.status === "Holiday")        holiday++;
        else if (row.status === "Absent")         absent++;
        else if (row.status === "Half_Day")       halfDay++;
        else if (row.status === "Late")           late++;
        else                                      present++;

        // Include leave reason separately for leave days
        const leaveReq = leaveReqMap.get(dateStr);

        days.push({
          id:       row.id,
          date:     dateStr,
          status:   s === "half_day" ? "half_day" : s,
          note:     row.note ?? null,
          leaveReason: row.status === "Leave" ? (leaveReq?.reason ?? null) : null,
          punchIn:  row.punch_in ?? null,
          punchOut: row.punch_out ?? null,
          duration: duration(row.punch_in, row.punch_out),
        });
        continue;
      }

      // Future date
      if (isFuture) {
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

      // Weekend with no override → auto-holiday
      if (isWeekend && !row) {
        holiday++;
        days.push({ date: dateStr, status: "holiday", note: DAY_NAME[dayOfWeek] });
        continue;
      }

      // Student self-punched
      if (row && row.punch_in) {
        const isOpen  = row.punch_out === null && dateStr === todayStr;
        const dbStatus = (row.status as string) || "Present";
        const s        = dbStatus.toLowerCase();

        if (dbStatus === "Late")          late++;
        else if (dbStatus === "Half_Day") halfDay++;
        else                              present++;

        days.push({
          id:       row.id,
          date:     dateStr,
          status:   isOpen ? "open" : s === "half_day" ? "half_day" : s,
          punchIn:  row.punch_in,
          punchOut: row.punch_out ?? null,
          duration: duration(row.punch_in, row.punch_out),
          note:     row.note ?? null,
        });
        continue;
      }

      // Past date — absent
      absent++;
      days.push({ date: dateStr, status: "absent" });
    }

    const workDays     = present + late + halfDay + absent + leave;
    const presentScore = present + late + halfDay * 0.5;
    const percentage   = workDays > 0 ? Math.round((presentScore / workDays) * 100) : 0;

    let pendingLeave = 0;
    for (const req of leaveReqMap.values()) {
      if (req.status === "pending") pendingLeave++;
    }

    return NextResponse.json({
      days,
      summary: { present, absent, leave, holiday, late, halfDay, pendingLeave, percentage },
      startedAt,
    });
  } catch (err: any) {
    console.error("GET /api/admin/student-attendance/calendar:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
