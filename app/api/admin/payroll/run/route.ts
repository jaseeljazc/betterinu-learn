import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requirePermission } from "@/lib/admin-rbac"
import { calculatePayrollFromAttendance, getPayrollMonthRange } from "@/lib/payroll-calculation"

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "payroll_runs", "create")
  if (auth instanceof NextResponse) return auth

  const { month, departmentId } = await req.json()
  if (!month) {
    return NextResponse.json({ error: "month (YYYY-MM) is required" }, { status: 400 })
  }

  const { monthStart, monthEnd } = getPayrollMonthRange(month)
  
  // Find all active employees
  const employees = await sql`
    SELECT id, monthly_salary 
    FROM employees 
    WHERE status = 'active'
    ${departmentId ? sql`AND department_id = ${departmentId}` : sql``}
  `

  if (!employees.length) {
    return NextResponse.json({ error: "No active employees found" }, { status: 404 })
  }

  const attendanceRecords = await sql`
    SELECT employee_id, date::text as date, status 
    FROM attendance 
    WHERE date >= ${monthStart} AND date <= ${monthEnd}
  `

  const creatorId = auth.adminId === "super_admin_bootstrap" ? null : auth.adminId
  const runs = []
  
  let totalGross = 0
  let totalDeductions = 0
  let totalNet = 0

  for (const emp of employees) {
    const empAtt = attendanceRecords
      .filter((a) => a.employee_id === emp.id)
      .map((a) => ({ date: String(a.date), status: String(a.status) }))

    const payroll = calculatePayrollFromAttendance(month, emp.monthly_salary, empAtt)
    
    totalGross += payroll.grossSalary
    totalDeductions += payroll.lopDeduction
    totalNet += payroll.netSalary
    
    // Upsert PayrollRun (skip if disbursed)
    const existing = await sql`SELECT id, status FROM payroll_runs WHERE employee_id = ${emp.id} AND month = ${month}`
    if (existing.length && existing[0].status === 'disbursed') {
      continue // Skip disbursed runs
    }
    
    const run = await sql`
      INSERT INTO payroll_runs (
        employee_id, month, working_days, days_present, 
        leave_count, absent_count, half_day_count,
        lop_leaves, lop_absences, lop_full_days, lop_half_days,
        daily_rate, lop_deduction, gross_salary, net_salary, created_by
      )
      VALUES (
        ${emp.id}, ${month}, ${payroll.workingDays}, ${payroll.daysPresent}, 
        ${payroll.leaveCount}, ${payroll.absentCount}, ${payroll.halfDayCount},
        ${payroll.lopLeaves}, ${payroll.lopAbsences}, ${payroll.lopFullDays}, ${payroll.lopHalfDays},
        ${payroll.dailyRate}, ${payroll.lopDeduction}, ${payroll.grossSalary}, ${payroll.netSalary}, ${creatorId}
      )
      ON CONFLICT (employee_id, month) DO UPDATE SET
        working_days = EXCLUDED.working_days,
        days_present = EXCLUDED.days_present,
        leave_count = EXCLUDED.leave_count,
        absent_count = EXCLUDED.absent_count,
        half_day_count = EXCLUDED.half_day_count,
        lop_leaves = EXCLUDED.lop_leaves,
        lop_absences = EXCLUDED.lop_absences,
        lop_full_days = EXCLUDED.lop_full_days,
        lop_half_days = EXCLUDED.lop_half_days,
        daily_rate = EXCLUDED.daily_rate,
        lop_deduction = EXCLUDED.lop_deduction,
        gross_salary = EXCLUDED.gross_salary,
        net_salary = EXCLUDED.net_salary,
        updated_at = NOW()
      RETURNING id
    `
    runs.push(run[0].id)
  }

  return NextResponse.json({
    ok: true,
    total: runs.length,
    grossTotal: totalGross,
    deductionsTotal: totalDeductions,
    netTotal: totalNet,
    runs
  }, { status: 201 })
}
