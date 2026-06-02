/**
 * lib/task-permissions.ts — Task visibility SQL WHERE clause builder.
 *
 * Called by every task-listing query to enforce per-user visibility rules
 * based on their RBAC permissions and visibility column value.
 *
 * Rules (applied in priority order):
 *   1. is_active filter — always TRUE unless user has tasks_mgmt:view_disabled
 *   2. Scope filter — view_all / view_team / view_own
 *      + Unassigned public tasks are included in every scope tier only when the
 *        viewer belongs to the same department (or is super_admin/task_manager).
 *   3. Visibility column — private / confidential visibility gates
 *      + public: only visible to users in the same department as the task
 *        (t.department_id match). super_admin and task_manager bypass this.
 *
 * Returns a raw SQL fragment string (parameterised values are injected
 * separately by the caller to avoid SQL injection).
 *
 * Server-only — never import from client components.
 */
import type { TaskUserContext } from "@/lib/task-rbac"

export type TaskWhereClause = {
  /**
   * SQL fragment to embed directly after "WHERE " in a task query.
   * Already includes the is_active guard and visibility restrictions.
   * Uses $1, $2, … placeholders matching `params`.
   */
  sql: string
  /** Positional parameter values corresponding to $N placeholders. */
  params: (string | boolean | null)[]
}

/**
 * Builds a parameterised WHERE clause enforcing task visibility for `user`.
 *
 * @param user - The resolved TaskUserContext for the current request.
 * @param startIndex - First $N placeholder index (default 1). Increment when
 *                     the caller already has bound parameters before this clause.
 */
export function buildTaskWhereClause(
  user: TaskUserContext,
  startIndex = 1,
  tableAlias = "tasks"
): TaskWhereClause {
  const { id, roles, permissions } = user
  const params: (string | boolean | null)[] = []
  const parts: string[] = []
  let idx = startIndex

  const has = (perm: string) => permissions.includes(perm)
  const isSuperAdmin = roles.includes("super_admin")
  const isTaskManager =
    roles.includes("task_manager") || roles.includes("super_admin")

  // ── 1. Active / disabled filter ───────────────────────────────────────────
  if (has("tasks_mgmt:view_disabled")) {
    // Can see both active and disabled — no is_active restriction
    // But for reviewer role: disabled tasks only where they are reviewer_id
    if (roles.includes("reviewer") && !isSuperAdmin && !isTaskManager) {
      parts.push(
        `(${tableAlias}.is_active = TRUE OR ${tableAlias}.reviewer_id = $${idx++})`
      )
      params.push(id)
    }
    // task_manager and super_admin see everything — no extra constraint needed
  } else {
    // Everyone else: active tasks only
    parts.push(`${tableAlias}.is_active = TRUE`)
  }

  // ── 2. Scope filter (view_all / view_team / view_own) ────────────────────
  if (has("tasks_mgmt:view_all")) {
    // No additional scope restriction — user sees all tasks within is_active gate
  } else if (has("tasks_mgmt:view_team")) {
    // Restrict to tasks in the user's department OR personally assigned/created
    // OR unassigned public tasks in the same department (so they can be claimed)
    if (user.departmentId) {
      parts.push(
        `(${tableAlias}.department_id = $${idx++} OR ${tableAlias}.assigned_to = $${idx++} OR ${tableAlias}.created_by = $${idx++} OR (${tableAlias}.assigned_to IS NULL AND ${tableAlias}.visibility = 'public' AND ${tableAlias}.department_id = $${idx++}))`
      )
      params.push(user.departmentId, id, id, user.departmentId)
    } else {
      // No department linked — fall back to personal scope only (cannot match dept)
      parts.push(
        `(${tableAlias}.assigned_to = $${idx++} OR ${tableAlias}.created_by = $${idx++})`
      )
      params.push(id, id)
    }
  } else {
    // view_own or no explicit tasks_mgmt permission — personal tasks only
    // Unassigned public tasks in the same department are visible so they can be claimed
    if (user.departmentId) {
      parts.push(
        `(${tableAlias}.assigned_to = $${idx++} OR ${tableAlias}.created_by = $${idx++} OR (${tableAlias}.assigned_to IS NULL AND ${tableAlias}.visibility = 'public' AND ${tableAlias}.department_id = $${idx++}))`
      )
      params.push(id, id, user.departmentId)
    } else {
      parts.push(
        `(${tableAlias}.assigned_to = $${idx++} OR ${tableAlias}.created_by = $${idx++})`
      )
      params.push(id, id)
    }
  }

  // ── 3. Visibility column gate ────────────────────────────────────────────
  // public: visible only to users in the same department (t.department_id match)
  //         super_admin and task_manager bypass this restriction
  // private: only assigned_to, created_by, reviewer_id, or view_all holders
  // confidential: only view_all holders + super_admin / task_manager roles
  if (isSuperAdmin || isTaskManager || has("tasks_mgmt:view_all")) {
    // No visibility restriction — these roles can see everything
  } else {
    // Build a compound visibility filter:
    //   - public tasks: visible only when dept matches (or user is a party)
    //   - private tasks: only if user is a party to the task
    //   - confidential tasks: not visible at all to this tier
    if (user.departmentId) {
      parts.push(
        `(
          (
            ${tableAlias}.visibility = 'public'
            AND (
              ${tableAlias}.department_id = $${idx++}
              OR ${tableAlias}.assigned_to = $${idx++}
              OR ${tableAlias}.created_by = $${idx++}
            )
          )
          OR (
            ${tableAlias}.visibility = 'private'
            AND (
              ${tableAlias}.assigned_to = $${idx++}
              OR ${tableAlias}.created_by = $${idx++}
              OR ${tableAlias}.reviewer_id = $${idx++}
            )
          )
        )`
      )
      params.push(user.departmentId, id, id, id, id, id)
    } else {
      // No department — user can only see tasks they are a direct party to
      parts.push(
        `(
          (
            ${tableAlias}.visibility = 'public'
            AND (
              ${tableAlias}.assigned_to = $${idx++}
              OR ${tableAlias}.created_by = $${idx++}
            )
          )
          OR (
            ${tableAlias}.visibility = 'private'
            AND (
              ${tableAlias}.assigned_to = $${idx++}
              OR ${tableAlias}.created_by = $${idx++}
              OR ${tableAlias}.reviewer_id = $${idx++}
            )
          )
        )`
      )
      params.push(id, id, id, id, id)
    }
  }

  const sqlFragment = parts.length > 0 ? parts.join(" AND ") : "TRUE"

  return { sql: sqlFragment, params }
}
