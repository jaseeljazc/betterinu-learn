import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/admin-rbac";
import { buildPayslipData } from "@/lib/admin-profile";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission(req, "payroll", "view");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

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
    WHERE pr.id = ${id}
    LIMIT 1
  `;

  if (!rows.length) {
    return NextResponse.json({ error: "Payroll run not found" }, { status: 404 });
  }

  return NextResponse.json(buildPayslipData(rows[0]));
}
