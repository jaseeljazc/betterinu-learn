import { sql } from "@/lib/db";
import { calculatePayrollFromAttendance, getPayrollMonthRange } from "@/lib/payroll-calculation";

export async function syncExistingPayrollRunFromAttendance(employeeId: string, month: string) {
  const existing = await sql`
    SELECT id, status
    FROM payroll_runs
    WHERE employee_id = ${employeeId}
      AND month = ${month}
    LIMIT 1
  `;

  if (!existing.length || existing[0].status === "disbursed") {
    return;
  }

  const employee = await sql`
    SELECT monthly_salary
    FROM employees
    WHERE id = ${employeeId}
    LIMIT 1
  `;

  if (!employee.length) {
    return;
  }

  const { monthStart, monthEnd } = getPayrollMonthRange(month);
  const attendanceRecords = await sql`
    SELECT date::text as date, status
    FROM attendance
    WHERE employee_id = ${employeeId}
      AND date >= ${monthStart}::date - INTERVAL '7 days'
      AND date <= ${monthEnd}::date + INTERVAL '7 days'
  `;

  const payroll = calculatePayrollFromAttendance(
    month,
    employee[0].monthly_salary,
    attendanceRecords.map((record) => ({ date: String(record.date), status: String(record.status) })),
  );

  await sql`
    UPDATE payroll_runs
    SET
      working_days = ${payroll.workingDays},
      days_present = ${payroll.daysPresent},
      leave_count = ${payroll.leaveCount},
      absent_count = ${payroll.absentCount},
      half_day_count = ${payroll.halfDayCount},
      lop_leaves = ${payroll.lopLeaves},
      lop_absences = ${payroll.lopAbsences},
      lop_full_days = ${payroll.lopFullDays},
      lop_half_days = ${payroll.lopHalfDays},
      daily_rate = ${payroll.dailyRate},
      lop_deduction = ${payroll.lopDeduction},
      gross_salary = ${payroll.grossSalary},
      net_salary = ${payroll.netSalary},
      updated_at = NOW()
    WHERE id = ${existing[0].id}
  `;
}
