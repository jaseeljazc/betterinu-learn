/**
 * app/api/admin/employees/tasks/route.ts
 *
 * GET  /api/admin/employees/tasks — list tasks with full visibility rules and filters
 * POST /api/admin/employees/tasks — create task
 */
import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { resolveSession } from "@/lib/admin-rbac"
import { getTaskUserContext } from "@/lib/task-rbac"
import { buildTaskWhereClause } from "@/lib/task-permissions"
import { logTaskChange } from "@/lib/task-audit"

// ---------------------------------------------------------------------------
// GET /api/admin/employees/tasks
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const session = await resolveSession(req)
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const user = await getTaskUserContext(session.adminId)
    const { searchParams } = new URL(req.url)

    // ── Pagination ──────────────────────────────────────────────────────────
    const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10)))
    const offset = (page - 1) * limit

    // ── Filters ─────────────────────────────────────────────────────────────
    const status      = searchParams.get("status")
    const priority    = searchParams.get("priority")
    const type        = searchParams.get("type")
    const assignee    = searchParams.get("assignee")
    const projectId   = searchParams.get("project_id")
    const sprintId    = searchParams.get("sprint_id")
    const departmentId = searchParams.get("department_id")
    const search      = searchParams.get("search")
    const dueBefore   = searchParams.get("due_before")
    const dueAfter    = searchParams.get("due_after")
    // is_active filter only honoured when user has view_disabled or is a task_manager
    const isActiveParam = searchParams.get("is_active")
    const canViewDisabled =
      user.permissions.includes("tasks_mgmt:view_disabled") ||
      user.roles.includes("task_manager") ||
      user.roles.includes("super_admin")

    // ── Build visibility WHERE clause from Phase 2B ─────────────────────────
    const visibility = buildTaskWhereClause(user, 1, "t")
    const queryParams: any[] = [...visibility.params]
    let idx = queryParams.length + 1

    const filterClauses: string[] = []

    if (status) {
      filterClauses.push(`t.status = $${idx++}`)
      queryParams.push(status)
    }
    if (priority) {
      filterClauses.push(`t.priority = $${idx++}`)
      queryParams.push(priority)
    }
    if (type) {
      filterClauses.push(`t.type = $${idx++}`)
      queryParams.push(type)
    }
    if (assignee) {
      filterClauses.push(`t.assigned_to = $${idx++}`)
      queryParams.push(assignee)
    }
    if (projectId) {
      filterClauses.push(`t.project_id = $${idx++}`)
      queryParams.push(projectId)
    }
    if (sprintId) {
      filterClauses.push(`t.sprint_id = $${idx++}`)
      queryParams.push(sprintId)
    }
    if (departmentId) {
      filterClauses.push(`t.department_id = $${idx++}`)
      queryParams.push(departmentId)
    }
    if (search) {
      filterClauses.push(`(t.title ILIKE $${idx} OR t.description ILIKE $${idx} OR t.task_id ILIKE $${idx})`)
      idx++
      queryParams.push(`%${search}%`)
    }
    if (dueBefore) {
      filterClauses.push(`t.due_date <= $${idx++}`)
      queryParams.push(dueBefore)
    }
    if (dueAfter) {
      filterClauses.push(`t.due_date >= $${idx++}`)
      queryParams.push(dueAfter)
    }
    // Always apply an is_active filter. Privileged users can toggle it via
    // the "Show disabled tasks" checkbox; everyone else is locked to TRUE.
    if (canViewDisabled && (isActiveParam === "false" || isActiveParam === "true")) {
      filterClauses.push(`t.is_active = $${idx++}`)
      queryParams.push(isActiveParam === "true")
    } else {
      // Default: only active tasks
      filterClauses.push(`t.is_active = TRUE`)
    }

    const whereClauseStr = filterClauses.length > 0 
      ? `AND ${filterClauses.join(" AND ")}` 
      : ""

    const queryText = `
      SELECT
        t.id,
        t.task_id,
        t.title,
        t.description,
        t.note,
        t.type,
        t.status,
        t.priority,
        t.visibility,
        t.is_active,
        t.due_date,
        t.estimated_hours,
        t.logged_hours,
        t.self_assigned,
        t.self_assign_approval_status,
        t.self_assign_deadline,
        t.created_at,
        t.updated_at,
        t.completed_at,
        -- Project
        tp.id   AS project_id,
        tp.name AS project_name,
        -- Sprint
        ts.id   AS sprint_id,
        ts.name AS sprint_name,
        -- Department
        d.id   AS department_id,
        d.name AS department_name,
        -- People
        aa_created.id        AS created_by_id,
        aa_created.full_name AS created_by_name,
        aa_assigned.id        AS assigned_to_id,
        aa_assigned.full_name AS assigned_to_name,
        aa_reviewer.id        AS reviewer_id,
        aa_reviewer.full_name AS reviewer_name,
        -- Sub-task count
        COUNT(DISTINCT sub.id)::int AS subtask_count,
        -- Attachment count
        COUNT(DISTINCT ta.id)::int  AS attachment_count,
        -- Comment count
        COUNT(DISTINCT tc.id) FILTER (WHERE tc.is_active = TRUE)::int AS comment_count
      FROM tasks t
      LEFT JOIN task_projects  tp ON tp.id = t.project_id
      LEFT JOIN task_sprints   ts ON ts.id = t.sprint_id
      LEFT JOIN departments    d  ON d.id  = t.department_id
      LEFT JOIN admin_accounts aa_created  ON aa_created.id  = t.created_by
      LEFT JOIN admin_accounts aa_assigned ON aa_assigned.id = t.assigned_to
      LEFT JOIN admin_accounts aa_reviewer ON aa_reviewer.id = t.reviewer_id
      LEFT JOIN tasks          sub ON sub.parent_task_id = t.id AND sub.is_active = TRUE
      LEFT JOIN task_attachments ta ON ta.task_id = t.id
      LEFT JOIN task_comments    tc ON tc.task_id = t.id
      WHERE t.parent_task_id IS NULL
        AND (${visibility.sql})
        ${whereClauseStr}
      GROUP BY
        t.id, tp.id, tp.name, ts.id, ts.name,
        d.id, d.name,
        aa_created.id, aa_created.full_name,
        aa_assigned.id, aa_assigned.full_name,
        aa_reviewer.id, aa_reviewer.full_name
      ORDER BY t.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `

    const countQueryText = `
      SELECT COUNT(DISTINCT t.id)::int AS total
      FROM tasks t
      WHERE t.parent_task_id IS NULL
        AND (${visibility.sql})
        ${whereClauseStr}
    `

    // Run query with params
    const runParams = [...queryParams, limit, offset]
    const [rows, countRows] = await Promise.all([
      sql.query(queryText, runParams),
      sql.query(countQueryText, queryParams)
    ])

    const total = countRows[0]?.total ?? 0

    const tasks = rows.map((r) => ({
      id:                     r.id,
      taskId:                 r.task_id,
      title:                  r.title,
      description:            r.description,
      note:                   r.note,
      type:                   r.type,
      status:                 r.status,
      priority:               r.priority,
      visibility:             r.visibility,
      isActive:               r.is_active,
      dueDate:                r.due_date,
      estimatedHours:         r.estimated_hours,
      loggedHours:            r.logged_hours,
      selfAssigned:           r.self_assigned,
      selfAssignStatus:       r.self_assign_approval_status,
      selfAssignDeadline:     r.self_assign_deadline,
      createdAt:              r.created_at,
      updatedAt:              r.updated_at,
      completedAt:            r.completed_at,
      project:                r.project_id   ? { id: r.project_id,    name: r.project_name }    : null,
      sprint:                 r.sprint_id    ? { id: r.sprint_id,     name: r.sprint_name }     : null,
      department:             r.department_id ? { id: r.department_id, name: r.department_name } : null,
      createdBy:              r.created_by_id ? { id: r.created_by_id, fullName: r.created_by_name } : null,
      assignedTo:             r.assigned_to_id ? { id: r.assigned_to_id, fullName: r.assigned_to_name } : null,
      reviewer:               r.reviewer_id   ? { id: r.reviewer_id,   fullName: r.reviewer_name }   : null,
      subtaskCount:           r.subtask_count,
      attachmentCount:        r.attachment_count,
      commentCount:           r.comment_count,
    }))

    return NextResponse.json({
      success: true,
      data: tasks,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (err: any) {
    console.error("GET /api/admin/employees/tasks:", err)
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/employees/tasks
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const session = await resolveSession(req)
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const user = await getTaskUserContext(session.adminId)
    if (!user.permissions.includes("tasks_mgmt:create") && !user.roles.includes("super_admin")) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 })
    }

    const body = await req.json()
    const {
      title, description, note,
      type = "task", status = "todo", priority = "medium", visibility = "public",
      projectId, sprintId, departmentId, parentTaskId,
      assignedTo, reviewerId,
      dueDate, estimatedHours,
    } = body

    if (!title?.trim()) {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 })
    }

    // Validate enums
    const VALID_TYPES      = ["bug", "feature", "task"]
    const VALID_STATUSES   = ["todo", "doing", "completed"]
    const VALID_PRIORITIES = ["low", "medium", "high", "critical"]
    const VALID_VISIBILITIES = ["public", "private", "confidential"]

    if (!VALID_TYPES.includes(type))           return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 })
    if (!VALID_STATUSES.includes(status))      return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 })
    if (!VALID_PRIORITIES.includes(priority))  return NextResponse.json({ success: false, error: "Invalid priority" }, { status: 400 })
    if (!VALID_VISIBILITIES.includes(visibility)) return NextResponse.json({ success: false, error: "Invalid visibility" }, { status: 400 })

    // Any user can set assignedTo
    const resolvedAssignee = assignedTo ?? null

    console.log("[DEBUG POST TASK] assignedTo from body:", assignedTo, "resolvedAssignee:", resolvedAssignee)

    const rows = await sql`
      INSERT INTO tasks (
        title, description, note, type, status, priority, visibility,
        project_id, sprint_id, department_id, parent_task_id,
        created_by, assigned_by, assigned_to, reviewer_id,
        due_date, estimated_hours
      ) VALUES (
        ${title.trim()}, ${description ?? null}, ${note ?? null},
        ${type}::task_type, ${status}::task_status, ${priority}::task_priority, ${visibility}::task_visibility,
        ${projectId ?? null}, ${sprintId ?? null}, ${departmentId ?? null}, ${parentTaskId ?? null},
        ${session.adminId},
        ${resolvedAssignee ? session.adminId : null},
        ${resolvedAssignee || null},
        ${reviewerId || null},
        ${dueDate ?? null}, ${estimatedHours ?? null}
      )
      RETURNING id, task_id, title, created_at
    `

    const newTask = rows[0]

    await logTaskChange({
      taskId: newTask.id as string,
      changedBy: session.adminId,
      fieldName: "task",
      oldValue: null,
      newValue: newTask.task_id as string,
      action: "created",
    })

    return NextResponse.json({ success: true, data: newTask }, { status: 201 })
  } catch (err: any) {
    console.error("POST /api/admin/employees/tasks:", err)
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 })
  }
}
