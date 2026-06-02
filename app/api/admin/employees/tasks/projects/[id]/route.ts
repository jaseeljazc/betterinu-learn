/**
 * app/api/admin/employees/tasks/projects/[id]/route.ts
 *
 * PATCH  /api/admin/employees/tasks/projects/[id] — update project
 * DELETE /api/admin/employees/tasks/projects/[id] — soft delete (is_active = FALSE)
 */
import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { resolveSession } from "@/lib/admin-rbac"
import { getTaskUserContext } from "@/lib/task-rbac"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await resolveSession(req)
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const user = await getTaskUserContext(session.adminId)
    if (!user.permissions.includes("tasks_mgmt:manage_projects") && !user.roles.includes("super_admin")) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { name, description, departmentId } = body

    const existing = await sql`SELECT id FROM task_projects WHERE id = ${id} AND is_active = TRUE`
    if (!existing.length) return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 })

    await sql`
      UPDATE task_projects SET
        name          = COALESCE(${name?.trim() ?? null}, name),
        description   = COALESCE(${description ?? null}, description),
        department_id = COALESCE(${departmentId ?? null}, department_id),
        updated_at    = NOW()
      WHERE id = ${id}
    `

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("PATCH /api/admin/employees/tasks/projects/[id]:", err)
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await resolveSession(req)
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const user = await getTaskUserContext(session.adminId)
    if (!user.permissions.includes("tasks_mgmt:manage_projects") && !user.roles.includes("super_admin")) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 })
    }

    const { id } = await params
    const existing = await sql`SELECT id FROM task_projects WHERE id = ${id}`
    if (!existing.length) return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 })

    await sql`UPDATE task_projects SET is_active = FALSE, updated_at = NOW() WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("DELETE /api/admin/employees/tasks/projects/[id]:", err)
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 })
  }
}
