import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { adminAuth } from "@/lib/firebase-admin"
import { requireSuperAdmin } from "@/lib/admin-rbac"

/**
 * GET /api/admin/admins/[id]
 * Returns a single admin account with all roles + union permissions.
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
      cb.id          AS created_by_id,
      cb.full_name   AS created_by_name,
      cb.email       AS created_by_email,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id',          ar.id,
            'name',        ar.name,
            'label',       ar.label,
            'description', ar.description,
            'isSystem',    ar.is_system
          )
        ) FILTER (WHERE ar.id IS NOT NULL),
        '[]'
      ) AS roles,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id',          p.id,
            'module',      p.module,
            'action',      p.action,
            'description', p.description
          )
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'
      ) AS permissions
    FROM admin_accounts aa
    JOIN admin_account_roles aar ON aar.admin_account_id = aa.id
    JOIN admin_roles ar          ON ar.id = aar.role_id
    LEFT JOIN admin_accounts cb ON cb.id = aa.created_by
    LEFT JOIN admin_role_permissions arp ON arp.role_id = ar.id
    LEFT JOIN permissions p ON p.id = arp.permission_id
    WHERE aa.id = ${id}
    GROUP BY aa.id, cb.id, cb.full_name, cb.email
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
      roles: r.roles,
      permissions: r.permissions,
      createdBy: r.created_by_id
        ? { id: r.created_by_id, fullName: r.created_by_name, email: r.created_by_email }
        : null,
    },
  })
}

/**
 * PATCH /api/admin/admins/[id]
 * Updates fullName, roleIds (array), and/or status.
 * Cannot change roles or status of super_admin accounts.
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
  const { fullName, status } = body

  // Accept both roleIds[] (new) and legacy roleId (single)
  const roleIds: string[] | undefined = Array.isArray(body.roleIds)
    ? body.roleIds
    : body.roleId
    ? [body.roleId]
    : undefined

  // Fetch target admin's current role names to guard super_admin
  const targetRows = await sql`
    SELECT aa.id, aa.status, aa.firebase_uid,
      json_agg(ar.name) AS role_names
    FROM admin_accounts aa
    JOIN admin_account_roles aar ON aar.admin_account_id = aa.id
    JOIN admin_roles ar          ON ar.id = aar.role_id
    WHERE aa.id = ${id}
    GROUP BY aa.id
  `
  if (!targetRows.length) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const target = targetRows[0]
  const currentRoleNames: string[] = (target.role_names as string[]) ?? []

  // Cannot modify super_admin accounts
  if (currentRoleNames.includes("super_admin")) {
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

  // Validate new role IDs if provided; block super_admin in the list
  if (roleIds !== undefined) {
    if (roleIds.length === 0) {
      return NextResponse.json({ error: "At least one roleId is required" }, { status: 400 })
    }
    for (const roleId of roleIds) {
      const roleRows = await sql`SELECT name FROM admin_roles WHERE id = ${roleId}`
      if (!roleRows.length) {
        return NextResponse.json({ error: `Invalid roleId: ${roleId}` }, { status: 400 })
      }
      if (roleRows[0].name === "super_admin") {
        return NextResponse.json(
          { error: "Cannot assign super_admin role via this endpoint" },
          { status: 403 }
        )
      }
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

  // Update name and status on admin_accounts
  await sql`
    UPDATE admin_accounts
    SET
      full_name = COALESCE(${fullName ?? null}, full_name),
      status    = COALESCE(${status ?? null}, status)
    WHERE id = ${id}
  `

  // Replace all role pivot rows atomically if new roles provided
  if (roleIds !== undefined) {
    await sql`DELETE FROM admin_account_roles WHERE admin_account_id = ${id}`
    for (const roleId of roleIds) {
      await sql`
        INSERT INTO admin_account_roles (admin_account_id, role_id, assigned_by)
        VALUES (${id}, ${roleId}, ${auth.adminId === "super_admin_bootstrap" ? null : auth.adminId})
        ON CONFLICT (admin_account_id, role_id) DO NOTHING
      `
    }
  }

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
    SELECT aa.id, aa.firebase_uid,
      json_agg(ar.name) AS role_names
    FROM admin_accounts aa
    JOIN admin_account_roles aar ON aar.admin_account_id = aa.id
    JOIN admin_roles ar          ON ar.id = aar.role_id
    WHERE aa.id = ${id}
    GROUP BY aa.id
  `
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const roleNames: string[] = (rows[0].role_names as string[]) ?? []
  if (roleNames.includes("super_admin")) {
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
