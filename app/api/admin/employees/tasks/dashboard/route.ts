/**
 * app/api/admin/employees/tasks/dashboard/route.ts
 *
 * GET /api/admin/employees/tasks/dashboard
 * Returns aggregate stats: tasks by status, overdue count, per-assignee,
 * per-project, history trends, and sprint burndown.
 * Supports filters: departmentId, projectId, dateFrom, dateTo
 * Requires tasks_mgmt:view_dashboard
 */
import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { resolveSession } from "@/lib/admin-rbac"
import { getTaskUserContext } from "@/lib/task-rbac"
import { buildTaskWhereClause } from "@/lib/task-permissions"

export async function GET(req: NextRequest) {
  try {
    const session = await resolveSession(req)
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

    const user = await getTaskUserContext(session.adminId)
    if (!user.permissions.includes("tasks_mgmt:view_dashboard") && !user.roles.includes("super_admin")) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 })
    }

    const searchParams = req.nextUrl.searchParams
    const departmentId = searchParams.get("departmentId")
    const projectId = searchParams.get("projectId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    // Visibility clause
    const vis = buildTaskWhereClause(user, 1, "t")

    const baseParams = [...vis.params]
    let baseIdx = baseParams.length + 1

    const filterClauses: string[] = ["t.is_active = TRUE"]
    if (departmentId) {
      filterClauses.push(`t.department_id = $${baseIdx++}`)
      baseParams.push(departmentId)
    }
    if (projectId) {
      filterClauses.push(`t.project_id = $${baseIdx++}`)
      baseParams.push(projectId)
    }
    if (dateFrom) {
      filterClauses.push(`t.due_date >= $${baseIdx++}`)
      baseParams.push(dateFrom)
    }
    if (dateTo) {
      filterClauses.push(`t.due_date <= $${baseIdx++}`)
      baseParams.push(dateTo)
    }

    const filtersSql = filterClauses.join(" AND ")

    // ── 1. Summary Cards ────────────────────────────────────────────────────
    const summaryRows = await sql.query(`
      SELECT
        COUNT(*)::int AS total_active,
        COUNT(*) FILTER (WHERE status != 'completed' AND due_date < NOW())::int AS overdue,
        COUNT(*) FILTER (WHERE status = 'completed' AND completed_at >= DATE_TRUNC('week', NOW()))::int AS completed_this_week,
        COUNT(*) FILTER (WHERE assigned_to IS NULL AND status != 'completed')::int AS backlog
      FROM tasks t
      WHERE ${filtersSql} AND (${vis.sql})
    `, baseParams)

    // ── 2. Tasks by status (donut chart source) ─────────────────────────────
    const statusRows = await sql.query(`
      SELECT status, COUNT(*)::int AS count
      FROM tasks t
      WHERE ${filtersSql} AND (${vis.sql})
      GROUP BY status
    `, baseParams)
    const statusMap: Record<string, number> = {}
    for (const r of statusRows) statusMap[r.status as string] = r.count as number

    // ── 3. Tasks by priority (vertical bar chart source) ────────────────────
    const priorityRows = await sql.query(`
      SELECT priority, COUNT(*)::int AS count
      FROM tasks t
      WHERE ${filtersSql} AND (${vis.sql})
      GROUP BY priority
    `, baseParams)
    const priorityMap: Record<string, number> = {}
    for (const r of priorityRows) priorityMap[r.priority as string] = r.count as number

    // ── 4. Workload per person (horizontal bar chart source - active top 10) ─
    const assigneeRows = await sql.query(`
      SELECT
        aa.id,
        aa.full_name,
        COUNT(t.id)::int AS count
      FROM tasks t
      JOIN admin_accounts aa ON aa.id = t.assigned_to
      WHERE ${filtersSql} AND t.status != 'completed' AND (${vis.sql})
      GROUP BY aa.id, aa.full_name
      ORDER BY count DESC
      LIMIT 10
    `, baseParams)

    // ── 5. Tasks created vs completed over last 30 days (line chart source) ─
    const historyRows = await sql.query(`
      WITH days AS (
        SELECT GENERATE_SERIES(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day')::date AS day
      )
      SELECT
        days.day,
        (SELECT COUNT(*)::int FROM tasks t WHERE t.is_active = TRUE AND t.created_at::date = days.day AND (${vis.sql})) AS created_count,
        (SELECT COUNT(*)::int FROM tasks t WHERE t.is_active = TRUE AND t.completed_at::date = days.day AND (${vis.sql})) AS completed_count
      FROM days
      ORDER BY days.day ASC
    `, vis.params)

    // ── 6. Sprint burndown ──────────────────────────────────────────────────
    let burndownData = null
    const targetProjectId = projectId || (await sql`SELECT id FROM task_projects WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1`)[0]?.id

    if (targetProjectId) {
      const activeSprintRows = await sql`
        SELECT id, name, start_date, end_date
        FROM task_sprints
        WHERE project_id = ${targetProjectId} AND is_active = TRUE
        ORDER BY start_date ASC
        LIMIT 1
      `
      if (activeSprintRows.length) {
        const sprint = activeSprintRows[0]
        const snapshotRows = await sql`
          SELECT snapshot_date, total_tasks, completed_tasks, (total_tasks - completed_tasks) AS remaining_tasks
          FROM task_sprint_snapshots
          WHERE sprint_id = ${sprint.id}
          ORDER BY snapshot_date ASC
        `
        burndownData = {
          sprintName: sprint.name,
          startDate: sprint.start_date,
          endDate: sprint.end_date,
          series: snapshotRows.map((r) => ({
            date: new Date(r.snapshot_date as string).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
            totalTasks: r.total_tasks,
            completedTasks: r.completed_tasks,
            remainingTasks: r.remaining_tasks,
          })),
        }
      }
    }

    // ── 7. Overdue tasks list ───────────────────────────────────────────────
    const overdueListRows = await sql.query(`
      SELECT
        t.id,
        t.task_id,
        t.title,
        t.due_date,
        EXTRACT(DAY FROM NOW() - t.due_date)::int AS days_overdue,
        aa.full_name AS assignee_name
      FROM tasks t
      LEFT JOIN admin_accounts aa ON aa.id = t.assigned_to
      WHERE ${filtersSql} AND t.status != 'completed' AND t.due_date < NOW() AND (${vis.sql})
      ORDER BY days_overdue DESC
      LIMIT 15
    `, baseParams)

    // ── 8. Recent audit activity ────────────────────────────────────────────
    let auditRows: any[] = []
    if (user.permissions.includes("tasks_mgmt:view_audit_log") || user.roles.includes("super_admin")) {
      auditRows = await sql.query(`
        SELECT
          tal.id,
          tal.task_id,
          t.task_id AS task_ref,
          tal.changed_at,
          tal.field_name,
          tal.action,
          aa.full_name AS changed_by_name
        FROM task_audit_log tal
        JOIN tasks t ON t.id = tal.task_id
        LEFT JOIN admin_accounts aa ON aa.id = tal.changed_by
        WHERE t.is_active = TRUE AND (${vis.sql})
        ORDER BY tal.changed_at DESC
        LIMIT 20
      `, vis.params)
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalActiveTasks: summaryRows[0]?.total_active ?? 0,
          overdueTasks: summaryRows[0]?.overdue ?? 0,
          completedThisWeek: summaryRows[0]?.completed_this_week ?? 0,
          backlogCount: summaryRows[0]?.backlog ?? 0,
        },
        byStatus: {
          todo: statusMap["todo"] ?? 0,
          doing: statusMap["doing"] ?? 0,
          completed: statusMap["completed"] ?? 0,
        },
        byPriority: {
          low: priorityMap["low"] ?? 0,
          medium: priorityMap["medium"] ?? 0,
          high: priorityMap["high"] ?? 0,
          critical: priorityMap["critical"] ?? 0,
        },
        byAssignee: assigneeRows.map((r) => ({
          id: r.id,
          fullName: r.full_name,
          count: r.count,
        })),
        history30Days: historyRows.map((r) => ({
          date: new Date(r.day).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
          created: r.created_count,
          completed: r.completed_count,
        })),
        burndown: burndownData,
        overdueTasksList: overdueListRows.map((r) => ({
          id: r.id,
          taskId: r.task_id,
          title: r.title,
          dueDate: r.due_date,
          daysOverdue: r.days_overdue,
          assigneeName: r.assignee_name ?? "Unassigned",
        })),
        recentAudit: auditRows.map((r) => ({
          id: r.id,
          taskId: r.task_id,
          taskRef: r.task_ref,
          changedAt: r.changed_at,
          changedByName: r.changed_by_name ?? "System",
          action: r.action,
          fieldName: r.field_name,
        })),
      },
    })
  } catch (err: any) {
    console.error("GET /api/admin/employees/tasks/dashboard:", err)
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 })
  }
}
