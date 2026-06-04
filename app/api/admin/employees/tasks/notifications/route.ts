/**
 * GET  /api/admin/employees/tasks/notifications
 *
 * Returns the 20 most recent task_notifications for the calling admin,
 * plus the count of unread ones (for the badge).
 */
import { NextRequest, NextResponse } from "next/server"
import { resolveSession } from "@/lib/admin-rbac"
import { sql } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const session = await resolveSession(req)
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const rows = await sql`
      SELECT
        tn.id,
        tn.task_id,
        t.task_id   AS task_code,
        t.title     AS task_title,
        tn.message,
        tn.action_url,
        tn.is_read,
        tn.created_at,
        tn.reassigned_to,
        aa_claimant.full_name AS claimant_name,
        aa_reassigned.full_name AS reassigned_to_name
      FROM task_notifications tn
      JOIN tasks           t              ON t.id = tn.task_id
      JOIN admin_accounts  aa_claimant    ON aa_claimant.id = tn.claimant_id
      LEFT JOIN admin_accounts aa_reassigned ON aa_reassigned.id = tn.reassigned_to
      WHERE tn.recipient_id = ${session.adminId}
      ORDER BY tn.created_at DESC
      LIMIT 25
    `

    const unreadCount = rows.filter((r) => !r.is_read).length

    // Fetch possible reassignees for the inline picker
    const assignees = await sql`
      SELECT id, full_name
      FROM admin_accounts
      WHERE status = 'active'
      ORDER BY full_name
    `

    return NextResponse.json({
      success: true,
      data: rows,
      unreadCount,
      assignees: assignees.map((a) => ({ id: a.id, fullName: a.full_name })),
    })
  } catch (err: any) {
    console.error("GET /api/admin/employees/tasks/notifications:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/employees/tasks/notifications
 *
 * Body: { markAllRead: true }
 * Marks all unread notifications for the caller as read.
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await resolveSession(req)
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    await sql`
      UPDATE task_notifications
      SET is_read = TRUE
      WHERE recipient_id = ${session.adminId}
        AND is_read = FALSE
    `

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("PATCH /api/admin/employees/tasks/notifications:", err)
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    )
  }
}
