import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requirePermission } from "@/lib/admin-rbac"
import { adminAuth } from "@/lib/firebase-admin"
import { sendWelcomeEmail } from "@/lib/email"
import { generatePassword } from "@/lib/password"

/**
 * POST /api/admin/employees/[id]/admin-account
 * Creates an admin account for an existing employee who doesn't have one yet.
 * Requires: employees/edit
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(req, "employees", "edit")
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const { roleId } = await req.json()

  if (!roleId) {
    return NextResponse.json({ error: "roleId is required" }, { status: 400 })
  }

  const empRows = await sql`
    SELECT id, full_name, email, admin_account_id FROM employees WHERE id = ${id} LIMIT 1
  `
  if (!empRows.length) return NextResponse.json({ error: "Employee not found" }, { status: 404 })

  const emp = empRows[0]
  if (emp.admin_account_id) {
    return NextResponse.json({ error: "Employee already has an admin account" }, { status: 409 })
  }

  const roleRows = await sql`SELECT name FROM admin_roles WHERE id = ${roleId}`
  if (!roleRows.length) return NextResponse.json({ error: "Invalid roleId" }, { status: 400 })
  if (roleRows[0].name === "super_admin") {
    return NextResponse.json({ error: "Cannot assign super_admin via this endpoint" }, { status: 403 })
  }

  const password = generatePassword()
  const creatorId = auth.adminId === "super_admin_bootstrap" ? null : auth.adminId

  let firebaseUid: string
  try {
    const userRecord = await adminAuth.createUser({
      email: (emp.email as string).toLowerCase(),
      password,
      displayName: emp.full_name as string,
      emailVerified: false,
    })
    firebaseUid = userRecord.uid
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Firebase error"
    return NextResponse.json({ error: msg }, { status: 422 })
  }

  let adminId: string
  try {
    const inserted = await sql`
      INSERT INTO admin_accounts (firebase_uid, full_name, email, role_id, status, created_by)
      VALUES (${firebaseUid}, ${emp.full_name}, ${(emp.email as string).toLowerCase()}, ${roleId}, 'active', ${creatorId})
      RETURNING id
    `
    adminId = inserted[0].id as string
    await sql`UPDATE employees SET admin_account_id = ${adminId}, updated_at = NOW() WHERE id = ${id}`
  } catch (err) {
    await adminAuth.deleteUser(firebaseUid).catch(() => {})
    const msg = err instanceof Error ? err.message : "Database error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  let emailSent = false
  let tempPassword: string | null = password
  try {
    await sendWelcomeEmail({ name: emp.full_name as string, email: (emp.email as string).toLowerCase(), password })
    emailSent = true
    tempPassword = null
  } catch {
    // best-effort — return tempPassword as fallback
  }

  return NextResponse.json({ ok: true, adminId, emailSent, tempPassword }, { status: 201 })
}
