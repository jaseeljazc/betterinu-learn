/**
 * scripts/seed-rbac.ts
 * Seeds admin_roles, permissions, and admin_role_permissions.
 * Run with: npx tsx scripts/seed-rbac.ts
 * Fully idempotent — safe to re-run after adding new modules/actions.
 *
 * Role roster (after 025_update_roles migration):
 *   super_admin     — full access (hardcoded bypass)
 *   ceo             — full access (same as super_admin, DB-managed)
 *   instructor      — courses/curriculum/tasks + students/employees view
 *   account_manager — accounts/payroll full + employees/attendance view
 *   task_manager    — tasks_mgmt (advanced)
 *   reviewer        — tasks_mgmt (review subset)
 *   hr_manager      — employees/payroll/attendance full
 *   developer       — courses/curriculum view + tasks_mgmt default
 *   marketing_staff — students/courses view + tasks_mgmt default
 *   sales_staff     — students (view+create) + courses/accounts view + tasks_mgmt default
 *   department_head — supplementary: tasks_mgmt elevated + employees/attendance view
 */
import { sql } from "../src/lib/db"

const ROLES = [
  {
    name: "super_admin",
    label: "Super Admin",
    description:
      "Full unrestricted access to all features. Can manage other admins, assign roles, and configure the entire platform.",
    is_system: true,
  },
  {
    name: "ceo",
    label: "CEO",
    description:
      "Full unrestricted access equivalent to Super Admin. Intended for the organisation's CEO.",
    is_system: true,
  },
  {
    name: "instructor",
    label: "Instructor",
    description:
      "Can create and manage courses, curriculum, and tasks. Can view students and employees. Can view and mark attendance.",
    is_system: true,
  },
  {
    name: "account_manager",
    label: "Account Manager",
    description:
      "Full access to accounts and payroll modules. View-only access to employees and attendance.",
    is_system: true,
  },
  {
    name: "task_manager",
    label: "Task Manager",
    description:
      "Advanced tasks_mgmt access: view all, create, edit any, assign, manage projects & sprints, view dashboard & audit log.",
    is_system: true,
  },
  {
    name: "reviewer",
    label: "Reviewer",
    description:
      "Read-only team task visibility plus ability to edit own tasks. Can view the audit log.",
    is_system: true,
  },
  {
    name: "hr_manager",
    label: "HR Manager",
    description:
      "Full access to employees, payroll, and attendance. Default tasks access.",
    is_system: true,
  },
  {
    name: "developer",
    label: "Developer",
    description:
      "View-only access to courses and curriculum. Default tasks_mgmt permissions.",
    is_system: true,
  },
  {
    name: "marketing_staff",
    label: "Marketing Staff",
    description:
      "View-only access to students and courses. Default tasks_mgmt permissions.",
    is_system: true,
  },
  {
    name: "sales_staff",
    label: "Sales Staff",
    description:
      "Can view and create students. View-only on courses and accounts. Default tasks_mgmt permissions.",
    is_system: true,
  },
  {
    name: "department_head",
    label: "Department Head",
    description:
      "Supplementary role — always paired with a base role. Adds elevated tasks_mgmt visibility (view_team, assign, edit_any, audit log, dashboard) plus view access to employees and attendance.",
    is_system: true,
  },
]

const MODULES = [
  "students",
  "courses",
  "curriculum",
  "tasks",
  "tasks_mgmt",
  "admins",
  "accounts",
  "employees",
  "payroll",
  "attendance",
] as const

const CRUD_ACTIONS = ["view", "create", "edit", "delete"] as const
const TASKS_MGMT_ACTIONS = [
  "view_own", "view_team", "view_all", "view_disabled",
  "create", "edit_own", "edit_any", "delete",
  "assign", "self_assign",
  "manage_projects", "manage_sprints",
  "view_audit_log", "view_dashboard", "manage_attachments",
] as const

type Module = typeof MODULES[number]
type CrudAction = typeof CRUD_ACTIONS[number]
type TasksAction = typeof TASKS_MGMT_ACTIONS[number]
type AnyAction = CrudAction | TasksAction

function crud(module: Module, actions: CrudAction[] = [...CRUD_ACTIONS]): Array<{ module: Module; action: AnyAction }> {
  return actions.map((a) => ({ module, action: a }))
}

function tasksMgmt(...actions: TasksAction[]): Array<{ module: "tasks_mgmt"; action: AnyAction }> {
  return actions.map((a) => ({ module: "tasks_mgmt" as const, action: a }))
}

const defaultTaskPerms = tasksMgmt("view_own", "create", "edit_own", "self_assign", "manage_attachments")

/** Default permissions per role. */
const ROLE_PERMISSIONS: Record<string, Array<{ module: Module; action: AnyAction }>> = {
  super_admin: [
    ...MODULES.filter(m => m !== "tasks_mgmt").flatMap((m) => CRUD_ACTIONS.map((a) => ({ module: m, action: a as AnyAction }))),
    ...TASKS_MGMT_ACTIONS.map((a) => ({ module: "tasks_mgmt" as Module, action: a as AnyAction })),
  ],

  ceo: [
    ...MODULES.filter(m => m !== "tasks_mgmt").flatMap((m) => CRUD_ACTIONS.map((a) => ({ module: m, action: a as AnyAction }))),
    ...TASKS_MGMT_ACTIONS.map((a) => ({ module: "tasks_mgmt" as Module, action: a as AnyAction })),
  ],

  instructor: [
    ...crud("courses"),
    ...crud("curriculum"),
    ...crud("tasks"),
    ...crud("students", ["view"]),
    ...crud("employees", ["view"]),
    ...crud("attendance", ["view", "create"]),
    ...defaultTaskPerms,
  ],

  account_manager: [
    ...crud("accounts"),
    ...crud("payroll"),
    ...crud("employees", ["view"]),
    ...crud("attendance", ["view"]),
    ...defaultTaskPerms,
  ],

  task_manager: tasksMgmt(
    "view_all", "view_disabled", "create", "edit_any", "delete", "assign",
    "manage_projects", "manage_sprints", "view_dashboard", "manage_attachments", "view_audit_log"
  ),

  reviewer: tasksMgmt("view_team", "view_disabled", "edit_own", "view_audit_log"),

  hr_manager: [
    ...crud("employees"),
    ...crud("payroll"),
    ...crud("attendance"),
    ...defaultTaskPerms,
  ],

  developer: [
    ...crud("courses", ["view"]),
    ...crud("curriculum", ["view"]),
    ...defaultTaskPerms,
  ],

  marketing_staff: [
    ...crud("students", ["view"]),
    ...crud("courses", ["view"]),
    ...defaultTaskPerms,
  ],

  sales_staff: [
    ...crud("students", ["view", "create"]),
    ...crud("courses", ["view"]),
    ...crud("accounts", ["view"]),
    ...defaultTaskPerms,
  ],

  department_head: [
    ...tasksMgmt("view_team", "view_audit_log", "view_dashboard", "assign", "edit_any"),
    ...crud("employees", ["view"]),
    ...crud("attendance", ["view"]),
  ],
}

async function main() {
  console.log("Seeding RBAC tables…")

  // 1. Upsert roles
  for (const role of ROLES) {
    await sql`
      INSERT INTO admin_roles (name, label, description, is_system)
      VALUES (${role.name}, ${role.label}, ${role.description}, ${role.is_system})
      ON CONFLICT (name) DO UPDATE SET
        label       = EXCLUDED.label,
        description = EXCLUDED.description
    `
  }
  console.log("✓ Roles seeded")

  // 2. Upsert all permissions (CRUD for all modules + tasks_mgmt-specific actions)
  for (const module of MODULES) {
    const actions = module === "tasks_mgmt" ? TASKS_MGMT_ACTIONS : CRUD_ACTIONS
    for (const action of actions) {
      const description = `Can ${action.replace(/_/g, " ")} ${module}`
      await sql`
        INSERT INTO permissions (module, action, description)
        VALUES (${module}, ${action}, ${description})
        ON CONFLICT (module, action) DO NOTHING
      `
    }
  }
  console.log("✓ Permissions seeded")

  // 3. Upsert role → permission mappings
  for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const roleRows = await sql`SELECT id FROM admin_roles WHERE name = ${roleName}`
    if (!roleRows.length) {
      console.warn(`  Role not found: ${roleName} — skipping`)
      continue
    }
    const roleId = roleRows[0].id as string

    // Clear stale permissions for this role before re-seeding
    await sql`DELETE FROM admin_role_permissions WHERE role_id = ${roleId}`

    let granted = 0
    for (const { module, action } of perms) {
      const permRows = await sql`
        SELECT id FROM permissions WHERE module = ${module} AND action = ${action}
      `
      if (!permRows.length) continue
      const permId = permRows[0].id as string
      await sql`
        INSERT INTO admin_role_permissions (role_id, permission_id)
        VALUES (${roleId}, ${permId})
        ON CONFLICT DO NOTHING
      `
      granted++
    }
    console.log(`  ✓ ${roleName}: ${granted} permissions`)
  }
  console.log("✓ Role→permission mappings seeded")

  console.log("Done.")
  process.exit(0)
}

main().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
