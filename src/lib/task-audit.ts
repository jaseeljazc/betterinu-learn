/**
 * lib/task-audit.ts — Append-only audit trail for task mutations.
 *
 * Call logTaskChange from every mutation: create, update, disable, self-assign,
 * attachment upload/delete, comment add/remove.
 *
 * NEVER batch or defer these writes — each mutation writes its audit row
 * synchronously before returning a response.
 *
 * Server-only — never import from client components.
 */
import { sql } from "@/lib/db"

export type TaskAuditAction =
  | "created"
  | "updated"
  | "disabled"
  | "restored"
  | "self_assigned"
  | "self_assign_confirmed"
  | "self_assign_reassigned"
  | "assigned"
  | "attachment_added"
  | "attachment_removed"
  | "commented"
  | "comment_removed"
  | "status_changed"
  | "priority_changed"
  | "sprint_changed"
  | "project_changed"

export type LogTaskChangeParams = {
  taskId: string
  changedBy: string
  fieldName: string
  oldValue?: string | null
  newValue?: string | null
  action: TaskAuditAction
}

/**
 * Inserts a single row into task_audit_log.
 *
 * Must be called synchronously within every mutation handler — do not fire
 * and forget, and do not batch with other writes.
 */
export async function logTaskChange({
  taskId,
  changedBy,
  fieldName,
  oldValue = null,
  newValue = null,
  action,
}: LogTaskChangeParams): Promise<void> {
  await sql`
    INSERT INTO task_audit_log
      (task_id, changed_by, field_name, old_value, new_value, action)
    VALUES
      (${taskId}, ${changedBy}, ${fieldName}, ${oldValue}, ${newValue}, ${action})
  `
}
