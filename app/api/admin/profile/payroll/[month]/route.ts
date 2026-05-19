import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-rbac";
import { buildPayslipData, getLinkedEmployeeId } from "@/lib/admin-profile";
import { sql } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ month: string }> },
) {
  const auth = await requireAdminSession(req);
  if (auth instanceof NextResponse) return auth;

  const employeeId = await getLinkedEmployeeId(auth.adminId);
  if (!employeeId) {
    return NextResponse.json({ error: "No employee record linked to your account." }, { status: 404 });
  }

  const { month } = await params;
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Invalid month. Expected YYYY-MM." }, { status: 400 });
  }

  const rows = await sql`
    SELECT
      pr.id, pr.month, pr.working_days, pr.days_present,
      pr.leave_count, pr.absent_count, pr.half_day_count,
      pr.lop_leaves, pr.lop_absences, pr.lop_full_days, pr.lop_half_days,
      pr.daily_rate, pr.lop_deduction, pr.gross_salary, pr.net_salary,
      pr.status, pr.disbursed_at::text as disbursed_at,
      e.full_name, e.employee_code, e.designation, e.date_of_joining::text as date_of_joining,
      d.name AS dept_name
    FROM payroll_runs pr
    JOIN employees e ON e.id = pr.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE pr.employee_id = ${employeeId}
      AND pr.month = ${month}
      AND pr.status = 'disbursed'
    LIMIT 1
  `;

  if (!rows.length) {
    return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
  }

  return NextResponse.json(buildPayslipData(rows[0]));
}
