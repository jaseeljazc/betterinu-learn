/**
 * app/api/admin/employees/tasks/[id]/attachments/upload-url/route.ts
 *
 * POST /api/admin/employees/tasks/[id]/attachments/upload-url
 * Returns a pre-signed S3 PUT URL for a task attachment.
 */
import { NextRequest, NextResponse } from "next/server"
import { resolveSession } from "@/lib/admin-rbac"
import { getTaskUserContext } from "@/lib/task-rbac"
import { generateAttachmentUploadUrl } from "@/lib/task-attachments"
import { sql } from "@/lib/db"

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

    // Verify task exists and is active
    const task = await sql`SELECT id FROM tasks WHERE id = ${taskId} AND is_active = TRUE`
    if (!task.length) return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 })

    const body = await req.json()
    const { fileName, mimeType, fileSize } = body

    if (!fileName || !mimeType || !fileSize) {
      return NextResponse.json({ success: false, error: "fileName, mimeType, and fileSize are required" }, { status: 400 })
    }

    const result = await generateAttachmentUploadUrl(taskId, fileName, mimeType, Number(fileSize))

    return NextResponse.json({ success: true, data: result })
  } catch (err: any) {
    console.error("POST /api/admin/employees/tasks/[id]/attachments/upload-url:", err)
    const status = err.message?.includes("not allowed") || err.message?.includes("exceeds") ? 400 : 500
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status })
  }
}
