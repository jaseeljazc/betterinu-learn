/**
 * app/api/admin/employees/tasks/projects/[id]/sprints/route.ts
 *
 * GET  /api/admin/employees/tasks/projects/[id]/sprints — list sprints for a project
 * POST /api/admin/employees/tasks/projects/[id]/sprints — create sprint (requires tasks_mgmt:manage_sprints)
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

    const { id: projectId } = await params

    const rows = await sql`
      SELECT
        ts.id,
        ts.project_id,
        ts.name,
        ts.start_date,
        ts.end_date,
        ts.is_active,
        ts.created_at,
        COUNT(t.id)::int                                    AS total_tasks,
        COUNT(t.id) FILTER (WHERE t.status = 'completed')::int AS completed_tasks,
        COUNT(t.id) FILTER (WHERE t.status = 'todo')::int      AS todo_tasks,
        COUNT(t.id) FILTER (WHERE t.status = 'doing')::int     AS doing_tasks
      FROM task_sprints ts
      LEFT JOIN tasks t ON t.sprint_id = ts.id AND t.is_active = TRUE
      WHERE ts.project_id = ${projectId}
      GROUP BY ts.id
      ORDER BY ts.created_at DESC
    `

    return NextResponse.json({ success: true, data: rows })
  } catch (err: any) {
    console.error("GET /api/admin/employees/tasks/projects/[id]/sprints:", err)
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await resolveSession(req)
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const user = await getTaskUserContext(session.adminId)
    if (!user.permissions.includes("tasks_mgmt:manage_sprints") && !user.roles.includes("super_admin")) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 })
    }

    const { id: projectId } = await params
    const body = await req.json()
    const { name, startDate, endDate } = body

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: "Sprint name is required" }, { status: 400 })
    }

    // Verify project exists
    const project = await sql`SELECT id FROM task_projects WHERE id = ${projectId} AND is_active = TRUE`
    if (!project.length) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 })
    }

    const rows = await sql`
      INSERT INTO task_sprints (project_id, name, start_date, end_date)
      VALUES (${projectId}, ${name.trim()}, ${startDate ?? null}, ${endDate ?? null})
      RETURNING id, name, start_date, end_date, created_at
    `

    return NextResponse.json({ success: true, data: rows[0] }, { status: 201 })
  } catch (err: any) {
    console.error("POST /api/admin/employees/tasks/projects/[id]/sprints:", err)
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 })
  }
}
