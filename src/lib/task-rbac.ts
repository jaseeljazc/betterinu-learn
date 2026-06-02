/**
 * lib/task-rbac.ts — Task-specific RBAC helpers (server-only).
 *
 * Provides per-request cached lookups of an admin account's roles and
 * permissions, plus typed helpers for checking task management access.
 *
 * Uses React's `cache()` to deduplicate DB calls within a single RSC render
 * pass. Each Next.js request gets a fresh cache — no cross-request leakage.
 *
 * Server-only — never import from client components.
 */
import { cache } from "react"
import { sql } from "@/lib/db"

export type TaskUserContext = {
  /** admin_accounts.id */
  id: string
  roles: string[]
  /** Flat permission strings: "tasks_mgmt:view_all" etc. */
  permissions: string[]
  /** employees.department_id — null if no employee record linked */
  departmentId: string | null
}

// ---------------------------------------------------------------------------
// getUserRolesAndPermissions
// ---------------------------------------------------------------------------

/**
 * Returns the full set of roles and flat permission strings for an admin
 * account. Cached per-request via React cache() — safe to call many times.
 *
 * Permissions are returned as "module:action" strings (e.g. "tasks_mgmt:view_all").
 */
export const getUserRolesAndPermissions = cache(
  async (
    adminAccountId: string
  ): Promise<{ roles: string[]; permissions: string[] }> => {
    const rows = await sql`
      SELECT
        json_agg(DISTINCT ar.name) FILTER (WHERE ar.id IS NOT NULL) AS role_names,
        COALESCE(
          json_agg(
            DISTINCT (p.module || ':' || p.action)
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) AS permissions
      FROM admin_accounts aa
      JOIN admin_account_roles aar ON aar.admin_account_id = aa.id
      JOIN admin_roles ar          ON ar.id = aar.role_id
      LEFT JOIN admin_role_permissions arp ON arp.role_id = ar.id
      LEFT JOIN permissions p              ON p.id = arp.permission_id
      WHERE aa.id = ${adminAccountId}
        AND aa.status = 'active'
      GROUP BY aa.id
    `

    if (!rows.length) return { roles: [], permissions: [] }

    const roles = (rows[0].role_names as string[]) ?? []
    const permissions = (rows[0].permissions as string[]) ?? []

    // super_admin always gets all task permissions implicitly
    const resolvedPerms =
      roles.includes("super_admin") &&
      !permissions.includes("tasks_mgmt:view_all")
        ? [...permissions, "tasks_mgmt:view_all", "tasks_mgmt:view_disabled"]
        : permissions

    return { roles, permissions: resolvedPerms }
  }
)

// ---------------------------------------------------------------------------
// getTaskUserContext
// ---------------------------------------------------------------------------

/**
 * Returns roles, permissions, AND the linked employee's department_id so
 * visibility rules can scope to team/department without extra round-trips.
 * Cached per-request.
 */
export const getTaskUserContext = cache(
  async (adminAccountId: string): Promise<TaskUserContext> => {
    const { roles, permissions } = await getUserRolesAndPermissions(adminAccountId)

    // Fetch department_id from the linked employee record (may not exist)
    const empRows = await sql`
      SELECT department_id
      FROM employees
      WHERE admin_account_id = ${adminAccountId}
      LIMIT 1
    `
    const departmentId =
      empRows.length > 0 ? (empRows[0].department_id as string | null) : null

    return { id: adminAccountId, roles, permissions, departmentId }
  }
)

// ---------------------------------------------------------------------------
// hasPermission (async, by account ID)
// ---------------------------------------------------------------------------

/**
 * Returns true if the admin account holds the given "module:action" permission.
 * super_admin always passes.
 */
export async function hasTaskPermission(
  adminAccountId: string,
  permission: string
): Promise<boolean> {
  const { roles, permissions } = await getUserRolesAndPermissions(adminAccountId)
  if (roles.includes("super_admin")) return true
  return permissions.includes(permission)
}

// ---------------------------------------------------------------------------
// hasAnyRole (async, by account ID)
// ---------------------------------------------------------------------------

/**
 * Returns true if the admin account holds at least one of the given role names.
 */
export async function hasAnyRole(
  adminAccountId: string,
  roleNames: string[]
): Promise<boolean> {
  const { roles } = await getUserRolesAndPermissions(adminAccountId)
  return roleNames.some((r) => roles.includes(r))
}
