/**
 * app/api/admin/employees/tasks/[id]/route.ts
 *
 * GET    /api/admin/employees/tasks/[id] — single task detail with sub-tasks, attachments, comments, audit log
 * PATCH  /api/admin/employees/tasks/[id] — update task fields (field-level audit logging)
 * DELETE /api/admin/employees/tasks/[id] — soft delete (is_active = FALSE, requires tasks_mgmt:delete)
 */
import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { resolveSession } from "@/lib/admin-rbac"
import { getTaskUserContext } from "@/lib/task-rbac"
import { logTaskChange } from "@/lib/task-audit"

type Params = { params: Promise<{ id: string }> }

// ---------------------------------------------------------------------------
// GET /api/admin/employees/tasks/[id]
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await resolveSession(req)
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const user = await getTaskUserContext(session.adminId)
    const { id } = await params

    // Fetch the core task (visibility check embedded)
    const rows = await sql`
      SELECT
        t.id, t.task_id, t.title, t.description, t.note,
        t.type, t.status, t.priority, t.visibility, t.is_active,
        t.due_date, t.estimated_hours, t.logged_hours,
        t.self_assigned, t.self_assign_approval_status, t.self_assign_deadline,
        t.created_at, t.updated_at, t.completed_at,
        tp.id AS project_id, tp.name AS project_name,
        ts.id AS sprint_id,  ts.name AS sprint_name,
        d.id  AS department_id, d.name AS department_name,
        aa_c.id AS created_by_id,  aa_c.full_name AS created_by_name,
        aa_a.id AS assigned_to_id, aa_a.full_name AS assigned_to_name,
        aa_r.id AS reviewer_id,    aa_r.full_name AS reviewer_name,
        parent.id AS parent_id, parent.task_id AS parent_task_id, parent.title AS parent_title
      FROM tasks t
      LEFT JOIN task_projects  tp     ON tp.id = t.project_id
      LEFT JOIN task_sprints   ts     ON ts.id = t.sprint_id
      LEFT JOIN departments    d      ON d.id  = t.department_id
      LEFT JOIN admin_accounts aa_c   ON aa_c.id = t.created_by
      LEFT JOIN admin_accounts aa_a   ON aa_a.id = t.assigned_to
      LEFT JOIN admin_accounts aa_r   ON aa_r.id = t.reviewer_id
      LEFT JOIN tasks          parent ON parent.id = t.parent_task_id
      WHERE t.id = ${id}
    `

    if (!rows.length) return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 })

    const task = rows[0]

    // Visibility check — apply same rules as list query
    const hasViewAll = user.permissions.includes("tasks_mgmt:view_all")
    const isSuperAdmin = user.roles.includes("super_admin")
    const isTaskManager =
      user.roles.includes("task_manager") || user.roles.includes("super_admin")

    if (!hasViewAll && !isSuperAdmin && !isTaskManager) {
      const isParty =
        task.assigned_to_id === session.adminId ||
        task.created_by_id === session.adminId ||
        task.reviewer_id === session.adminId

      if (task.visibility === "confidential") {
        return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 })
      }

      if (task.visibility === "private" && !isParty) {
        return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 })
      }

      // public: only visible to users in the same department OR who are a party
      if (task.visibility === "public") {
        const sameDept =
          user.departmentId != null &&
          task.department_id != null &&
          user.departmentId === task.department_id
        if (!sameDept && !isParty) {
          return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 })
        }
      }
    }

    // Sub-tasks
    const subtasks = await sql`
      SELECT id, task_id, title, status, priority, is_active
      FROM tasks
      WHERE parent_task_id = ${id} AND is_active = TRUE
      ORDER BY created_at ASC
    `

    // Attachments
    const attachments = await sql`
      SELECT ta.id, ta.file_name, ta.file_key, ta.file_size_bytes, ta.mime_type, ta.uploaded_at,
             aa.full_name AS uploaded_by_name
      FROM task_attachments ta
      LEFT JOIN admin_accounts aa ON aa.id = ta.uploaded_by
      WHERE ta.task_id = ${id}
      ORDER BY ta.uploaded_at DESC
    `

    // Comments (active only)
    const comments = await sql`
      SELECT tc.id, tc.body, tc.is_active, tc.created_at, tc.updated_at,
             aa.id AS author_id, aa.full_name AS author_name
      FROM task_comments tc
      LEFT JOIN admin_accounts aa ON aa.id = tc.author_id
      WHERE tc.task_id = ${id} AND tc.is_active = TRUE
      ORDER BY tc.created_at ASC
    `

    // Audit log — only if user has permission
    let auditLog: any[] = []
    if (user.permissions.includes("tasks_mgmt:view_audit_log") || user.roles.includes("super_admin")) {
      const auditRows = await sql`
        SELECT tal.id, tal.field_name, tal.old_value, tal.new_value, tal.action, tal.changed_at,
               aa.full_name AS changed_by_name
        FROM task_audit_log tal
        LEFT JOIN admin_accounts aa ON aa.id = tal.changed_by
        WHERE tal.task_id = ${id}
        ORDER BY tal.changed_at DESC
        LIMIT 100
      `
      auditLog = auditRows
    }

    return NextResponse.json({
      success: true,
      data: {
        id:                   task.id,
        taskId:               task.task_id,
        title:                task.title,
        description:          task.description,
        note:                 task.note,
        type:                 task.type,
        status:               task.status,
        priority:             task.priority,
        visibility:           task.visibility,
        isActive:             task.is_active,
        dueDate:              task.due_date,
        estimatedHours:       task.estimated_hours,
        loggedHours:          task.logged_hours,
        selfAssigned:         task.self_assigned,
        selfAssignStatus:     task.self_assign_approval_status,
        selfAssignDeadline:   task.self_assign_deadline,
        createdAt:            task.created_at,
        updatedAt:            task.updated_at,
        completedAt:          task.completed_at,
        project:    task.project_id    ? { id: task.project_id,    name: task.project_name }    : null,
        sprint:     task.sprint_id     ? { id: task.sprint_id,     name: task.sprint_name }     : null,
        department: task.department_id ? { id: task.department_id, name: task.department_name } : null,
        parent:     task.parent_id     ? { id: task.parent_id, taskId: task.parent_task_id, title: task.parent_title } : null,
        createdBy:  task.created_by_id  ? { id: task.created_by_id,  fullName: task.created_by_name }  : null,
        assignedTo: task.assigned_to_id ? { id: task.assigned_to_id, fullName: task.assigned_to_name } : null,
        reviewer:   task.reviewer_id    ? { id: task.reviewer_id,    fullName: task.reviewer_name }    : null,
        subtasks:    subtasks,
        attachments: attachments,
        comments:    comments,
        auditLog:    auditLog,
      },
    })
  } catch (err: any) {
    console.error("GET /api/admin/employees/tasks/[id]:", err)
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/employees/tasks/[id]
// ---------------------------------------------------------------------------
const MUTABLE_FIELDS = [
  "title", "description", "note", "type", "status", "priority",
  "visibility", "project_id", "sprint_id", "department_id",
  "assigned_to", "reviewer_id", "due_date", "estimated_hours",
  "logged_hours", "is_active",
] as const

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await resolveSession(req)
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const user = await getTaskUserContext(session.adminId)
    const { id } = await params

    const existing = await sql`
      SELECT t.*, aa.full_name AS assigned_to_name
      FROM tasks t
      LEFT JOIN admin_accounts aa ON aa.id = t.assigned_to
      WHERE t.id = ${id}
    `
    if (!existing.length) return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 })

    const task = existing[0]

    // Permission gate: edit_any covers all tasks; edit_own only for own tasks
    const isOwner = task.created_by === session.adminId || task.assigned_to === session.adminId
    const isCreator = task.created_by === session.adminId
    const canEditAny = user.permissions.includes("tasks_mgmt:edit_any") || user.roles.includes("super_admin")
    const canEditOwn = user.permissions.includes("tasks_mgmt:edit_own") && isOwner

    // Also read body early so we can check if this is a disable-only request
    const body = await req.json()
    const isDisableRequest = body.isActive === false || body.is_active === false

    if (!canEditAny && !canEditOwn && !(isDisableRequest && isCreator)) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 })
    }

    // is_active = FALSE requires delete permission, task_manager role, OR being the task creator
    if (body.is_active === false || body.isActive === false) {
      const canDelete =
        user.permissions.includes("tasks_mgmt:delete") ||
        user.roles.includes("super_admin") ||
        user.roles.includes("task_manager") ||
        isCreator
      if (!canDelete) {
        return NextResponse.json({ success: false, error: "tasks_mgmt:delete permission required to disable a task" }, { status: 403 })
      }
    }

    // Map camelCase body keys → snake_case DB columns
    const fieldMap: Record<string, string> = {
      title: "title", description: "description", note: "note",
      type: "type", status: "status", priority: "priority", visibility: "visibility",
      projectId: "project_id", sprintId: "sprint_id", departmentId: "department_id",
      assignedTo: "assigned_to", reviewerId: "reviewer_id",
      dueDate: "due_date", estimatedHours: "estimated_hours",
      loggedHours: "logged_hours", isActive: "is_active",
    }

    const auditEntries: { field: string; old: string | null; new: string | null }[] = []

    // Build SET clause dynamically
    let updated = false
    for (const [bodyKey, dbCol] of Object.entries(fieldMap)) {
      if (!(bodyKey in body)) continue
      const newVal = body[bodyKey]
      const oldVal = (task as any)[dbCol]
      if (String(oldVal ?? "") === String(newVal ?? "")) continue
      auditEntries.push({ field: dbCol, old: oldVal != null ? String(oldVal) : null, new: newVal != null ? String(newVal) : null })
      updated = true
    }

    if (!updated) return NextResponse.json({ success: true, data: { noChange: true } })

    // Perform update — cast enum columns explicitly
    await sql`
      UPDATE tasks SET
        title           = COALESCE(${body.title?.trim()          ?? null}, title),
        description     = COALESCE(${body.description            ?? null}, description),
        note            = COALESCE(${body.note                   ?? null}, note),
        type            = COALESCE(${body.type                   ?? null}::task_type, type),
        status          = COALESCE(${body.status                 ?? null}::task_status, status),
        priority        = COALESCE(${body.priority               ?? null}::task_priority, priority),
        visibility      = COALESCE(${body.visibility             ?? null}::task_visibility, visibility),
        project_id      = COALESCE(${body.projectId              ?? null}, project_id),
        sprint_id       = COALESCE(${body.sprintId               ?? null}, sprint_id),
        department_id   = COALESCE(${body.departmentId           ?? null}, department_id),
        assigned_to     = CASE WHEN ${"assignedTo" in body}::boolean THEN ${(body.assignedTo || null)} ELSE assigned_to END,
        reviewer_id     = CASE WHEN ${"reviewerId" in body}::boolean THEN ${(body.reviewerId || null)} ELSE reviewer_id END,
        due_date        = COALESCE(${body.dueDate                ?? null}, due_date),
        estimated_hours = COALESCE(${body.estimatedHours         ?? null}, estimated_hours),
        logged_hours    = COALESCE(${body.loggedHours            ?? null}, logged_hours),
        is_active       = COALESCE(${body.isActive               ?? null}, is_active),
        completed_at    = CASE WHEN ${body.status === "completed"}::boolean AND completed_at IS NULL THEN NOW() ELSE completed_at END,
        updated_at      = NOW()
      WHERE id = ${id}
    `

    // Write one audit row per changed field
    for (const entry of auditEntries) {
      const action = entry.field === "is_active" && entry.new === "false"
        ? "disabled"
        : entry.field === "status"
        ? "status_changed"
        : entry.field === "priority"
        ? "priority_changed"
        : entry.field === "sprint_id"
        ? "sprint_changed"
        : entry.field === "project_id"
        ? "project_changed"
        : "updated"

      await logTaskChange({
        taskId: id,
        changedBy: session.adminId,
        fieldName: entry.field,
        oldValue: entry.old,
        newValue: entry.new,
        action,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("PATCH /api/admin/employees/tasks/[id]:", err)
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/admin/employees/tasks/[id]  →  soft delete only
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await resolveSession(req)
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const user = await getTaskUserContext(session.adminId)

    const { id } = await params
    const existing = await sql`SELECT id, is_active, created_by FROM tasks WHERE id = ${id}`
    if (!existing.length) return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 })
    if (!existing[0].is_active) return NextResponse.json({ success: false, error: "Task is already disabled" }, { status: 409 })

    // Allow: explicit delete permission, super_admin, task_manager, or the task creator
    const isCreator = existing[0].created_by === session.adminId
    const canDelete =
      user.permissions.includes("tasks_mgmt:delete") ||
      user.roles.includes("super_admin") ||
      user.roles.includes("task_manager") ||
      isCreator
    if (!canDelete) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 })
    }

    await sql`UPDATE tasks SET is_active = FALSE, updated_at = NOW() WHERE id = ${id}`

    await logTaskChange({
      taskId: id,
      changedBy: session.adminId,
      fieldName: "is_active",
      oldValue: "true",
      newValue: "false",
      action: "disabled",
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("DELETE /api/admin/employees/tasks/[id]:", err)
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 })
  }
}
