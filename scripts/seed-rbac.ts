/**
 * scripts/seed-rbac.ts
 * Seeds admin_roles, permissions, and admin_role_permissions.
 * Run with: npx tsx scripts/seed-rbac.ts
 * Fully idempotent — safe to re-run after adding new modules/actions.
 *
 * Module list (9 total):
 *   students | courses | curriculum | tasks | admins
 *   accounts | employees | payroll | attendance
 *
 * Role access spec:
 *   super_admin    — all modules, all actions
 *   admin          — all except "admins" module
 *   instructor     — courses/curriculum/tasks (all) + students/employees (view)
 *                    + attendance (view, create)
 *   support        — view-only: students, courses, tasks, employees, attendance
 *   account_manager — accounts/payroll (all) + employees/attendance (view)
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
    name: "admin",
    label: "Admin",
    description:
      "Broad access to manage students, courses, curriculum, tasks, employees, attendance, and accounts. Cannot manage other admin accounts.",
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
    name: "support",
    label: "Support",
    description:
      "Read-only access to students, courses, tasks, employees, and attendance. Cannot create, edit, or delete any content.",
    is_system: true,
  },
  {
    name: "account_manager",
    label: "Account Manager",
    description:
      "Full access to accounts and payroll modules. View-only access to employees and attendance.",
    is_system: true,
  },
]

const MODULES = [
  "students",
  "courses",
  "curriculum",
  "tasks",
  "admins",
  "accounts",
  "employees",
  "payroll",
  "attendance",
] as const

const ACTIONS = ["view", "create", "edit", "delete"] as const

type Module = typeof MODULES[number]
type Action = typeof ACTIONS[number]

/** Default permissions per role. super_admin bypass is handled in code (hasPermission). */
const ROLE_PERMISSIONS: Record<string, Array<{ module: Module; action: Action }>> = {
  super_admin: MODULES.flatMap((m) => ACTIONS.map((a) => ({ module: m, action: a }))),

  admin: MODULES.filter((m) => m !== "admins").flatMap((m) =>
    ACTIONS.map((a) => ({ module: m, action: a }))
  ),

  instructor: [
    // Full access to academic modules
    ...(["courses", "curriculum", "tasks"] as Module[]).flatMap((m) =>
      ACTIONS.map((a) => ({ module: m, action: a }))
    ),
    // View-only: students, employees
    { module: "students" as Module, action: "view" as Action },
    { module: "employees" as Module, action: "view" as Action },
    // Attendance: view + create (mark attendance)
    { module: "attendance" as Module, action: "view" as Action },
    { module: "attendance" as Module, action: "create" as Action },
  ],

  support: (["students", "courses", "tasks", "employees", "attendance"] as Module[]).map(
    (m) => ({ module: m, action: "view" as Action })
  ),

  account_manager: [
    // Full access to accounts and payroll
    ...(["accounts", "payroll"] as Module[]).flatMap((m) =>
      ACTIONS.map((a) => ({ module: m, action: a }))
    ),
    // View-only: employees, attendance
    { module: "employees" as Module, action: "view" as Action },
    { module: "attendance" as Module, action: "view" as Action },
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

  // 2. Upsert permissions (all 9 modules × 4 actions = 36 rows)
  for (const module of MODULES) {
    for (const action of ACTIONS) {
      const description = `Can ${action} ${module}`
      await sql`
        INSERT INTO permissions (module, action, description)
        VALUES (${module}, ${action}, ${description})
        ON CONFLICT (module, action) DO NOTHING
      `
    }
  }
  console.log("✓ Permissions seeded (9 modules × 4 actions)")

  // 3. Upsert role → permission mappings
  for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const roleRows = await sql`SELECT id FROM admin_roles WHERE name = ${roleName}`
    if (!roleRows.length) {
      console.warn(`  Role not found: ${roleName} — skipping`)
      continue
    }
    const roleId = roleRows[0].id as string
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
    console.log(`  ✓ ${roleName}: ${granted} permissions granted`)
  }
  console.log("✓ Role→permission mappings seeded")

  console.log("Done.")
  process.exit(0)
}

main().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
