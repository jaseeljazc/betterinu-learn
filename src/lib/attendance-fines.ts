import { sql } from "@/lib/db";
import type { StudentLeaveFineSettings, StudentAttendanceSettings } from "@/lib/app-settings";

/**
 * Called when an admin directly marks a student's attendance as "Leave"
 * (without going through the leave-request approval flow).
 * Checks fine settings and generates a pending fine if the student has
 * exceeded their free leave quota for the period.
 */
export async function processLeaveDay(
  studentId: string,
  attendanceId: string,
  date: string, // "YYYY-MM-DD"
  fineSettings: StudentLeaveFineSettings
) {
  // Master switch — skip if leave fines are disabled
  if (!fineSettings.enabled) return;

  const [year, month] = date.split("-");
  const periodLabel =
    fineSettings.fine_period === "monthly" ? `${year}-${month}` : year;

  // Count approved leave-request leaves for this student in this period
  const countResult =
    fineSettings.fine_period === "monthly"
      ? await sql`
          SELECT COUNT(*) AS count FROM student_leave_requests
          WHERE student_id = ${studentId}
            AND status = 'approved'
            AND TO_CHAR(date, 'YYYY-MM') = ${periodLabel}
        `
      : await sql`
          SELECT COUNT(*) AS count FROM student_leave_requests
          WHERE student_id = ${studentId}
            AND status = 'approved'
            AND TO_CHAR(date, 'YYYY') = ${periodLabel}
        `;

  const count = Number(countResult[0].count);

  // Count admin-direct Leave marks in this period, EXCLUDING the current row
  // (the INSERT already saved this row, so we subtract it to avoid off-by-one)
  const directLeaveResult =
    fineSettings.fine_period === "monthly"
      ? await sql`
          SELECT COUNT(*) AS count FROM student_attendance
          WHERE student_id = ${studentId}
            AND status = 'Leave'
            AND id != ${attendanceId}
            AND TO_CHAR(date, 'YYYY-MM') = ${periodLabel}
        `
      : await sql`
          SELECT COUNT(*) AS count FROM student_attendance
          WHERE student_id = ${studentId}
            AND status = 'Leave'
            AND id != ${attendanceId}
            AND TO_CHAR(date, 'YYYY') = ${periodLabel}
        `;

  // Total = prior approved leaves + prior direct Leave marks + this new Leave (counts as 1)
  const directLeaveCount = Number(directLeaveResult[0].count);
  const totalLeaves = count + directLeaveCount + 1;

  if (totalLeaves > fineSettings.free_leaves_per_period) {
    // Fine triggered — insert a pending fine linked to the attendance row
    // Store the actual DATE in period_label for display (not the period)
    await sql`
      INSERT INTO student_leave_fines
        (student_id, attendance_id, fine_type, period_label, fine_amount, status)
      VALUES
        (${studentId}, ${attendanceId}, 'leave', ${date}, ${fineSettings.fine_amount}, 'pending')
      ON CONFLICT (attendance_id) DO NOTHING
    `;
  }
}

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
    // Correctly use the period format (monthly OR yearly) for the quota check
    const periodLabel = fineSettings.fine_period === "monthly" ? `${year}-${month}` : year;
    const periodFormat = fineSettings.fine_period === "monthly" ? "YYYY-MM" : "YYYY";

    const usedResult = await sql`
      SELECT COUNT(*) AS count FROM student_leave_requests
      WHERE student_id = ${studentId}
        AND status = 'approved'
        AND TO_CHAR(date, ${periodFormat}) = ${periodLabel}
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

    // Skip if this day is marked as a Holiday (required or optional — both are exempt)
    const holidayCheck = await sql`
      SELECT id FROM student_attendance
      WHERE student_id = ${studentId}
        AND date = ${dateStr}::date
        AND status = 'Holiday'
      LIMIT 1
    `;
    if (holidayCheck.length > 0) continue;

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
