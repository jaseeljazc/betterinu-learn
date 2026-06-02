import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import { getPageSession } from "@/lib/server-session"
import { hasPermission, canViewTasks } from "@/lib/permissions"
import { sql } from "@/lib/db"
import { TaskForm, type TaskFormTask } from "@/components/tasks/task-form"
import { TaskDetailView } from "@/components/tasks/task-detail-view"
import { generateViewPresignedUrl, generateDownloadPresignedUrl } from "@/lib/s3-private"
import Link from "next/link"
import { ArrowLeft, CheckSquare } from "lucide-react"

type TaskDetailPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ edit?: string }>
}

export default async function TaskDetailPage({
  params,
  searchParams,
}: TaskDetailPageProps) {
  const session = await getPageSession()
  if (!session) redirect("/admin/login")
  if (!canViewTasks(session.role, session.permissions)) {
    redirect("/admin/tasks/list")
  }

  const { id } = await params
  const { edit } = await searchParams

  // Fetch the core task
  const rows = await sql`
    SELECT
      t.id, t.task_id, t.title, t.description, t.note,
      t.type, t.status, t.priority, t.visibility, t.is_active,
      t.due_date, t.estimated_hours, t.logged_hours,
      t.self_assigned, t.self_assign_approval_status, t.self_assign_deadline,
      t.created_at, t.updated_at, t.completed_at,
      t.project_id, t.sprint_id, t.department_id, t.parent_task_id,
      t.assigned_to, t.assigned_by, t.reviewer_id,
      t.created_by,
      tp.id AS project_id_val, tp.name AS project_name,
      ts.id AS sprint_id_val,  ts.name AS sprint_name,
      d.id  AS dept_id,        d.name  AS dept_name,
      aa_c.id AS created_by_id,  aa_c.full_name AS created_by_name,
      aa_a.id AS assigned_to_id, aa_a.full_name AS assigned_to_name,
      aa_ab.id AS assigned_by_id, aa_ab.full_name AS assigned_by_name,
      aa_r.id AS reviewer_id_val, aa_r.full_name AS reviewer_name,
      parent.id AS parent_id, parent.task_id AS parent_task_ref, parent.title AS parent_title,
      me.full_name AS current_user_name
    FROM tasks t
    LEFT JOIN task_projects  tp     ON tp.id = t.project_id
    LEFT JOIN task_sprints   ts     ON ts.id = t.sprint_id
    LEFT JOIN departments    d      ON d.id  = t.department_id
    LEFT JOIN admin_accounts aa_c   ON aa_c.id  = t.created_by
    LEFT JOIN admin_accounts aa_a   ON aa_a.id  = t.assigned_to
    LEFT JOIN admin_accounts aa_ab  ON aa_ab.id = t.assigned_by
    LEFT JOIN admin_accounts aa_r   ON aa_r.id  = t.reviewer_id
    LEFT JOIN tasks          parent ON parent.id = t.parent_task_id
    CROSS JOIN (
      SELECT full_name FROM admin_accounts WHERE id = ${session.adminId}
    ) me
    WHERE t.id = ${id}
  `

  if (!rows.length) notFound()
  const task = rows[0]

  // Basic permission check: view_own means they must be a party unless they have view_all
  const hasViewAll = hasPermission(session.role, session.permissions, "tasks_mgmt", "view_all")
  const hasViewTeam = hasPermission(session.role, session.permissions, "tasks_mgmt", "view_team")
  const isParty =
    task.assigned_to_id === session.adminId ||
    task.created_by_id === session.adminId ||
    task.reviewer_id_val === session.adminId
  const isUnassignedPublic = task.assigned_to_id === null && task.visibility === "public"

  if (!hasViewAll && !hasViewTeam && !isParty && !isUnassignedPublic) {
    redirect("/admin/tasks/list")
  }

  const canSelfAssign = hasPermission(session.role, session.permissions, "tasks_mgmt", "self_assign")

  const canEdit =
    hasPermission(session.role, session.permissions, "tasks_mgmt", "edit_any") ||
    (hasPermission(session.role, session.permissions, "tasks_mgmt", "edit_own") && isParty)

  const canViewAudit = hasPermission(session.role, session.permissions, "tasks_mgmt", "view_audit_log")

  const currentUserName = (task.current_user_name as string) ?? "You"

  const attachmentRows = await sql`
    SELECT ta.id, ta.file_name, ta.file_size_bytes
    FROM task_attachments ta
    WHERE ta.task_id = ${id}
    ORDER BY ta.uploaded_at DESC
  `

  // ── Show edit form if ?edit=1 ─────────────────────────────────────────────
  if (edit === "1" && canEdit) {
    const formTask: TaskFormTask = {
      id: task.id as string,
      title: task.title as string,
      description: task.description as string | null,
      note: task.note as string | null,
      type: task.type as string,
      priority: task.priority as string,
      status: task.status as string,
      visibility: task.visibility as string,
      departmentId: task.dept_id as string | null,
      projectId: task.project_id_val as string | null,
      sprintId: task.sprint_id_val as string | null,
      parentTaskId: task.parent_task_id as string | null,
      parentTask: task.parent_id
        ? { id: task.parent_id as string, taskId: task.parent_task_ref as string, title: task.parent_title as string }
        : null,
      assignedTo: task.assigned_to_id as string | null,
      assignedBy: task.assigned_by_id as string | null,
      reviewerId: task.reviewer_id_val as string | null,
      dueDate: task.due_date
        ? (() => {
          const d = task.due_date
          if (d instanceof Date) {
            const year = d.getFullYear()
            const month = String(d.getMonth() + 1).padStart(2, "0")
            const day = String(d.getDate()).padStart(2, "0")
            return `${year}-${month}-${day}`
          }
          const s = String(d)
          if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
          if (s.includes("T")) return s.split("T")[0]
          const parsed = new Date(s)
          if (isNaN(parsed.getTime())) return null
          const year = parsed.getFullYear()
          const month = String(parsed.getMonth() + 1).padStart(2, "0")
          const day = String(parsed.getDate()).padStart(2, "0")
          return `${year}-${month}-${day}`
        })()
        : null,
      estimatedHours: task.estimated_hours != null ? Number(task.estimated_hours) : null,
      existingAttachments: attachmentRows.map(a => ({
        id: a.id as string,
        fileName: a.file_name as string,
        fileSizeBytes: a.file_size_bytes != null ? Number(a.file_size_bytes) : null,
      })),
    }

    return (
      <div className="w-full">
        <div className="mb-8">
          <Link
            href={`/admin/tasks/${id}`}
            className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="size-4" /> Back to Task Detail
          </Link>
          <div className="flex items-center gap-3 mb-1">
            <CheckSquare className="size-6 text-primary" />
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Editing: {task.task_id as string}
            </h1>
          </div>
          <p className="text-sm text-secondary">{task.title as string}</p>
        </div>

        <TaskForm
          task={formTask}
          currentUserId={session.adminId}
          currentUserName={currentUserName}
          parentExcludeId={id}
        />
      </div>
    )
  }

  const subtaskRows = await sql`
    SELECT t.id, t.task_id, t.title, t.status, t.priority, t.is_active,
           aa.id AS assigned_to_id, aa.full_name AS assigned_to_name
    FROM tasks t
    LEFT JOIN admin_accounts aa ON aa.id = t.assigned_to
    WHERE t.parent_task_id = ${id} AND t.is_active = TRUE
    ORDER BY t.created_at ASC
  `

  const fullAttachmentRows = await sql`
    SELECT ta.id, ta.file_name, ta.file_key, ta.file_size_bytes, ta.mime_type, ta.uploaded_at,
           aa.id AS uploaded_by_id, aa.full_name AS uploaded_by_name
    FROM task_attachments ta
    LEFT JOIN admin_accounts aa ON aa.id = ta.uploaded_by
    WHERE ta.task_id = ${id}
    ORDER BY ta.uploaded_at DESC
  `

  const attachments = await Promise.all(
    fullAttachmentRows.map(async (a) => ({
      id: a.id as string,
      fileName: a.file_name as string,
      fileSizeBytes: a.file_size_bytes != null ? Number(a.file_size_bytes) : null,
      mimeType: (a.mime_type as string | null) ?? null,
      uploadedAt: a.uploaded_at as string,
      uploadedBy: a.uploaded_by_id
        ? { id: a.uploaded_by_id as string, fullName: a.uploaded_by_name as string }
        : null,
      presignedUrl: a.file_key
        ? await generateViewPresignedUrl(a.file_key as string).catch(() => null)
        : null,
      downloadUrl: a.file_key
        ? await generateDownloadPresignedUrl(a.file_key as string, a.file_name as string).catch(() => null)
        : null,
    }))
  )

  // ── Count comments (for display; comments themselves loaded client-side) ──
  const countRows = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM task_comments WHERE task_id = ${id} AND is_active = TRUE) AS comment_count,
      (SELECT COUNT(*)::int FROM tasks          WHERE parent_task_id = ${id} AND is_active = TRUE) AS subtask_count,
      (SELECT COUNT(*)::int FROM task_attachments WHERE task_id = ${id}) AS attachment_count
  `
  const counts = countRows[0]

  // ── Full task detail object ───────────────────────────────────────────────
  const taskDetail = {
    id: task.id as string,
    taskId: task.task_id as string,
    title: task.title as string,
    description: (task.description as string | null) ?? null,
    note: (task.note as string | null) ?? null,
    type: task.type as string,
    status: task.status as string,
    priority: task.priority as string,
    visibility: task.visibility as string,
    isActive: task.is_active as boolean,
    dueDate: task.due_date ? String(task.due_date) : null,
    estimatedHours: task.estimated_hours != null ? Number(task.estimated_hours) : null,
    loggedHours: task.logged_hours != null ? Number(task.logged_hours) : null,
    selfAssigned: (task.self_assigned as boolean | null) ?? false,
    selfAssignStatus: (task.self_assign_approval_status as string | null) ?? null,
    selfAssignDeadline: task.self_assign_deadline ? String(task.self_assign_deadline) : null,
    createdAt: task.created_at as string,
    updatedAt: task.updated_at as string,
    completedAt: task.completed_at ? String(task.completed_at) : null,
    project: task.project_id_val ? { id: task.project_id_val as string, name: task.project_name as string } : null,
    sprint: task.sprint_id_val ? { id: task.sprint_id_val as string, name: task.sprint_name as string } : null,
    department: task.dept_id ? { id: task.dept_id as string, name: task.dept_name as string } : null,
    parentTask: task.parent_id
      ? { id: task.parent_id as string, taskId: task.parent_task_ref as string, title: task.parent_title as string }
      : null,
    createdBy: task.created_by_id ? { id: task.created_by_id as string, fullName: task.created_by_name as string } : null,
    assignedTo: task.assigned_to_id ? { id: task.assigned_to_id as string, fullName: task.assigned_to_name as string } : null,
    assignedBy: task.assigned_by_id ? { id: task.assigned_by_id as string, fullName: task.assigned_by_name as string } : null,
    reviewer: task.reviewer_id_val ? { id: task.reviewer_id_val as string, fullName: task.reviewer_name as string } : null,
    subtasks: subtaskRows.map((s) => ({
      id: s.id as string,
      taskId: s.task_id as string,
      title: s.title as string,
      status: s.status as string,
      assignedTo: s.assigned_to_id
        ? { id: s.assigned_to_id as string, fullName: s.assigned_to_name as string }
        : null,
    })),
    attachments,
    commentCount: Number(counts?.comment_count ?? 0),
    subtaskCount: Number(counts?.subtask_count ?? 0),
    attachmentCount: Number(counts?.attachment_count ?? 0),
  }

  const canDelete = hasPermission(session.role, session.permissions, "tasks_mgmt", "delete")
  const canManageAttachments = hasPermission(session.role, session.permissions, "tasks_mgmt", "manage_attachments")

  return (
    <TaskDetailView
      task={taskDetail}
      canEdit={canEdit}
      canDelete={canDelete}
      canManageAttachments={canManageAttachments}
      canViewAudit={canViewAudit}
      canSelfAssign={canSelfAssign}
      currentUserName={currentUserName}
      currentUserId={session.adminId}
    />
  )
}
