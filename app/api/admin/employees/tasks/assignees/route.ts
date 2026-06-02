/**
 * app/api/admin/employees/tasks/assignees/route.ts
 *
 * GET /api/admin/employees/tasks/assignees — list active admin accounts for task assignment
 */
import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { resolveSession } from "@/lib/admin-rbac"

export async function GET(req: NextRequest) {
  try {
    const session = await resolveSession(req)
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // Retrieve active admin accounts that can be assigned tasks
    const rows = await sql`
      SELECT aa.id, aa.full_name, e.department_id
      FROM admin_accounts aa
      LEFT JOIN employees e ON e.admin_account_id = aa.id
      WHERE aa.status = 'active'
      ORDER BY aa.full_name ASC
    `

    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id, // This is the admin_account_id matching tasks.assigned_to
        fullName: r.full_name,
        departmentId: r.department_id ?? null,
      })),
    })
  } catch (err: any) {
    console.error("GET /api/admin/employees/tasks/assignees:", err)
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 })
  }
}
