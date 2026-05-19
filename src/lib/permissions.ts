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
 */
export function hasPermission(
  role: AdminRole,
  permissions: Permission[],
  module: PermissionModule,
  action: PermissionAction
): boolean {
  if (role === "super_admin") return true
  return permissions.some((p) => p.module === module && p.action === action)
}

type PermissionPair = { module: PermissionModule; action: PermissionAction }

/**
 * Returns the default permission set for a given role.
 * Mirrors the seed data in migrations/010_employees.sql exactly.
 */
export function getDefaultPermissions(role: AdminRole): PermissionPair[] {
  const all: PermissionPair[] = (
    ["students", "courses", "curriculum", "tasks", "admins", "accounts", "employees", "payroll", "attendance"] as PermissionModule[]
  ).flatMap((m) =>
    (["view", "create", "edit", "delete"] as PermissionAction[]).map((a) => ({
      module: m,
      action: a,
    }))
  )

  switch (role) {
    case "super_admin":
      return all

    case "admin":
      return all.filter((p) => p.module !== "admins")

    case "instructor":
      return all.filter(
        (p) =>
          (["courses", "curriculum", "tasks"] as PermissionModule[]).includes(p.module) ||
          (p.module === "students" && p.action === "view") ||
          (p.module === "employees" && p.action === "view") ||
          (p.module === "attendance" && ["view", "create"].includes(p.action))
      )

    case "support":
      return [
        { module: "students", action: "view" },
        { module: "courses", action: "view" },
        { module: "tasks", action: "view" },
        { module: "employees", action: "view" },
        { module: "attendance", action: "view" },
      ]

    case "account_manager":
      return [
        ...["view", "create", "edit", "delete"].map((a) => ({
          module: "accounts" as PermissionModule,
          action: a as PermissionAction,
        })),
        { module: "employees" as PermissionModule, action: "view" as PermissionAction },
        { module: "attendance" as PermissionModule, action: "view" as PermissionAction },
        ...["view", "create", "edit", "delete"].map((a) => ({
          module: "payroll" as PermissionModule,
          action: a as PermissionAction,
        })),
      ]

    default:
      return []
  }
}

