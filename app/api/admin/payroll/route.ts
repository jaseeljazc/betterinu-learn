import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requirePermission } from "@/lib/admin-rbac"
import type { PayrollRun } from "@/types"

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "payroll", "view")
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const month = searchParams.get("month")
  const departmentId = searchParams.get("departmentId")
  const status = searchParams.get("status")

  if (!month) {
    return NextResponse.json({ error: "month query param required (YYYY-MM)" }, { status: 400 })
  }

  const rows = await sql`
    SELECT
      pr.id, pr.month, pr.working_days, pr.days_present, 
      pr.leave_count, pr.absent_count, pr.half_day_count,
      pr.lop_leaves, pr.lop_absences, pr.lop_full_days, pr.lop_half_days,
      pr.daily_rate, pr.lop_deduction, pr.gross_salary, pr.net_salary,
      pr.status, pr.disbursed_at::text as disbursed_at, pr.transaction_id, pr.created_at::text as created_at, pr.updated_at::text as updated_at,
      e.id AS employee_id, e.employee_code, e.full_name, e.designation,
      d.id AS dept_id, d.name AS dept_name
    FROM payroll_runs pr
    JOIN employees e ON e.id = pr.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE pr.month = ${month}
      ${departmentId ? sql`AND e.department_id = ${departmentId}` : sql``}
      ${status ? sql`AND pr.status = ${status}` : sql``}
    ORDER BY e.full_name ASC
  `

  const runs: PayrollRun[] = rows.map((r) => ({
    id: r.id as string,
    employeeId: r.employee_id as string,
    employee: {
      id: r.employee_id as string,
      employeeCode: r.employee_code as string,
      fullName: r.full_name as string,
      designation: (r.designation as string) || undefined,
      department: r.dept_name ? { id: r.dept_id as string, name: r.dept_name as string } : undefined
    },
    month: r.month as string,
    workingDays: Number(r.working_days),
    daysPresent: Number(r.days_present),
    leaveCount: Number(r.leave_count),
    absentCount: Number(r.absent_count),
    halfDayCount: Number(r.half_day_count),
    lopLeaves: Number(r.lop_leaves),
    lopAbsences: Number(r.lop_absences),
    lopFullDays: Number(r.lop_full_days),
    lopHalfDays: Number(r.lop_half_days),
    dailyRate: Number(r.daily_rate),
    lopDeduction: Number(r.lop_deduction),
    grossSalary: Number(r.gross_salary),
    netSalary: Number(r.net_salary),
    status: r.status as any,
    disbursedAt: (r.disbursed_at as string) || undefined,
    transactionId: (r.transaction_id as string) || undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string
  }))

  return NextResponse.json({ runs, month })
}
