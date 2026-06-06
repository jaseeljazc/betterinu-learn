import { sql } from "@/lib/db";
import type { StudentLeaveFineSettings, StudentAttendanceSettings } from "@/lib/app-settings";

export async function processAbsentDay(
  studentId: string,
  attendanceId: string,
  date: string, // "YYYY-MM-DD"
  fineSettings: StudentLeaveFineSettings,
  attSettings: StudentAttendanceSettings
) {
  if (!fineSettings.absent_fine_enabled) return;

  if (fineSettings.absent_fine_rule === "use_balance") {
    const [year, month] = date.split("-");
    const periodLabel = fineSettings.fine_period === "monthly" ? `${year}-${month}` : year;

    const usedResult = await sql`
      SELECT COUNT(*) AS count FROM student_leave_requests
      WHERE student_id = ${studentId}
        AND status = 'approved'
        AND TO_CHAR(date, 'YYYY-MM') = ${periodLabel}
    `;
    const used = Number(usedResult[0].count);

    if (used < fineSettings.free_leaves_per_period) {
      // Consume a leave balance day — no fine
      await sql`
        INSERT INTO student_leave_requests (student_id, date, reason, status, admin_note)
        VALUES (
          ${studentId}, ${date}::date,
          'Auto-deducted for unexcused absence',
          'approved',
          'System generated — leave balance used to cover absence'
        )
        ON CONFLICT (student_id, date) DO NOTHING
      `;
      await sql`
        UPDATE student_attendance SET status = 'Leave' WHERE id = ${attendanceId}
      `;
      return;
    }
  }

  // direct_fine OR balance exhausted → insert fine
  await sql`
    INSERT INTO student_leave_fines
      (student_id, attendance_id, fine_type, period_label, fine_amount, status)
    VALUES
      (${studentId}, ${attendanceId}, 'absent', ${date}, ${fineSettings.absent_fine_amount}, 'pending')
    ON CONFLICT (attendance_id) WHERE fine_type = 'absent' DO NOTHING
  `;
}

export async function runCatchUp(
  studentId: string,
  attSettings: StudentAttendanceSettings,
  fineSettings: StudentLeaveFineSettings,
  startedAt?: string | null
) {
  // Check master switch — if disabled, skip all catch-up logic
  if (!attSettings.auto_absent_if_no_punchin) return;

  const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const yesterday = new Date(nowIST);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastRow = await sql`
    SELECT date FROM student_attendance
    WHERE student_id = ${studentId}
    ORDER BY date DESC LIMIT 1
  `;

  let startDate: Date;

  if (lastRow.length > 0) {
    // Normal case: continue from the day AFTER the last recorded row
    startDate = new Date(lastRow[0].date as string);
    startDate.setDate(startDate.getDate() + 1);
  } else if (startedAt) {
    // New student with no attendance yet: start from their programme start date
    startDate = new Date(startedAt);
  } else {
    // Fallback: don't go back further than 30 days to avoid filling months of absences
    const fallback = new Date(nowIST);
    fallback.setDate(fallback.getDate() - 30);
    startDate = fallback;
  }

  const DAY_NUM: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  const weekendSet = new Set(
    (attSettings.weekend_days ?? ["sunday"]).map((d: string) => DAY_NUM[d.toLowerCase()] ?? -1)
  );

  for (let d = new Date(startDate); d <= yesterday; d.setDate(d.getDate() + 1)) {
    if (weekendSet.has(d.getDay())) continue;

    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    // Skip if date is before started_at
    if (startedAt && dateStr < startedAt) continue;

    // Skip if approved leave already exists
    const leaveCheck = await sql`
      SELECT id FROM student_leave_requests
      WHERE student_id = ${studentId}
        AND date = ${dateStr}::date
        AND status = 'approved'
      LIMIT 1
    `;
    if (leaveCheck.length > 0) continue;

    const result = await sql`
      INSERT INTO student_attendance (student_id, date, status, note, updated_at)
      VALUES (${studentId}, ${dateStr}::date, 'Absent', 'Auto-marked: no punch-in recorded', NOW())
      ON CONFLICT (student_id, date) DO NOTHING
      RETURNING id
    `;

    if (result.length > 0) {
      await processAbsentDay(studentId, result[0].id, dateStr, fineSettings, attSettings);
    }
  }
}
