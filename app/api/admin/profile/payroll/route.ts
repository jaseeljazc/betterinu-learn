import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-rbac";
import { getLinkedEmployeeId, mapPayrollRun } from "@/lib/admin-profile";
import { sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (auth instanceof NextResponse) return auth;

  const employeeId = await getLinkedEmployeeId(auth.adminId);
  if (!employeeId) {
    return NextResponse.json({ error: "No employee record linked to your account." }, { status: 404 });
  }

  const rows = await sql`
    SELECT
      pr.id, pr.month, pr.working_days, pr.days_present,
      pr.leave_count, pr.absent_count, pr.half_day_count,
      pr.lop_leaves, pr.lop_absences, pr.lop_full_days, pr.lop_half_days,
      pr.daily_rate, pr.lop_deduction, pr.gross_salary, pr.net_salary,
      pr.status, pr.disbursed_at::text as disbursed_at, pr.transaction_id,
      pr.created_at::text as created_at, pr.updated_at::text as updated_at,
      e.id AS employee_id, e.employee_code, e.full_name, e.designation,
      d.id AS dept_id, d.name AS dept_name
    FROM payroll_runs pr
    JOIN employees e ON e.id = pr.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE pr.employee_id = ${employeeId}
      AND pr.status = 'disbursed'
    ORDER BY pr.month DESC
  `;

  return NextResponse.json({ runs: rows.map(mapPayrollRun) });
}
