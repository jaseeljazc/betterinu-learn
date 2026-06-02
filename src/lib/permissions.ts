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
 * super_admin and ceo always pass — the DB is the fallback, not the gate.
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
  if (role === "super_admin" || role === "ceo") return true
  return permissions.some((p) => {
    // Full shape: { module, action }
    if ("module" in p) return p.module === module && p.action === action
    // Compact shape: { m, a }
    return p.m === module && p.a === action
  })
}

type PermissionPair = { module: PermissionModule; action: PermissionAction }

const TASKS_MGMT_ACTIONS: PermissionAction[] = [
  "view_own",
  "view_team",
  "view_all",
  "view_disabled",
  "create",
  "edit_own",
  "edit_any",
  "delete",
  "assign",
  "self_assign",
  "manage_projects",
  "manage_sprints",
  "view_audit_log",
  "view_dashboard",
  "manage_attachments",
]

const tasksMgmtAll: PermissionPair[] = TASKS_MGMT_ACTIONS.map((a) => ({
  module: "tasks_mgmt" as PermissionModule,
  action: a,
}))

/**
 * Default tasks_mgmt permissions for regular staff roles.
 * view_own, create, edit_own, self_assign, manage_attachments
 */
const defaultTaskPerms: PermissionPair[] = [
  "view_own", "create", "edit_own", "self_assign", "manage_attachments",
].map((a) => ({ module: "tasks_mgmt" as PermissionModule, action: a as PermissionAction }))

/**
 * Returns the default permission set for a given role.
 * Mirrors the seed data in scripts/seed-rbac.ts exactly.
 * Kept in sync with migrations/025_update_roles.sql.
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
    case "ceo":
      return [...all, ...tasksMgmtAll]

    case "instructor":
      return [
        ...all.filter(
          (p) =>
            (["courses", "curriculum", "tasks"] as PermissionModule[]).includes(p.module) ||
            (p.module === "students" && p.action === "view") ||
            (p.module === "employees" && p.action === "view") ||
            (p.module === "attendance" && (["view", "create"] as PermissionAction[]).includes(p.action))
        ),
        ...defaultTaskPerms,
      ]

    case "account_manager":
      return [
        ...ACTIONS.map((a) => ({ module: "accounts" as PermissionModule, action: a })),
        ...ACTIONS.map((a) => ({ module: "payroll" as PermissionModule, action: a })),
        { module: "employees" as PermissionModule, action: "view" as PermissionAction },
        { module: "attendance" as PermissionModule, action: "view" as PermissionAction },
        ...defaultTaskPerms,
      ]

    case "task_manager":
      return [
        ...[
          "view_all", "view_disabled", "create", "edit_any", "assign", "manage_projects", "manage_sprints",
          "view_dashboard", "manage_attachments", "view_audit_log",
        ].map((a) => ({ module: "tasks_mgmt" as PermissionModule, action: a as PermissionAction })),
      ]

    case "reviewer":
      return [
        ...[
          "view_team", "view_disabled", "edit_own", "view_audit_log",
        ].map((a) => ({ module: "tasks_mgmt" as PermissionModule, action: a as PermissionAction })),
      ]

    case "hr_manager":
      return [
        ...all.filter((p) => ["employees", "payroll", "attendance"].includes(p.module)),
        ...defaultTaskPerms,
      ]

    case "developer":
      return [
        { module: "courses" as PermissionModule, action: "view" as PermissionAction },
        { module: "curriculum" as PermissionModule, action: "view" as PermissionAction },
        ...defaultTaskPerms,
      ]

    case "marketing_staff":
      return [
        { module: "students" as PermissionModule, action: "view" as PermissionAction },
        { module: "courses" as PermissionModule, action: "view" as PermissionAction },
        ...defaultTaskPerms,
      ]

    case "sales_staff":
      return [
        { module: "students" as PermissionModule, action: "view" as PermissionAction },
        { module: "students" as PermissionModule, action: "create" as PermissionAction },
        { module: "courses" as PermissionModule, action: "view" as PermissionAction },
        { module: "accounts" as PermissionModule, action: "view" as PermissionAction },
        ...defaultTaskPerms,
      ]

    case "department_head":
      // Supplementary role — always paired with a base role.
      // Adds elevated tasks_mgmt visibility + employee/attendance view.
      return [
        ...[
          "view_team", "view_audit_log", "view_dashboard", "assign", "edit_any",
        ].map((a) => ({ module: "tasks_mgmt" as PermissionModule, action: a as PermissionAction })),
        { module: "employees" as PermissionModule, action: "view" as PermissionAction },
        { module: "attendance" as PermissionModule, action: "view" as PermissionAction },
      ]

    default:
      return []
  }
}

export function canViewTasks(
  role: AdminRole,
  permissions: Array<Permission | { m: string; a: string }>
): boolean {
  if (role === "super_admin" || role === "ceo") return true
  return (
    hasPermission(role, permissions, "tasks_mgmt", "view_own") ||
    hasPermission(role, permissions, "tasks_mgmt", "view_team") ||
    hasPermission(role, permissions, "tasks_mgmt", "view_all") ||
    hasPermission(role, permissions, "tasks_mgmt", "view") ||
    hasPermission(role, permissions, "tasks", "view")
  )
}
