/**
 * app/api/admin/employees/tasks/projects/route.ts
 *
 * GET  /api/admin/employees/tasks/projects — list active projects
 * POST /api/admin/employees/tasks/projects — create project (requires tasks_mgmt:manage_projects)
 */
import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { resolveSession } from "@/lib/admin-rbac"
import { getTaskUserContext } from "@/lib/task-rbac"

export async function GET(req: NextRequest) {
  try {
    const session = await resolveSession(req)
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const user = await getTaskUserContext(session.adminId)
    const hasViewAll = user.permissions.includes("tasks_mgmt:view_all")

    const rows = await sql`
      SELECT
        tp.id,
        tp.name,
        tp.description,
        tp.department_id,
        tp.is_active,
        tp.created_at,
        tp.updated_at,
        d.name          AS department_name,
        aa.full_name    AS created_by_name,
        (SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = tp.id AND t.is_active = TRUE) AS task_count,
        (SELECT COUNT(*)::int FROM task_sprints ts WHERE ts.project_id = tp.id AND ts.is_active = TRUE) AS sprint_count
      FROM task_projects tp
      LEFT JOIN departments d      ON d.id = tp.department_id
      LEFT JOIN admin_accounts aa  ON aa.id = tp.created_by
      WHERE tp.is_active = TRUE
        ${!hasViewAll && user.departmentId
          ? sql`AND (tp.department_id = ${user.departmentId} OR tp.department_id IS NULL)`
          : sql``}
      ORDER BY tp.created_at DESC
    `

    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        departmentId: r.department_id,
        departmentName: r.department_name,
        isActive: r.is_active,
        taskCount: r.task_count,
        sprintCount: r.sprint_count,
        createdByName: r.created_by_name,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    })
  } catch (err: any) {
    console.error("GET /api/admin/employees/tasks/projects:", err)
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await resolveSession(req)
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const user = await getTaskUserContext(session.adminId)
    if (!user.permissions.includes("tasks_mgmt:manage_projects") && !user.roles.includes("super_admin")) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 })
    }

    const body = await req.json()
    const { name, description, departmentId } = body

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "Project name is required" }, { status: 400 })
    }

    const rows = await sql`
      INSERT INTO task_projects (name, description, department_id, created_by)
      VALUES (${name.trim()}, ${description ?? null}, ${departmentId ?? null}, ${session.adminId})
      RETURNING id, name, created_at
    `

    return NextResponse.json({ success: true, data: rows[0] }, { status: 201 })
  } catch (err: any) {
    console.error("POST /api/admin/employees/tasks/projects:", err)
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 })
  }
}
