/**
 * app/api/admin/employees/tasks/[id]/comments/[commentId]/route.ts
 *
 * PATCH  /api/admin/employees/tasks/[id]/comments/[commentId] — edit own comment only
 * DELETE /api/admin/employees/tasks/[id]/comments/[commentId] — soft delete comment
 */
import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { resolveSession } from "@/lib/admin-rbac"
import { getTaskUserContext } from "@/lib/task-rbac"
import { logTaskChange } from "@/lib/task-audit"

type Params = { params: Promise<{ id: string; commentId: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await resolveSession(req)
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const { id: taskId, commentId } = await params

    // Only the comment author may edit
    const existing = await sql`
      SELECT id, author_id, body FROM task_comments WHERE id = ${commentId} AND task_id = ${taskId}
    `
    if (!existing.length) return NextResponse.json({ success: false, error: "Comment not found" }, { status: 404 })
    if (existing[0].author_id !== session.adminId) {
      return NextResponse.json({ success: false, error: "You can only edit your own comments" }, { status: 403 })
    }

    const body = await req.json()
    const { comment } = body
    if (!comment?.trim()) return NextResponse.json({ success: false, error: "Comment body is required" }, { status: 400 })

    await sql`
      UPDATE task_comments SET body = ${comment.trim()}, updated_at = NOW()
      WHERE id = ${commentId}
    `

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("PATCH /api/admin/employees/tasks/[id]/comments/[commentId]:", err)
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await resolveSession(req)
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const user = await getTaskUserContext(session.adminId)
    const { id: taskId, commentId } = await params

    const existing = await sql`
      SELECT id, author_id FROM task_comments WHERE id = ${commentId} AND task_id = ${taskId}
    `
    if (!existing.length) return NextResponse.json({ success: false, error: "Comment not found" }, { status: 404 })

    const isOwner = existing[0].author_id === session.adminId
    const canEditAny = user.permissions.includes("tasks_mgmt:edit_any") || user.roles.includes("super_admin")

    if (!isOwner && !canEditAny) {
      return NextResponse.json({ success: false, error: "You can only delete your own comments" }, { status: 403 })
    }

    await sql`UPDATE task_comments SET is_active = FALSE, updated_at = NOW() WHERE id = ${commentId}`

    await logTaskChange({
      taskId,
      changedBy: session.adminId,
      fieldName: "comment",
      oldValue: commentId,
      newValue: null,
      action: "comment_removed",
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("DELETE /api/admin/employees/tasks/[id]/comments/[commentId]:", err)
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 })
  }
}
