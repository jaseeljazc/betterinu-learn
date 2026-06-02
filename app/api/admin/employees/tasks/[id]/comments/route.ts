/**
 * app/api/admin/employees/tasks/[id]/comments/route.ts
 *
 * GET  /api/admin/employees/tasks/[id]/comments — list active comments for a task
 * POST /api/admin/employees/tasks/[id]/comments — create a comment
 */
import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { resolveSession } from "@/lib/admin-rbac"
import { logTaskChange } from "@/lib/task-audit"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await resolveSession(req)
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { id: taskId } = await params

    const rows = await sql`
      SELECT
        tc.id, tc.body, tc.is_active, tc.created_at, tc.updated_at,
        aa.id AS author_id, aa.full_name AS author_name
      FROM task_comments tc
      LEFT JOIN admin_accounts aa ON aa.id = tc.author_id
      WHERE tc.task_id = ${taskId} AND tc.is_active = TRUE
      ORDER BY tc.created_at ASC
    `

    return NextResponse.json({ success: true, data: rows })
  } catch (err: any) {
    console.error("GET /api/admin/employees/tasks/[id]/comments:", err)
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await resolveSession(req)
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { id: taskId } = await params
    const body = await req.json()
    const { comment } = body

    if (!comment?.trim()) {
      return NextResponse.json({ success: false, error: "Comment body is required" }, { status: 400 })
    }

    // Verify task exists and is active
    const task = await sql`SELECT id FROM tasks WHERE id = ${taskId} AND is_active = TRUE`
    if (!task.length) return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 })

    const rows = await sql`
      INSERT INTO task_comments (task_id, author_id, body)
      VALUES (${taskId}, ${session.adminId}, ${comment.trim()})
      RETURNING id, body, created_at
    `

    await logTaskChange({
      taskId,
      changedBy: session.adminId,
      fieldName: "comment",
      oldValue: null,
      newValue: comment.trim().slice(0, 200),
      action: "commented",
    })

    return NextResponse.json({ success: true, data: rows[0] }, { status: 201 })
  } catch (err: any) {
    console.error("POST /api/admin/employees/tasks/[id]/comments:", err)
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 })
  }
}
