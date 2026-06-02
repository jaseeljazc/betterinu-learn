/**
 * app/api/admin/employees/tasks/audit/route.ts
 *
 * GET /api/admin/employees/tasks/audit
 * Returns a paginated list of global task audit logs, with filter parameters.
 * Only accessible by roles: super_admin or task_manager.
 */
import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { resolveSession } from "@/lib/admin-rbac"
import { getTaskUserContext } from "@/lib/task-rbac"

export async function GET(req: NextRequest) {
  try {
    const session = await resolveSession(req)
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const user = await getTaskUserContext(session.adminId)
    const isAuthorized = user.roles.includes("super_admin") || user.roles.includes("task_manager")
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10)))
    const offset = (page - 1) * limit
    const exportMode = searchParams.get("export") === "true"

    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const changedBy = searchParams.get("changedBy")
    const taskId = searchParams.get("taskId")?.trim()
    const action = searchParams.get("action")

    // Construct query filters using parameter values safely
    const queryParams: any[] = []
    let idx = 1
    const filterClauses: string[] = ["TRUE"]

    if (dateFrom) {
      filterClauses.push(`tal.changed_at >= ($${idx++} || ' 00:00:00')::timestamptz`)
      queryParams.push(dateFrom)
    }
    if (dateTo) {
      filterClauses.push(`tal.changed_at <= ($${idx++} || ' 23:59:59')::timestamptz`)
      queryParams.push(dateTo)
    }
    if (changedBy) {
      filterClauses.push(`tal.changed_by = $${idx++}::uuid`)
      queryParams.push(changedBy)
    }
    if (taskId) {
      filterClauses.push(`(t.task_id ILIKE $${idx} OR t.title ILIKE $${idx})`)
      idx++
      queryParams.push(`%${taskId}%`)
    }
    if (action) {
      filterClauses.push(`tal.action = $${idx++}`)
      queryParams.push(action)
    }

    const whereClause = filterClauses.join(" AND ")

    // Count query
    const countRes = await sql.query(`
      SELECT COUNT(*)::int AS total
      FROM task_audit_log tal
      JOIN tasks t ON t.id = tal.task_id
      LEFT JOIN admin_accounts aa ON aa.id = tal.changed_by
      WHERE ${whereClause}
    `, queryParams)
    const total = countRes[0]?.total ?? 0

    // List query
    let rows
    if (exportMode) {
      rows = await sql.query(`
        SELECT
          tal.id,
          tal.task_id AS internal_task_id,
          t.task_id AS task_ref,
          t.title AS task_title,
          tal.changed_at,
          tal.field_name,
          tal.old_value,
          tal.new_value,
          tal.action,
          aa.full_name AS changed_by_name
        FROM task_audit_log tal
        JOIN tasks t ON t.id = tal.task_id
        LEFT JOIN admin_accounts aa ON aa.id = tal.changed_by
        WHERE ${whereClause}
        ORDER BY tal.changed_at DESC
        LIMIT 5000
      `, queryParams)
    } else {
      const pageParams = [...queryParams, limit, offset]
      rows = await sql.query(`
        SELECT
          tal.id,
          tal.task_id AS internal_task_id,
          t.task_id AS task_ref,
          t.title AS task_title,
          tal.changed_at,
          tal.field_name,
          tal.old_value,
          tal.new_value,
          tal.action,
          aa.full_name AS changed_by_name
        FROM task_audit_log tal
        JOIN tasks t ON t.id = tal.task_id
        LEFT JOIN admin_accounts aa ON aa.id = tal.changed_by
        WHERE ${whereClause}
        ORDER BY tal.changed_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
      `, pageParams)
    }

    // Fetch active admins to populate selector list in filters
    const admins = await sql`
      SELECT id, full_name AS "fullName"
      FROM admin_accounts
      WHERE status = 'active'
      ORDER BY full_name ASC
    `

    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        internalTaskId: r.internal_task_id,
        taskId: r.task_ref,
        taskTitle: r.task_title,
        changedAt: r.changed_at,
        fieldName: r.field_name,
        oldValue: r.old_value,
        newValue: r.new_value,
        action: r.action,
        changedByName: r.changed_by_name ?? "System",
      })),
      meta: {
        total,
        page,
        limit,
      },
      admins,
    })
  } catch (err: any) {
    console.error("GET /api/admin/employees/tasks/audit:", err)
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 })
  }
}
