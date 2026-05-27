import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireSuperAdmin } from "@/lib/admin-rbac"
import type { PermissionModule, PermissionAction } from "@/types"

const VALID_MODULES: PermissionModule[] = [
  "students",
  "courses",
  "curriculum",
  "tasks",
  "admins",
  "accounts",
  "employees",
  "payroll",
  "attendance",
]
const VALID_ACTIONS: PermissionAction[] = ["view", "create", "edit", "delete"]

function isValidPerm(p: unknown): p is { module: PermissionModule; action: PermissionAction } {
  if (!p || typeof p !== "object") return false
  const obj = p as Record<string, unknown>
  return (
    VALID_MODULES.includes(obj.module as PermissionModule) &&
    VALID_ACTIONS.includes(obj.action as PermissionAction)
  )
}

/**
 * GET /api/admin/roles
 * Returns all roles with their permissions and admin count.
 * System roles first, then custom roles ordered by created_at.
 * Requires: super_admin
 */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth

  const rows = await sql`
    SELECT
      ar.id,
      ar.name,
      ar.label,
      ar.description,
      ar.is_system,
      ar.created_at,
      COUNT(DISTINCT aa.id)::int           AS admin_count,
      COALESCE(
        json_agg(
          json_build_object(
            'id',          p.id,
            'module',      p.module,
            'action',      p.action,
            'description', p.description
          ) ORDER BY p.module, p.action
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'
      ) AS permissions
    FROM admin_roles ar
    LEFT JOIN admin_role_permissions arp ON arp.role_id = ar.id
    LEFT JOIN permissions p             ON p.id = arp.permission_id
    LEFT JOIN admin_accounts aa         ON aa.role_id = ar.id
    GROUP BY ar.id
    ORDER BY ar.is_system DESC, ar.created_at ASC
  `

  const roles = rows.map((r) => ({
    id: r.id,
    name: r.name,
    label: r.label,
    description: r.description,
    isSystem: r.is_system,
    createdAt: r.created_at,
    adminCount: r.admin_count,
    permissions: r.permissions,
  }))

  return NextResponse.json({ roles })
}

/**
 * POST /api/admin/roles
 * Creates a new custom role with an optional set of permissions.
 * Requires: super_admin
 *
 * Body: { name, label, description, permissions: [{module, action}] }
 */
export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const { name, label, description, permissions = [] } = body

  // --- Validate ---
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "name must be at least 2 characters" }, { status: 400 })
  }
  // Must be slug-safe (lowercase, no spaces)
  const slugRegex = /^[a-z0-9_-]+$/
  if (!slugRegex.test(name.trim())) {
    return NextResponse.json(
      { error: "name must be lowercase with no spaces (use underscores/hyphens)" },
      { status: 400 }
    )
  }
  if (!label || typeof label !== "string" || label.trim().length < 2) {
    return NextResponse.json({ error: "label must be at least 2 characters" }, { status: 400 })
  }
  if (!description || typeof description !== "string" || description.trim().length < 10) {
    return NextResponse.json(
      { error: "description must be at least 10 characters" },
      { status: 400 }
    )
  }
  if (!Array.isArray(permissions) || !permissions.every(isValidPerm)) {
    return NextResponse.json(
      { error: "permissions must be an array of valid {module, action} pairs" },
      { status: 400 }
    )
  }

  // Unique name check
  const existing = await sql`SELECT id FROM admin_roles WHERE name = ${name.trim()}`
  if (existing.length) {
    return NextResponse.json({ error: "A role with this name already exists" }, { status: 409 })
  }

  // Insert role (is_system always false for created roles)
  const inserted = await sql`
    INSERT INTO admin_roles (name, label, description, is_system)
    VALUES (${name.trim()}, ${label.trim()}, ${description.trim()}, false)
    RETURNING id
  `
  const roleId = inserted[0].id as string

  // Insert permissions
  for (const { module, action } of permissions) {
    const permRows = await sql`
      SELECT id FROM permissions WHERE module = ${module} AND action = ${action}
    `
    if (permRows.length) {
      await sql`
        INSERT INTO admin_role_permissions (role_id, permission_id)
        VALUES (${roleId}, ${permRows[0].id})
        ON CONFLICT DO NOTHING
      `
    }
  }

  // Return the created role
  const roleRows = await sql`
    SELECT
      ar.id, ar.name, ar.label, ar.description, ar.is_system, ar.created_at,
      COALESCE(
        json_agg(
          json_build_object('id', p.id, 'module', p.module, 'action', p.action, 'description', p.description)
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'
      ) AS permissions
    FROM admin_roles ar
    LEFT JOIN admin_role_permissions arp ON arp.role_id = ar.id
    LEFT JOIN permissions p ON p.id = arp.permission_id
    WHERE ar.id = ${roleId}
    GROUP BY ar.id
  `

  return NextResponse.json(
    {
      role: {
        id: roleRows[0].id,
        name: roleRows[0].name,
        label: roleRows[0].label,
        description: roleRows[0].description,
        isSystem: roleRows[0].is_system,
        permissions: roleRows[0].permissions,
      },
    },
    { status: 201 }
  )
}
