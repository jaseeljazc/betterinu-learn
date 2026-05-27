/**
 * lib/permissions.ts — RBAC helpers (server-safe, no DOM imports).
 */
import type {
  AdminRole,
  Permission,
  PermissionModule,
  PermissionAction,
} from "@/types"

/**
 * Returns true when the given role has the requested permission.
 * super_admin always passes — the DB is the fallback, not the gate.
 *
 * Accepts both the full Permission shape (from DB queries) and the
 * compact {m, a} shape (from the __rbac cookie) so callers don't need
 * to normalise before checking.
 */
export function hasPermission(
  role: AdminRole,
  permissions: Array<Permission | { m: string; a: string }>,
  module: PermissionModule,
  action: PermissionAction
): boolean {
  if (role === "super_admin") return true
  return permissions.some((p) => {
    // Full shape: { module, action }
    if ("module" in p) return p.module === module && p.action === action
    // Compact shape: { m, a }
    return p.m === module && p.a === action
  })
}

type PermissionPair = { module: PermissionModule; action: PermissionAction }

/**
 * Returns the default permission set for a given role.
 * Mirrors the seed data in scripts/seed-rbac.ts exactly.
 * Kept in sync with migrations/016_sync_permissions.sql.
 */
export function getDefaultPermissions(role: AdminRole): PermissionPair[] {
  const ACTIONS: PermissionAction[] = ["view", "create", "edit", "delete"]
  const ALL_MODULES: PermissionModule[] = [
    "students", "courses", "curriculum", "tasks", "admins",
    "accounts", "employees", "payroll", "attendance",
  ]

  const all: PermissionPair[] = ALL_MODULES.flatMap((m) =>
    ACTIONS.map((a) => ({ module: m, action: a }))
  )

  switch (role) {
    case "super_admin":
      return all

    case "admin":
      // Full access to everything except the admins module
      return all.filter((p) => p.module !== "admins")

    case "instructor":
      return all.filter(
        (p) =>
          (["courses", "curriculum", "tasks"] as PermissionModule[]).includes(p.module) ||
          (p.module === "students" && p.action === "view") ||
          (p.module === "employees" && p.action === "view") ||
          (p.module === "attendance" && (["view", "create"] as PermissionAction[]).includes(p.action))
      )

    case "support":
      // Read-only on all relevant modules
      return (
        ["students", "courses", "tasks", "employees", "attendance"] as PermissionModule[]
      ).map((m) => ({ module: m, action: "view" as PermissionAction }))

    case "account_manager":
      return [
        // Full accounts access
        ...ACTIONS.map((a) => ({ module: "accounts" as PermissionModule, action: a })),
        // Full payroll access
        ...ACTIONS.map((a) => ({ module: "payroll" as PermissionModule, action: a })),
        // View-only on employees and attendance
        { module: "employees" as PermissionModule, action: "view" as PermissionAction },
        { module: "attendance" as PermissionModule, action: "view" as PermissionAction },
      ]

    default:
      return []
  }
}
