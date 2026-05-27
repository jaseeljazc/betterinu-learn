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

async function getRoleRow(id: string) {
  const rows = await sql`
    SELECT
      ar.id,
      ar.name,
      ar.label,
      ar.description,
      ar.is_system,
      ar.created_at,
      COUNT(DISTINCT aa.id)::int AS admin_count,
      COALESCE(
        json_agg(
          json_build_object(
            'id', p.id, 'module', p.module, 'action', p.action, 'description', p.description
          ) ORDER BY p.module, p.action
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'
      ) AS permissions
    FROM admin_roles ar
    LEFT JOIN admin_role_permissions arp ON arp.role_id = ar.id
    LEFT JOIN permissions p             ON p.id = arp.permission_id
    LEFT JOIN admin_accounts aa         ON aa.role_id = ar.id
    WHERE ar.id = ${id}
    GROUP BY ar.id
  `
  const row = rows[0]
  if (!row) return null

  const seen = new Set<string>()
  row.permissions = (row.permissions as any[] || []).filter((p) => {
    if (!p || !p.id || seen.has(p.id)) return false
    seen.add(p.id)
    return true
  })

  return row
}

/**
 * GET /api/admin/roles/[id]
 * Returns a single role with full permissions and admin count.
 * Requires: super_admin
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const row = await getRoleRow(id)
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    role: {
      id: row.id,
      name: row.name,
      label: row.label,
      description: row.description,
      isSystem: row.is_system,
      adminCount: row.admin_count,
      permissions: row.permissions,
    },
  })
}

/**
 * PATCH /api/admin/roles/[id]
 * Updates a role.
 *
 * Rules:
 *  - super_admin: no changes allowed at all
 *  - is_system (other): permissions only — name/label/description are locked
 *  - custom: name, label, description, and permissions may all change
 *
 * Permissions are re-synced (delete + insert).
 * Requires: super_admin
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const row = await getRoleRow(id)
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // super_admin is completely locked
  if (row.name === "super_admin") {
    return NextResponse.json(
      { error: "The super_admin role cannot be edited" },
      { status: 403 }
    )
  }

  const body = await req.json()
  const { name, label, description, permissions } = body

  // Validate and update name/label/description for all non-super_admin roles
  if (name !== undefined && name.trim() !== row.name) {
    return NextResponse.json(
      { error: "Role name slug cannot be changed after creation" },
      { status: 400 }
    )
  }
  if (label !== undefined && (typeof label !== "string" || label.trim().length < 2)) {
    return NextResponse.json({ error: "label must be at least 2 characters" }, { status: 400 })
  }
  if (
    description !== undefined &&
    (typeof description !== "string" || description.trim().length < 10)
  ) {
    return NextResponse.json(
      { error: "description must be at least 10 characters" },
      { status: 400 }
    )
  }

  if (name !== undefined || label !== undefined || description !== undefined) {
    await sql`
      UPDATE admin_roles
      SET
        name        = COALESCE(${name?.trim() ?? null}, name),
        label       = COALESCE(${label?.trim() ?? null}, label),
        description = COALESCE(${description?.trim() ?? null}, description)
      WHERE id = ${id}
    `
  }

  // Re-sync permissions if provided
  if (permissions !== undefined) {
    if (!Array.isArray(permissions) || !permissions.every(isValidPerm)) {
      return NextResponse.json(
        { error: "permissions must be an array of valid {module, action} pairs" },
        { status: 400 }
      )
    }

    // Delete all existing permissions for this role
    await sql`DELETE FROM admin_role_permissions WHERE role_id = ${id}`

    // Insert new set
    for (const { module, action } of permissions) {
      const permRows = await sql`
        SELECT id FROM permissions WHERE module = ${module} AND action = ${action}
      `
      if (permRows.length) {
        await sql`
          INSERT INTO admin_role_permissions (role_id, permission_id)
          VALUES (${id}, ${permRows[0].id})
          ON CONFLICT DO NOTHING
        `
      }
    }
  }

  const updated = await getRoleRow(id)
  return NextResponse.json({
    role: {
      id: updated!.id,
      name: updated!.name,
      label: updated!.label,
      description: updated!.description,
      isSystem: updated!.is_system,
      permissions: updated!.permissions,
    },
  })
}

/**
 * DELETE /api/admin/roles/[id]
 * Hard-deletes a custom role.
 * Cannot delete system roles or roles with assigned admins.
 * Requires: super_admin
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const row = await getRoleRow(id)
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (row.is_system) {
    return NextResponse.json({ error: "System roles cannot be deleted" }, { status: 403 })
  }

  if ((row.admin_count as number) > 0) {
    return NextResponse.json(
      {
        error:
          "Cannot delete a role that is assigned to active admins. Reassign those admins first.",
      },
      { status: 400 }
    )
  }

  // Cascade deletes admin_role_permissions automatically
  await sql`DELETE FROM admin_roles WHERE id = ${id}`

  return NextResponse.json({ ok: true })
}
