/**
 * app/api/admin/employees/tasks/[id]/claim/route.ts
 *
 * POST /api/admin/employees/tasks/[id]/claim — employee self-claims an unassigned backlog task
 */
import { NextRequest, NextResponse } from "next/server"
import { resolveSession } from "@/lib/admin-rbac"
import { getTaskUserContext } from "@/lib/task-rbac"
import { claimBacklogTask } from "@/lib/task-self-assign"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await resolveSession(req)
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const user = await getTaskUserContext(session.adminId)
    if (!user.permissions.includes("tasks_mgmt:self_assign") && !user.roles.includes("super_admin")) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 })
    }

    const { id } = await params
    const result = await claimBacklogTask(id, session.adminId)

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: 409 })
    }

    return NextResponse.json({ success: true, data: { taskId: result.taskId } })
  } catch (err: any) {
    console.error("POST /api/admin/employees/tasks/[id]/claim:", err)
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 })
  }
}
