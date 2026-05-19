/**
 * scripts/seed-rbac.ts
 * Seeds admin_roles, permissions, and admin_role_permissions.
 * Run with: npx tsx scripts/seed-rbac.ts
 * Fully idempotent — safe to re-run after adding new modules/actions.
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
      "Broad access to manage students, courses, curriculum, and tasks. Cannot manage other admin accounts.",
    is_system: true,
  },
  {
    name: "instructor",
    label: "Instructor",
    description:
      "Can create and manage courses, curriculum, and tasks. Cannot manage students or admin accounts.",
    is_system: true,
  },
  {
    name: "support",
    label: "Support",
    description:
      "Read-only access to students and submissions. Cannot create, edit, or delete any content.",
    is_system: true,
  },
]

const MODULES = ["students", "courses", "curriculum", "tasks", "admins"] as const
const ACTIONS = ["view", "create", "edit", "delete"] as const

/** Default permissions per role (matches spec). super_admin bypass is in code. */
const ROLE_PERMISSIONS: Record<string, Array<{ module: string; action: string }>> = {
  super_admin: MODULES.flatMap((m) => ACTIONS.map((a) => ({ module: m, action: a }))),
  admin: ["students", "courses", "curriculum", "tasks"].flatMap((m) =>
    ACTIONS.map((a) => ({ module: m, action: a }))
  ),
  instructor: [
    ...["courses", "curriculum", "tasks"].flatMap((m) =>
      ACTIONS.map((a) => ({ module: m, action: a }))
    ),
    { module: "students", action: "view" },
  ],
  support: [
    { module: "students", action: "view" },
    { module: "courses", action: "view" },
    { module: "tasks", action: "view" },
  ],
}

async function main() {
  console.log("Seeding RBAC tables…")

  // 1. Upsert roles
  for (const role of ROLES) {
    await sql`
      INSERT INTO admin_roles (name, label, description, is_system)
      VALUES (${role.name}, ${role.label}, ${role.description}, ${role.is_system})
      ON CONFLICT (name) DO NOTHING
    `
  }
  console.log("✓ Roles seeded")

  // 2. Upsert permissions
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
  console.log("✓ Permissions seeded")

  // 3. Upsert role→permission mappings
  for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const roleRows = await sql`SELECT id FROM admin_roles WHERE name = ${roleName}`
    if (!roleRows.length) {
      console.warn(`  Role not found: ${roleName} — skipping`)
      continue
    }
    const roleId = roleRows[0].id as string

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
    }
  }
  console.log("✓ Role→permission mappings seeded")

  console.log("Done.")
  process.exit(0)
}

main().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
