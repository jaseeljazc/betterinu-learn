import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { adminAuth } from "@/lib/firebase-admin"
import { sendWelcomeEmail } from "@/lib/email"
import { generatePassword } from "@/lib/password"
import { requireSuperAdmin } from "@/lib/admin-rbac"

/**
 * GET /api/admin/admins
 * Returns all admin_accounts, each with an aggregated `roles` array and
 * the union of their permissions.
 * Requires: super_admin
 */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth

  const rows = await sql`
    SELECT
      aa.id,
      aa.full_name,
      aa.email,
      aa.status,
      aa.last_login,
      aa.created_at,
      aa.temp_password,
      cb.id        AS created_by_id,
      cb.full_name AS created_by_name,
      cb.email     AS created_by_email,
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
    GROUP BY aa.id, cb.id, cb.full_name, cb.email
    ORDER BY aa.created_at DESC
  `

  const admins = rows.map((r) => ({
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
  }))

  return NextResponse.json({ admins })
}

/**
 * POST /api/admin/admins
 * Creates a new admin account.
 * Requires: super_admin
 *
 * Body: { fullName, email, roleIds: string[], status }
 *
 * Accepts either `roleIds` (array) for multi-role or legacy `roleId` (single).
 */
export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const { fullName, email, status = "pending" } = body

  // Accept both roleIds[] (new) and legacy roleId (single)
  const roleIds: string[] = Array.isArray(body.roleIds)
    ? body.roleIds
    : body.roleId
    ? [body.roleId]
    : []

  // Validate
  if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
    return NextResponse.json({ error: "fullName must be at least 2 characters" }, { status: 400 })
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || !emailRegex.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 })
  }
  if (roleIds.length === 0) {
    return NextResponse.json({ error: "At least one roleId is required" }, { status: 400 })
  }
  if (!["active", "pending"].includes(status)) {
    return NextResponse.json({ error: "status must be active or pending" }, { status: 400 })
  }

  // Validate all provided role IDs; block super_admin
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

  // Check for duplicate email
  const existing = await sql`SELECT id FROM admin_accounts WHERE email = ${email.toLowerCase()}`
  if (existing.length) {
    return NextResponse.json({ error: "An admin with this email already exists" }, { status: 409 })
  }

  // 1. Generate password
  const password = generatePassword()

  // 2. Create Firebase Auth user
  let firebaseUid: string
  try {
    const userRecord = await adminAuth.createUser({
      email: email.toLowerCase(),
      password,
      displayName: fullName.trim(),
      emailVerified: false,
    })
    firebaseUid = userRecord.uid
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Firebase error"
    return NextResponse.json({ error: msg }, { status: 422 })
  }

  // 3. Insert admin_accounts row + bulk-insert all roles into pivot
  let adminId: string
  try {
    const inserted = await sql`
      INSERT INTO admin_accounts (firebase_uid, full_name, email, status, created_by, temp_password)
      VALUES (
        ${firebaseUid},
        ${fullName.trim()},
        ${email.toLowerCase()},
        ${status},
        ${auth.adminId === "super_admin_bootstrap" ? null : auth.adminId},
        ${password}
      )
      RETURNING id
    `
    adminId = inserted[0].id as string

    // Bulk-insert all role assignments
    for (const roleId of roleIds) {
      await sql`
        INSERT INTO admin_account_roles (admin_account_id, role_id, assigned_by)
        VALUES (
          ${adminId},
          ${roleId},
          ${auth.adminId === "super_admin_bootstrap" ? null : auth.adminId}
        )
        ON CONFLICT (admin_account_id, role_id) DO NOTHING
      `
    }
  } catch (err: unknown) {
    // Rollback Firebase user if DB insert fails
    await adminAuth.deleteUser(firebaseUid).catch(() => {})
    const msg = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // 4. Send welcome email (best-effort — never fails the request)
  let emailSent = false
  try {
    await sendWelcomeEmail({
      name: fullName.trim(),
      email: email.toLowerCase(),
      password,
    })
    emailSent = true
  } catch (err) {
    console.error("Admin welcome email failed:", err)
  }

  return NextResponse.json(
    { ok: true, adminId, emailSent },
    { status: 201 }
  )
}
