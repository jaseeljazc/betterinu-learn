import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requirePermission } from "@/lib/admin-rbac"
import { adminAuth } from "@/lib/firebase-admin"
import { sendWelcomeEmail } from "@/lib/email"
import { generatePassword } from "@/lib/password"

/**
 * GET /api/admin/employees
 * Returns all employees with department, manager, and admin account info.
 * Requires: employees/view
 */
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "employees", "view")
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const departmentId = searchParams.get("departmentId")
  const status = searchParams.get("status")
  const employmentType = searchParams.get("employmentType")

  const rows = await sql`
    SELECT
      e.id,
      e.employee_code,
      e.full_name,
      e.email,
      e.phone,
      e.date_of_birth,
      e.gender,
      e.address,
      e.profile_photo_key,
      e.designation,
      e.employment_type,
      e.monthly_salary,
      e.date_of_joining,
      e.status,
      e.admin_account_id,
      e.created_at,
      d.id   AS dept_id,
      d.name AS dept_name,
      rm.id        AS manager_id,
      rm.full_name AS manager_name,
      aa.status   AS admin_status,
      ar.name     AS admin_role
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN employees rm ON rm.id = e.reporting_manager_id
    LEFT JOIN admin_accounts aa ON aa.id = e.admin_account_id
    LEFT JOIN admin_roles ar ON ar.id = aa.role_id
    WHERE TRUE
      ${departmentId ? sql`AND e.department_id = ${departmentId}` : sql``}
      ${status ? sql`AND e.status = ${status}` : sql``}
      ${employmentType ? sql`AND e.employment_type = ${employmentType}` : sql``}
    ORDER BY e.full_name ASC
  `

  const employees = rows.map(mapEmployee)
  return NextResponse.json({ employees })
}

/**
 * POST /api/admin/employees
 * Creates a new employee.
 * Optionally creates an admin account if hasAdminAccess = true.
 * Requires: employees/create
 */
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "employees", "create")
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const {
    fullName, email, phone, dateOfBirth, gender, address,
    departmentId, designation, employmentType = "full_time",
    reportingManagerId, monthlySalary = 0, dateOfJoining, status = "active",
    hasAdminAccess = false, roleId,
  } = body

  if (!fullName?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "fullName and email are required" }, { status: 400 })
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
  }

  // Check uniqueness
  const existing = await sql`SELECT id FROM employees WHERE email = ${email.toLowerCase()}`
  if (existing.length) {
    return NextResponse.json({ error: "An employee with this email already exists" }, { status: 409 })
  }

  // Generate employee code: EMP + next padded number
  const codeRow = await sql`
    SELECT COALESCE(MAX(CAST(SUBSTRING(employee_code FROM 4) AS INTEGER)), 0) + 1 AS next_num
    FROM employees WHERE employee_code ~ '^EMP[0-9]+$'
  `
  const employeeCode = `EMP${String(codeRow[0].next_num).padStart(3, "0")}`

  // Insert employee
  const creatorId = auth.adminId === "super_admin_bootstrap" ? null : auth.adminId
  const empRow = await sql`
    INSERT INTO employees (
      employee_code, full_name, email, phone, date_of_birth, gender, address,
      department_id, designation, employment_type, reporting_manager_id,
      monthly_salary, date_of_joining, status, created_by
    ) VALUES (
      ${employeeCode}, ${fullName.trim()}, ${email.toLowerCase()},
      ${phone || null}, ${dateOfBirth || null}, ${gender || null}, ${address || null},
      ${departmentId || null}, ${designation || null}, ${employmentType},
      ${reportingManagerId || null}, ${monthlySalary}, ${dateOfJoining || null},
      ${status}, ${creatorId}
    )
    RETURNING id
  `
  const employeeId = empRow[0].id as string

  // Optionally create admin account
  let adminId: string | null = null
  let emailSent = false
  let tempPassword: string | null = null

  if (hasAdminAccess && roleId) {
    const roleRows = await sql`SELECT name FROM admin_roles WHERE id = ${roleId}`
    if (!roleRows.length) {
      return NextResponse.json({ error: "Invalid roleId" }, { status: 400 })
    }
    if (roleRows[0].name === "super_admin") {
      return NextResponse.json({ error: "Cannot assign super_admin via this endpoint" }, { status: 403 })
    }

    const existingAdmin = await sql`SELECT id FROM admin_accounts WHERE email = ${email.toLowerCase()}`
    if (!existingAdmin.length) {
      tempPassword = generatePassword()
      let firebaseUid: string
      try {
        const userRecord = await adminAuth.createUser({
          email: email.toLowerCase(),
          password: tempPassword,
          displayName: fullName.trim(),
          emailVerified: false,
        })
        firebaseUid = userRecord.uid
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Firebase error"
        return NextResponse.json({ error: msg }, { status: 422 })
      }

      try {
        const inserted = await sql`
          INSERT INTO admin_accounts (firebase_uid, full_name, email, role_id, status, created_by)
          VALUES (${firebaseUid}, ${fullName.trim()}, ${email.toLowerCase()}, ${roleId}, 'active', ${creatorId})
          RETURNING id
        `
        adminId = inserted[0].id as string
        await sql`UPDATE employees SET admin_account_id = ${adminId} WHERE id = ${employeeId}`
      } catch (err) {
        await adminAuth.deleteUser(firebaseUid).catch(() => {})
        const msg = err instanceof Error ? err.message : "Database error"
        return NextResponse.json({ error: msg }, { status: 500 })
      }

      try {
        await sendWelcomeEmail({ name: fullName.trim(), email: email.toLowerCase(), password: tempPassword })
        emailSent = true
        tempPassword = null  // clear after email sent
      } catch {
        // Best-effort — tempPassword returned to caller as fallback
      }
    }
  }

  return NextResponse.json(
    { ok: true, employeeId, employeeCode, adminId, emailSent, tempPassword },
    { status: 201 }
  )
}

// ── Row mapper ────────────────────────────────────────────────

function mapEmployee(r: Record<string, unknown>) {
  return {
    id: r.id,
    employeeCode: r.employee_code,
    fullName: r.full_name,
    email: r.email,
    phone: r.phone ?? undefined,
    dateOfBirth: r.date_of_birth ?? undefined,
    gender: r.gender ?? undefined,
    address: r.address ?? undefined,
    profilePhotoKey: r.profile_photo_key ?? undefined,
    designation: r.designation ?? undefined,
    employmentType: r.employment_type,
    monthlySalary: Number(r.monthly_salary),
    dateOfJoining: r.date_of_joining ?? undefined,
    status: r.status,
    adminAccountId: r.admin_account_id ?? undefined,
    createdAt: r.created_at,
    department: r.dept_id ? { id: r.dept_id, name: r.dept_name, isActive: true } : undefined,
    reportingManager: r.manager_id ? { id: r.manager_id, fullName: r.manager_name } : undefined,
    adminAccount: r.admin_status ? { id: r.admin_account_id, status: r.admin_status, role: r.admin_role } : undefined,
  }
}
