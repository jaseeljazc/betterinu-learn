import "dotenv/config";
import { sql } from "../src/lib/db";

async function run() {
  try {
    // Find employee ID for EMP001
    const emp = await sql`
      SELECT id, full_name 
      FROM employees 
      WHERE employee_code = 'EMP001'
      LIMIT 1
    `;

    if (!emp.length) {
      console.log("Employee with code EMP001 not found.");
      process.exit(1);
    }

    const empId = emp[0].id;
    const empName = emp[0].full_name;

    console.log(`Found employee: ${empName} (${empId})`);

    // Delete attendance records
    const result = await sql`
      DELETE FROM attendance 
      WHERE employee_id = ${empId}
      RETURNING id
    `;

    console.log(`Successfully deleted attendance records for EMP001. Rows affected: ${result.length}`);

    // Check if there are payroll runs
    const payrollRuns = await sql`
      SELECT id, month, status FROM payroll_runs
      WHERE employee_id = ${empId}
    `;
    console.log(`Associated payroll runs:`, payrollRuns);

  } catch (err) {
    console.error("Error deleting attendance details:", err);
  }
  process.exit(0);
}

run();
