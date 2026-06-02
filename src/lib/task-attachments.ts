/**
 * lib/task-attachments.ts — S3 attachment helpers for task files.
 *
 * Follows the same private-bucket pattern as lib/s3-private.ts.
 * Key pattern: tasks/{taskId}/attachments/{uuid}-{sanitisedFileName}
 *
 * Server-only — never import from client components.
 */
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { v4 as uuidv4 } from "uuid"
import { sql } from "@/lib/db"
import { logTaskChange } from "@/lib/task-audit"

// ---------------------------------------------------------------------------
// Allowed types for task attachments (broader than account attachments)
// ---------------------------------------------------------------------------

const TASK_ATTACHMENT_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/zip",
]

const TASK_ATTACHMENT_MAX_SIZE = 25 * 1024 * 1024 // 25 MB

function getS3Client() {
  return new S3Client({
    region: process.env.AWS_S3_PRIVATE_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  })
}

// ---------------------------------------------------------------------------
// generateAttachmentUploadUrl
// ---------------------------------------------------------------------------

export type AttachmentUploadResult = {
  presignedUrl: string
  s3Key: string
}

/**
 * Validates the file, then generates a short-lived presigned S3 PUT URL and
 * the final S3 key for the attachment.
 *
 * The caller must:
 *   1. Use the presignedUrl to PUT the file directly from the browser.
 *   2. Call confirmAttachment() after a successful PUT to register the row.
 *
 * @param taskId   - UUID of the parent task.
 * @param fileName - Original file name (used for key and DB record).
 * @param mimeType - MIME type to validate and sign the PUT with.
 * @param fileSize - File size in bytes for limit enforcement.
 */
export async function generateAttachmentUploadUrl(
  taskId: string,
  fileName: string,
  mimeType: string,
  fileSize: number
): Promise<AttachmentUploadResult> {
  if (!TASK_ATTACHMENT_ALLOWED_TYPES.includes(mimeType)) {
    throw new Error(
      `File type '${mimeType}' is not allowed for task attachments.`
    )
  }
  if (fileSize > TASK_ATTACHMENT_MAX_SIZE) {
    throw new Error("File size exceeds the 25 MB limit for task attachments.")
  }

  // Sanitise the file name: strip path separators, keep extension
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200)
  const s3Key = `tasks/${taskId}/attachments/${uuidv4()}-${safeName}`

  const client = getS3Client()
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_PRIVATE_BUCKET!,
    Key: s3Key,
    ContentType: mimeType,
  })

  const presignedUrl = await getSignedUrl(client, command, {
    expiresIn: 5 * 60, // 5 minutes — must upload promptly
  })

  return { presignedUrl, s3Key }
}

// ---------------------------------------------------------------------------
// confirmAttachment
// ---------------------------------------------------------------------------

export type ConfirmAttachmentParams = {
  taskId: string
  s3Key: string
  fileName: string
  mimeType: string
  fileSizeBytes: number
  uploadedBy: string
}

/**
 * Registers the attachment in task_attachments after a confirmed S3 upload.
 * Writes an audit row immediately.
 *
 * @returns The new task_attachments row id.
 */
export async function confirmAttachment({
  taskId,
  s3Key,
  fileName,
  mimeType,
  fileSizeBytes,
  uploadedBy,
}: ConfirmAttachmentParams): Promise<string> {
  const rows = await sql`
    INSERT INTO task_attachments
      (task_id, file_name, file_key, file_size_bytes, mime_type, uploaded_by)
    VALUES
      (${taskId}, ${fileName}, ${s3Key}, ${fileSizeBytes}, ${mimeType}, ${uploadedBy})
    RETURNING id
  `

  const attachmentId = rows[0].id as string

  await logTaskChange({
    taskId,
    changedBy: uploadedBy,
    fieldName: "attachment",
    oldValue: null,
    newValue: fileName,
    action: "attachment_added",
  })

  return attachmentId
}

// ---------------------------------------------------------------------------
// deleteAttachment
// ---------------------------------------------------------------------------

/**
 * Hard-deletes an attachment: removes the S3 object then deletes the DB row.
 * Writes an audit row synchronously before deletion so the record exists
 * in the audit trail even after the row is gone.
 *
 * @param attachmentId - task_attachments.id
 * @param deletedBy    - admin_accounts.id of the actor
 */
export async function deleteAttachment(
  attachmentId: string,
  deletedBy: string
): Promise<void> {
  // Fetch before deleting so we have the S3 key and file name for audit
  const rows = await sql`
    SELECT id, task_id, file_key, file_name
    FROM task_attachments
    WHERE id = ${attachmentId}
    LIMIT 1
  `

  if (!rows.length) {
    throw new Error(`Attachment ${attachmentId} not found`)
  }

  const { task_id: taskId, file_key: s3Key, file_name: fileName } = rows[0] as {
    task_id: string
    file_key: string
    file_name: string
  }

  // Write audit row BEFORE deletion so trail is complete
  await logTaskChange({
    taskId,
    changedBy: deletedBy,
    fieldName: "attachment",
    oldValue: fileName,
    newValue: null,
    action: "attachment_removed",
  })

  // Delete from S3 (fire — errors propagate to caller)
  const client = getS3Client()
  await client.send(
    new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_PRIVATE_BUCKET!,
      Key: s3Key,
    })
  )

  // Delete the DB row
  await sql`DELETE FROM task_attachments WHERE id = ${attachmentId}`
}

export { TASK_ATTACHMENT_ALLOWED_TYPES, TASK_ATTACHMENT_MAX_SIZE }
