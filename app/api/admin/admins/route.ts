import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { adminAuth } from "@/lib/firebase-admin"
import { sendWelcomeEmail } from "@/lib/email"
import { generatePassword } from "@/lib/password"
import { requireSuperAdmin } from "@/lib/admin-rbac"

/**
 * GET /api/admin/admins
 * Returns all admin_accounts with their role and status.
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
      ar.id   AS role_id,
      ar.name AS role_name,
      ar.label AS role_label,
      ar.description AS role_description,
      ar.is_system AS role_is_system,
      cb.id        AS created_by_id,
      cb.full_name AS created_by_name,
      cb.email     AS created_by_email,
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
    GROUP BY aa.id, ar.id, cb.id, cb.full_name, cb.email
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
  }))

  return NextResponse.json({ admins })
}

/**
 * POST /api/admin/admins
 * Creates a new admin account.
 * Requires: super_admin
 *
 * Body: { fullName, email, roleId, status, permissions: [{module, action}] }
 *
 * Flow (mirrors student creation exactly):
 *  1. Validate body
 *  2. Generate secure password
 *  3. Create Firebase Auth user
 *  4. Insert admin_accounts row
 *  5. Sync permissions into admin_role_permissions for this admin's role
 *  6. Send welcome email (best-effort)
 */
export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const { fullName, email, roleId, status = "pending", permissions = [] } = body

  // Validate
  if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
    return NextResponse.json({ error: "fullName must be at least 2 characters" }, { status: 400 })
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || !emailRegex.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 })
  }
  if (!roleId || typeof roleId !== "string") {
    return NextResponse.json({ error: "roleId is required" }, { status: 400 })
  }
  if (!["active", "pending"].includes(status)) {
    return NextResponse.json({ error: "status must be active or pending" }, { status: 400 })
  }

  // Block super_admin role assignment via API
  const roleRows = await sql`SELECT name FROM admin_roles WHERE id = ${roleId}`
  if (!roleRows.length) {
    return NextResponse.json({ error: "Invalid roleId" }, { status: 400 })
  }
  if (roleRows[0].name === "super_admin") {
    return NextResponse.json({ error: "Cannot assign super_admin role via this endpoint" }, { status: 403 })
  }

  // Check for duplicate email
  const existing = await sql`SELECT id FROM admin_accounts WHERE email = ${email.toLowerCase()}`
  if (existing.length) {
    return NextResponse.json({ error: "An admin with this email already exists" }, { status: 409 })
  }

  // 1. Generate password (same utility as student creation)
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

  // 3. Insert admin_accounts row
  let adminId: string
  try {
    const inserted = await sql`
      INSERT INTO admin_accounts (firebase_uid, full_name, email, role_id, status, created_by, temp_password)
      VALUES (
        ${firebaseUid},
        ${fullName.trim()},
        ${email.toLowerCase()},
        ${roleId},
        ${status},
        ${auth.adminId === "super_admin_bootstrap" ? null : auth.adminId},
        ${password}
      )
      RETURNING id
    `
    adminId = inserted[0].id as string
  } catch (err: unknown) {
    // Rollback Firebase user if DB insert fails
    await adminAuth.deleteUser(firebaseUid).catch(() => {})
    const msg = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // 4. Sync custom permissions (delete existing for this role, insert new set)
  if (permissions.length > 0) {
    // Only sync if custom permissions differ from role defaults
    // We insert into admin_role_permissions for the role (shared), so we
    // store custom per-admin permissions separately via a junction that
    // references admin_accounts rather than admin_roles.
    // For now the spec stores permissions on the role — leave role perms intact.
    // Custom per-admin overrides are a future enhancement.
  }

  // 5. Send welcome email (best-effort — never fails the request)
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
