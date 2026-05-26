import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requirePermission } from "@/lib/admin-rbac"
import { generateViewPresignedUrl } from "@/lib/s3-private"

/**
 * GET /api/admin/employees/[id]
 * Returns a single employee with full details.
 * Requires: employees/view
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(req, "employees", "view")
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const rows = await sql`
    SELECT
      e.id, e.employee_code, e.full_name, e.email, e.phone,
      e.date_of_birth, e.gender, e.address, e.profile_photo_key,
      e.designation, e.employment_type, e.monthly_salary, e.date_of_joining,
      e.status, e.admin_account_id, e.created_at, e.qualification, e.skills,
      d.id AS dept_id, d.name AS dept_name, d.is_active AS dept_active,
      rm.id AS manager_id, rm.full_name AS manager_name,
      aa.status AS admin_status, ar.name AS admin_role
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN employees rm ON rm.id = e.reporting_manager_id
    LEFT JOIN admin_accounts aa ON aa.id = e.admin_account_id
    LEFT JOIN admin_roles ar ON ar.id = aa.role_id
    WHERE e.id = ${id}
    LIMIT 1
  `

  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const r = rows[0]
  const employee = {
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
    department: r.dept_id
      ? { id: r.dept_id, name: r.dept_name, isActive: r.dept_active }
      : undefined,
    reportingManager: r.manager_id
      ? { id: r.manager_id, fullName: r.manager_name }
      : undefined,
    adminAccount: r.admin_status
      ? { id: r.admin_account_id, status: r.admin_status, role: r.admin_role }
      : undefined,
    // Fetch presigned photo URL on demand
    profilePhotoUrl: r.profile_photo_key
      ? await generateViewPresignedUrl(r.profile_photo_key as string)
      : undefined,
    qualification: r.qualification ?? undefined,
    skills: r.skills ?? undefined,
  }

  return NextResponse.json({ employee })
}

/**
 * PATCH /api/admin/employees/[id]
 * Updates employee details.
 * Requires: employees/edit
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(req, "employees", "edit")
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await req.json()
  const {
    fullName, phone, dateOfBirth, gender, address, profilePhotoKey,
    departmentId, designation, employmentType, reportingManagerId,
    monthlySalary, dateOfJoining, status, qualification, skills,
  } = body

  await sql`
    UPDATE employees SET
      full_name             = COALESCE(${fullName ?? null}, full_name),
      phone                 = ${phone ?? null},
      date_of_birth         = ${dateOfBirth ?? null},
      gender                = ${gender ?? null},
      address               = ${address ?? null},
      profile_photo_key     = COALESCE(${profilePhotoKey ?? null}, profile_photo_key),
      department_id         = ${departmentId ?? null},
      designation           = ${designation ?? null},
      employment_type       = COALESCE(${employmentType ?? null}, employment_type),
      reporting_manager_id  = ${reportingManagerId ?? null},
      monthly_salary        = COALESCE(${monthlySalary ?? null}, monthly_salary),
      date_of_joining       = ${dateOfJoining ?? null},
      status                = COALESCE(${status ?? null}, status),
      qualification         = ${qualification ?? null},
      skills                = ${skills ?? null},
      updated_at            = NOW()
    WHERE id = ${id}
  `

  return NextResponse.json({ ok: true })
}

/**
 * DELETE /api/admin/employees/[id]
 * Soft-deletes an employee by setting status = 'resigned'.
 * Requires: employees/delete
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(req, "employees", "delete")
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  await sql`
    UPDATE employees SET status = 'resigned', updated_at = NOW() WHERE id = ${id}
  `

  return NextResponse.json({ ok: true })
}
