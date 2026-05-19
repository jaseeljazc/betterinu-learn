import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import Link from "next/link"
import { ArrowLeft, Pencil } from "lucide-react"
import { sql } from "@/lib/db"
import { adminAuth } from "@/lib/firebase-admin"
import { hasPermission } from "@/lib/permissions"
import { generateViewPresignedUrl } from "@/lib/s3-private"
import { EmployeeForm } from "@/components/admin/employees/employee-form"
import type { AdminRole, Permission, Employee } from "@/types"

async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get("__session")?.value
  if (!token) return null
  try {
    const decoded = await adminAuth.verifyIdToken(token)
    const uid = decoded.uid
    if (process.env.SUPER_ADMIN_UID && uid === process.env.SUPER_ADMIN_UID) {
      return { role: "super_admin" as AdminRole, permissions: [] as Permission[] }
    }
    const rows = await sql`
      SELECT ar.name AS role_name,
        COALESCE(
          json_agg(json_build_object('module', p.module, 'action', p.action, 'id', p.id, 'description', p.description))
          FILTER (WHERE p.id IS NOT NULL), '[]'
        ) AS permissions
      FROM admin_accounts aa
      JOIN admin_roles ar ON ar.id = aa.role_id
      LEFT JOIN admin_role_permissions arp ON arp.role_id = aa.role_id
      LEFT JOIN permissions p ON p.id = arp.permission_id
      WHERE aa.firebase_uid = ${uid} AND aa.status = 'active'
      GROUP BY ar.name LIMIT 1
    `
    if (!rows.length) return null
    return { role: rows[0].role_name as AdminRole, permissions: rows[0].permissions as Permission[] }
  } catch { return null }
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) redirect("/admin/login")
  if (!hasPermission(session.role, session.permissions, "employees", "view")) {
    redirect("/admin/dashboard")
  }

  const { id } = await params

  const rows = await sql`
    SELECT
      e.id, e.employee_code, e.full_name, e.email, e.phone,
      e.date_of_birth::text AS date_of_birth, 
      e.gender, e.address, e.profile_photo_key,
      e.designation, e.employment_type, e.monthly_salary, 
      e.date_of_joining::text AS date_of_joining,
      e.status, e.admin_account_id, 
      e.created_at::text AS created_at,
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

  if (!rows.length) redirect("/admin/employees")

  const r = rows[0]
  const employee: Employee = {
    id: r.id as string,
    employeeCode: r.employee_code as string,
    fullName: r.full_name as string,
    email: r.email as string,
    phone: (r.phone as string | null) ?? undefined,
    dateOfBirth: (r.date_of_birth as string | null) ?? undefined,
    gender: (r.gender as string | null) ?? undefined,
    address: (r.address as string | null) ?? undefined,
    profilePhotoKey: (r.profile_photo_key as string | null) ?? undefined,
    profilePhotoUrl: r.profile_photo_key
      ? await generateViewPresignedUrl(r.profile_photo_key as string)
      : undefined,
    designation: (r.designation as string | null) ?? undefined,
    employmentType: r.employment_type as Employee["employmentType"],
    monthlySalary: Number(r.monthly_salary),
    dateOfJoining: (r.date_of_joining as string | null) ?? undefined,
    status: r.status as Employee["status"],
    adminAccountId: (r.admin_account_id as string | null) ?? undefined,
    createdAt: r.created_at as string,
    department: r.dept_id
      ? { id: r.dept_id as string, name: r.dept_name as string, isActive: r.dept_active as boolean }
      : undefined,
    reportingManager: r.manager_id
      ? { id: r.manager_id as string, fullName: r.manager_name as string }
      : undefined,
    adminAccount: r.admin_status
      ? { id: r.admin_account_id as string, status: r.admin_status as "active" | "inactive" | "pending", role: r.admin_role as string }
      : undefined,
  }

  const canEdit = session.role === "super_admin" ||
    hasPermission(session.role, session.permissions, "employees", "edit")

  const roleRows = await sql`SELECT id, name, label FROM admin_roles ORDER BY name`
  const roles = roleRows.map((row) => ({ id: row.id as string, name: row.name as string, label: row.label as string }))

  return (
    <div className="w-full min-h-screen bg-subtle px-6 lg:px-10 py-10">
      <div className="mb-8">
        <Link href="/admin/employees" className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="size-4" /> Back to Employees
        </Link>
        <div className="flex items-center gap-3 mb-1">
          <Pencil className="size-5 text-primary" />
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
            {employee.fullName}
          </h1>
          <span className="text-sm text-muted font-mono">{employee.employeeCode}</span>
        </div>
        <p className="text-sm text-secondary">{employee.designation ?? "Employee"}</p>
      </div>

      {canEdit ? (
        <EmployeeForm employee={employee} roles={roles} />
      ) : (
        <div className="w-full rounded-2xl border border-default bg-white p-6">
          <p className="text-sm text-secondary">You have read-only access to employee profiles.</p>
        </div>
      )}
    </div>
  )
}
