/**
 * POST /api/admin/employees/tasks/notifications/[id]/reassign
 *
 * Body: { newAssigneeId: string }
 * Manager clicks "Reassign" in the notification. This:
 *   1. Updates tasks.assigned_to = newAssigneeId
 *   2. Sets tasks.self_assign_approval_status = 'reassigned'
 *   3. Sets task_notifications.reassigned_to = newAssigneeId
 *   4. Marks the notification as read
 *   5. Logs the change to task_audit_log
 */
import { NextRequest, NextResponse } from "next/server"
import { resolveSession } from "@/lib/admin-rbac"
import { sql } from "@/lib/db"
import { logTaskChange } from "@/lib/task-audit"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await resolveSession(req)
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const newAssigneeId = body?.newAssigneeId as string | undefined
    if (!newAssigneeId) {
      return NextResponse.json(
        { success: false, error: "newAssigneeId is required" },
        { status: 400 }
      )
    }

    // Fetch the notification to verify recipient
    const notifRows = await sql`
      SELECT tn.id, tn.task_id, tn.claimant_id, t.task_id AS task_code, t.title
      FROM task_notifications tn
      JOIN tasks t ON t.id = tn.task_id
      WHERE tn.id = ${id}
        AND tn.recipient_id = ${session.adminId}
      LIMIT 1
    `
    if (!notifRows.length) {
      return NextResponse.json(
        { success: false, error: "Notification not found" },
        { status: 404 }
      )
    }

    const notif = notifRows[0]

    // Fetch new assignee name for audit
    const assigneeRows = await sql`
      SELECT full_name FROM admin_accounts WHERE id = ${newAssigneeId} LIMIT 1
    `
    if (!assigneeRows.length) {
      return NextResponse.json(
        { success: false, error: "Assignee not found" },
        { status: 404 }
      )
    }
    const newAssigneeName = assigneeRows[0].full_name as string

    // Fetch old assignee name
    const oldAssigneeRows = await sql`
      SELECT aa.full_name
      FROM tasks t
      LEFT JOIN admin_accounts aa ON aa.id = t.assigned_to
      WHERE t.id = ${notif.task_id as string}
      LIMIT 1
    `
    const oldAssigneeName = (oldAssigneeRows[0]?.full_name as string | null) ?? null

    // Update the task
    await sql`
      UPDATE tasks SET
        assigned_to                 = ${newAssigneeId},
        self_assign_approval_status = 'reassigned',
        updated_at                  = NOW()
      WHERE id = ${notif.task_id as string}
    `

    // Mark notification as read + set reassigned_to
    await sql`
      UPDATE task_notifications SET
        is_read        = TRUE,
        reassigned_to  = ${newAssigneeId}
      WHERE id = ${id}
    `

    // Audit log
    await logTaskChange({
      taskId: notif.task_id as string,
      changedBy: session.adminId,
      fieldName: "assigned_to",
      oldValue: oldAssigneeName,
      newValue: newAssigneeName,
      action: "updated",
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("POST /api/admin/employees/tasks/notifications/[id]/reassign:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    )
  }
}
