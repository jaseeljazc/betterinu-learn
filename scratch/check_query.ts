import "dotenv/config";
import { sql } from "../src/lib/db";

async function check() {
  const month = "2026-05"; // or whatever
  try {
    const rows = await sql`
      SELECT
        pr.id, pr.month, pr.working_days, pr.days_present, pr.total_absences,
        pr.lop_days, pr.daily_rate, pr.lop_deduction, pr.gross_salary, pr.net_salary,
        pr.status, pr.disbursed_at::text as disbursed_at, pr.transaction_id, pr.created_at::text as created_at, pr.updated_at::text as updated_at,
        e.id AS employee_id, e.employee_code, e.full_name, e.designation,
        d.id AS dept_id, d.name AS dept_name
      FROM payroll_runs pr
      JOIN employees e ON e.id = pr.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE pr.month = ${month}
    `;
    console.log("Found rows:", rows.length);
  } catch (err) {
    console.error("Query failed:", err);
  }
  process.exit(0);
}

check();
