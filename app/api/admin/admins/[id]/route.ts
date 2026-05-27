import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { adminAuth } from "@/lib/firebase-admin"
import { requireSuperAdmin } from "@/lib/admin-rbac"

/**
 * GET /api/admin/admins/[id]
 * Returns a single admin account with role + permissions.
 * Requires: super_admin
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const rows = await sql`
    SELECT
      aa.id,
      aa.full_name,
      aa.email,
      aa.status,
      aa.last_login,
      aa.created_at,
      aa.temp_password,
      ar.id          AS role_id,
      ar.name        AS role_name,
      ar.label       AS role_label,
      ar.description AS role_description,
      ar.is_system   AS role_is_system,
      cb.id          AS created_by_id,
      cb.full_name   AS created_by_name,
      cb.email       AS created_by_email,
      COALESCE(
        json_agg(
          json_build_object(
            'id', p.id,
            'module', p.module,
            'action', p.action,
            'description', p.description
          )
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'
      ) AS permissions
    FROM admin_accounts aa
    JOIN admin_roles ar ON ar.id = aa.role_id
    LEFT JOIN admin_accounts cb ON cb.id = aa.created_by
    LEFT JOIN admin_role_permissions arp ON arp.role_id = aa.role_id
    LEFT JOIN permissions p ON p.id = arp.permission_id
    WHERE aa.id = ${id}
    GROUP BY aa.id, ar.id, cb.id, cb.full_name, cb.email
  `

  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const r = rows[0]
  return NextResponse.json({
    admin: {
      id: r.id,
      fullName: r.full_name,
      email: r.email,
      status: r.status,
      lastLogin: r.last_login,
      createdAt: r.created_at,
      tempPassword: r.temp_password,
      role: {
        id: r.role_id,
        name: r.role_name,
        label: r.role_label,
        description: r.role_description,
        isSystem: r.role_is_system,
        permissions: r.permissions,
      },
      createdBy: r.created_by_id
        ? { id: r.created_by_id, fullName: r.created_by_name, email: r.created_by_email }
        : null,
    },
  })
}

/**
 * PATCH /api/admin/admins/[id]
 * Updates fullName, roleId, and/or status.
 * Cannot change role or status of super_admin accounts.
 * Requires: super_admin
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await req.json()
  const { fullName, roleId, status } = body

  // Fetch target admin
  const targetRows = await sql`
    SELECT aa.id, aa.status, ar.name AS role_name, aa.firebase_uid
    FROM admin_accounts aa
    JOIN admin_roles ar ON ar.id = aa.role_id
    WHERE aa.id = ${id}
  `
  if (!targetRows.length) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const target = targetRows[0]

  // Cannot modify super_admin accounts
  if (target.role_name === "super_admin") {
    return NextResponse.json(
      { error: "Cannot modify a super_admin account" },
      { status: 403 }
    )
  }

  // Cannot self-deactivate
  if (status === "inactive" && id === auth.adminId) {
    return NextResponse.json(
      { error: "You cannot deactivate your own account" },
      { status: 403 }
    )
  }

  // Validate new role if provided
  if (roleId) {
    const roleRows = await sql`SELECT name FROM admin_roles WHERE id = ${roleId}`
    if (!roleRows.length) {
      return NextResponse.json({ error: "Invalid roleId" }, { status: 400 })
    }
    if (roleRows[0].name === "super_admin") {
      return NextResponse.json(
        { error: "Cannot assign super_admin role via this endpoint" },
        { status: 403 }
      )
    }
  }

  // Enable or disable Firebase sign-in if status changed
  if (status && status !== target.status) {
    if (status === "inactive") {
      try {
        await adminAuth.updateUser(target.firebase_uid as string, { disabled: true })
      } catch (err) {
        console.error("Firebase disable failed:", err)
      }
    } else if (status === "active" || status === "pending") {
      try {
        await adminAuth.updateUser(target.firebase_uid as string, { disabled: false })
      } catch (err) {
        console.error("Firebase enable failed:", err)
      }
    }
  }

  // Build update
  await sql`
    UPDATE admin_accounts
    SET
      full_name = COALESCE(${fullName ?? null}, full_name),
      role_id   = COALESCE(${roleId ?? null}, role_id),
      status    = COALESCE(${status ?? null}, status)
    WHERE id = ${id}
  `

  return NextResponse.json({ ok: true })
}

/**
 * DELETE /api/admin/admins/[id]
 * Soft-deletes by setting status = 'inactive'.
 * Cannot deactivate super_admin accounts or self.
 * Requires: super_admin
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  if (id === auth.adminId) {
    return NextResponse.json(
      { error: "You cannot deactivate your own account" },
      { status: 403 }
    )
  }

  const rows = await sql`
    SELECT aa.id, ar.name AS role_name, aa.firebase_uid
    FROM admin_accounts aa
    JOIN admin_roles ar ON ar.id = aa.role_id
    WHERE aa.id = ${id}
  `
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (rows[0].role_name === "super_admin") {
    return NextResponse.json(
      { error: "Cannot deactivate a super_admin account" },
      { status: 403 }
    )
  }

  await sql`UPDATE admin_accounts SET status = 'inactive' WHERE id = ${id}`

  // Disable Firebase sign-in (best-effort)
  try {
    await adminAuth.updateUser(rows[0].firebase_uid as string, { disabled: true })
  } catch (err) {
    console.error("Firebase disable failed:", err)
  }

  return NextResponse.json({ ok: true })
}
