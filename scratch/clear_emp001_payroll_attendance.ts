import { config } from "dotenv";

config({ path: ".env.local" });

async function run() {
  const { sql } = await import("../src/lib/db");
  const { syncExistingPayrollRunFromAttendance } = await import("../src/lib/payroll-sync");
  const employeeCode = "EMP001";
  const month = "2026-05";

  const employeeRows = await sql`
    SELECT id, full_name
    FROM employees
    WHERE employee_code = ${employeeCode}
    LIMIT 1
  `;

  if (!employeeRows.length) {
    console.log(`Employee ${employeeCode} not found.`);
    return;
  }

  const employee = employeeRows[0];
  console.log(`Found employee: ${employee.full_name} (${employee.id})`);

  const attendance = await sql`
    SELECT date::text as date, status, note
    FROM attendance
    WHERE employee_id = ${employee.id}
      AND date >= ${`${month}-01`}
      AND date <= ${`${month}-31`}
    ORDER BY date ASC
  `;

  console.log("Attendance:", attendance);

  const before = await sql`
    SELECT
      id,
      month,
      status,
      working_days,
      days_present,
      leave_count,
      absent_count,
      half_day_count,
      lop_leaves,
      lop_absences,
      lop_full_days,
      lop_half_days,
      daily_rate,
      lop_deduction,
      gross_salary,
      net_salary
    FROM payroll_runs
    WHERE employee_id = ${employee.id}
      AND month = ${month}
    ORDER BY created_at DESC
  `;

  console.log("Before:", before);

  if (!before.length) {
    console.log(`No payroll run found for ${employeeCode} in ${month}.`);
    return;
  }

  await syncExistingPayrollRunFromAttendance(employee.id, month);

  const after = await sql`
    SELECT
      id,
      month,
      status,
      working_days,
      days_present,
      leave_count,
      absent_count,
      half_day_count,
      lop_leaves,
      lop_absences,
      lop_full_days,
      lop_half_days,
      daily_rate,
      lop_deduction,
      gross_salary,
      net_salary
    FROM payroll_runs
    WHERE employee_id = ${employee.id}
      AND month = ${month}
    ORDER BY created_at DESC
  `;

  console.log("After:", after);
}

run()
  .catch((error) => {
    console.error("Failed to clear payroll attendance:", error);
    process.exitCode = 1;
  });
