/**
 * app/api/admin/employees/tasks/[id]/attachments/confirm/route.ts
 *
 * POST /api/admin/employees/tasks/[id]/attachments/confirm
 * Registers a confirmed S3 upload as a task_attachments row.
 */
import { NextRequest, NextResponse } from "next/server"
import { resolveSession } from "@/lib/admin-rbac"
import { getTaskUserContext } from "@/lib/task-rbac"
import { confirmAttachment } from "@/lib/task-attachments"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await resolveSession(req)
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const user = await getTaskUserContext(session.adminId)
    if (!user.permissions.includes("tasks_mgmt:manage_attachments") && !user.roles.includes("super_admin")) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 })
    }

    const { id: taskId } = await params
    const body = await req.json()
    const { s3Key, fileName, mimeType, fileSizeBytes } = body

    if (!s3Key || !fileName || !mimeType || !fileSizeBytes) {
      return NextResponse.json(
        { success: false, error: "s3Key, fileName, mimeType, and fileSizeBytes are required" },
        { status: 400 }
      )
    }

    const attachmentId = await confirmAttachment({
      taskId,
      s3Key,
      fileName,
      mimeType,
      fileSizeBytes: Number(fileSizeBytes),
      uploadedBy: session.adminId,
    })

    return NextResponse.json({ success: true, data: { attachmentId } }, { status: 201 })
  } catch (err: any) {
    console.error("POST /api/admin/employees/tasks/[id]/attachments/confirm:", err)
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 })
  }
}
