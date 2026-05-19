import { config } from "dotenv";

config({ path: ".env.local" });

async function run() {
  const { sql } = await import("../src/lib/db");
  const { syncExistingPayrollRunFromAttendance } = await import("../src/lib/payroll-sync");
  const employeeCode = "EMP001";
  const date = "2026-05-16";
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

  const deleted = await sql`
    DELETE FROM attendance
    WHERE employee_id = ${employee.id}
      AND date = ${date}
      AND status = 'Holiday'
    RETURNING id, date::text as date, status
  `;

  console.log("Deleted attendance rows:", deleted);

  await syncExistingPayrollRunFromAttendance(employee.id, month);

  const payrollRows = await sql`
    SELECT
      id,
      month,
      status,
      working_days,
      days_present,
      leave_count,
      absent_count,
      half_day_count,
      lop_full_days,
      lop_half_days,
      daily_rate,
      lop_deduction,
      gross_salary,
      net_salary
    FROM payroll_runs
    WHERE employee_id = ${employee.id}
      AND month = ${month}
  `;

  console.log("Payroll after sync:", payrollRows);
}

run().catch((error) => {
  console.error("Failed to remove holiday and sync payroll:", error);
  process.exitCode = 1;
});
