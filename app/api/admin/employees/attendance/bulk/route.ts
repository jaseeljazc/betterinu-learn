import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requirePermission } from "@/lib/admin-rbac"
import { syncExistingPayrollRunFromAttendance } from "@/lib/payroll-sync"

// POST /api/admin/employees/attendance/bulk
// Body: { date, employeeIds: string[], status }
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "attendance", "create")
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const { date, employeeIds, status } = body

  if (!date || !employeeIds || !status) {
    return NextResponse.json(
      { error: "date, employeeIds, and status are required" },
      { status: 400 }
    )
  }

  if (!Array.isArray(employeeIds)) {
    return NextResponse.json(
      { error: "employeeIds must be an array" },
      { status: 400 }
    )
  }

  if (employeeIds.length === 0) {
    return NextResponse.json({ ok: true, count: 0 })
  }

  const validStatuses = ["Present", "Absent", "Leave", "Half_Day", "Holiday"]
  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${validStatuses.join(", ")}` },
      { status: 400 }
    )
  }

  // Block marking attendance on Sundays
  const [yr, mo, dy] = date.split("-").map(Number)
  const parsedDate = new Date(yr, mo - 1, dy)
  if (parsedDate.getDay() === 0) {
    return NextResponse.json(
      { error: "Cannot mark attendance on Sundays; Sundays are auto-marked holidays" },
      { status: 400 }
    )
  }

  const adminId = auth.adminId === "super_admin_bootstrap" ? null : auth.adminId

  try {
    // Bulk upsert using unnest
    await sql`
      INSERT INTO attendance (employee_id, date, status, marked_by)
      SELECT unnest(${employeeIds}::uuid[]), ${date}::date, ${status}, ${adminId}
      ON CONFLICT (employee_id, date)
      DO UPDATE SET
        status = EXCLUDED.status,
        marked_by = EXCLUDED.marked_by,
        updated_at = NOW()
    `

    // Sync payroll runs for all updated employees
    const month = date.slice(0, 7)
    await Promise.all(
      employeeIds.map((empId) =>
        syncExistingPayrollRunFromAttendance(empId, month)
      )
    )

    return NextResponse.json({ ok: true, count: employeeIds.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
