/**
 * app/api/admin/employees/tasks/[id]/attachments/[attachmentId]/route.ts
 *
 * DELETE /api/admin/employees/tasks/[id]/attachments/[attachmentId]
 * Removes an attachment from S3 and the DB (with audit trail).
 */
import { NextRequest, NextResponse } from "next/server"
import { resolveSession } from "@/lib/admin-rbac"
import { getTaskUserContext } from "@/lib/task-rbac"
import { deleteAttachment } from "@/lib/task-attachments"

type Params = { params: Promise<{ id: string; attachmentId: string }> }

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await resolveSession(req)
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const user = await getTaskUserContext(session.adminId)
    if (!user.permissions.includes("tasks_mgmt:manage_attachments") && !user.roles.includes("super_admin")) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 })
    }

    const { attachmentId } = await params
    await deleteAttachment(attachmentId, session.adminId)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("DELETE /api/admin/employees/tasks/[id]/attachments/[attachmentId]:", err)
    const status = err.message?.includes("not found") ? 404 : 500
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status })
  }
}
