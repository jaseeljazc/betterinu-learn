/**
 * app/api/admin/employees/tasks/search/route.ts
 *
 * GET /api/admin/employees/tasks/search?q=<term>
 * Full-text search across title, description, task_id.
 * Respects all visibility rules from Phase 2B.
 */
import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { resolveSession } from "@/lib/admin-rbac"
import { getTaskUserContext } from "@/lib/task-rbac"
import { buildTaskWhereClause } from "@/lib/task-permissions"

export async function GET(req: NextRequest) {
  try {
    const session = await resolveSession(req)
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const user = await getTaskUserContext(session.adminId)
    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q")?.trim()

    if (!q || q.length < 2) {
      return NextResponse.json({ success: false, error: "Query must be at least 2 characters" }, { status: 400 })
    }

    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)))
    const vis   = buildTaskWhereClause(user, 1, "t")
    const term  = `%${q}%`

    const queryParams: any[] = [...vis.params]
    let idx = queryParams.length + 1

    const termIdx = idx++
    queryParams.push(term)

    const limitIdx = idx++
    queryParams.push(limit)

    const queryText = `
      SELECT
        t.id, t.task_id, t.title, t.description,
        t.status, t.priority, t.type, t.is_active,
        tp.name AS project_name,
        aa.full_name AS assigned_to_name
      FROM tasks t
      LEFT JOIN task_projects  tp ON tp.id = t.project_id
      LEFT JOIN admin_accounts aa ON aa.id = t.assigned_to
      WHERE t.is_active = TRUE
        AND (${vis.sql})
        AND (
          t.title       ILIKE $${termIdx}
          OR t.description ILIKE $${termIdx}
          OR t.task_id  ILIKE $${termIdx}
        )
      ORDER BY
        CASE
          WHEN t.task_id ILIKE $${termIdx}  THEN 0
          WHEN t.title   ILIKE $${termIdx}  THEN 1
          ELSE 2
        END,
        t.updated_at DESC
      LIMIT $${limitIdx}
    `

    const rows = await sql.query(queryText, queryParams)

    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({
        id:             r.id,
        taskId:         r.task_id,
        title:          r.title,
        description:    r.description,
        status:         r.status,
        priority:       r.priority,
        type:           r.type,
        isActive:       r.is_active,
        projectName:    r.project_name,
        assignedToName: r.assigned_to_name,
      })),
    })
  } catch (err: any) {
    console.error("GET /api/admin/employees/tasks/search:", err)
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 })
  }
}
