/**
 * app/api/admin/employees/tasks/[id]/audit/route.ts
 *
 * GET /api/admin/employees/tasks/[id]/audit — full audit trail for a task
 * Requires tasks_mgmt:view_audit_log
 */
import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { resolveSession } from "@/lib/admin-rbac"
import { getTaskUserContext } from "@/lib/task-rbac"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await resolveSession(req)
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const user = await getTaskUserContext(session.adminId)
    if (!user.permissions.includes("tasks_mgmt:view_audit_log") && !user.roles.includes("super_admin")) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 })
    }

    const { id: taskId } = await params

    const { searchParams } = new URL(req.url)
    const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)))
    const offset = (page - 1) * limit

    const rows = await sql`
      SELECT
        tal.id,
        tal.field_name,
        tal.old_value,
        tal.new_value,
        tal.action,
        tal.changed_at,
        aa.id        AS changed_by_id,
        aa.full_name AS changed_by_name
      FROM task_audit_log tal
      LEFT JOIN admin_accounts aa ON aa.id = tal.changed_by
      WHERE tal.task_id = ${taskId}
      ORDER BY tal.changed_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const countRows = await sql`
      SELECT COUNT(*)::int AS total FROM task_audit_log WHERE task_id = ${taskId}
    `

    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({
        id:          r.id,
        fieldName:   r.field_name,
        oldValue:    r.old_value,
        newValue:    r.new_value,
        action:      r.action,
        changedAt:   r.changed_at,
        changedBy:   r.changed_by_id ? { id: r.changed_by_id, fullName: r.changed_by_name } : null,
      })),
      meta: { total: countRows[0]?.total ?? 0, page, limit },
    })
  } catch (err: any) {
    console.error("GET /api/admin/employees/tasks/[id]/audit:", err)
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 })
  }
}
