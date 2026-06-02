import { redirect } from "next/navigation"
import { sql } from "@/lib/db"
import { hasPermission } from "@/lib/permissions"
import { getPageSession } from "@/lib/server-session"
import { generateViewPresignedUrl } from "@/lib/s3-private"
import { EmployeeDetailView } from "@/components/admin/employees/employee-detail-view"
import type { Employee } from "@/types"

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getPageSession()
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
      e.qualification, e.skills,
      d.id AS dept_id, d.name AS dept_name, d.is_active AS dept_active,
      rm.id AS manager_id, rm.full_name AS manager_name,
      aa.status AS admin_status,
      (SELECT string_agg(ar.name, ', ') FROM admin_account_roles aar JOIN admin_roles ar ON ar.id = aar.role_id WHERE aar.admin_account_id = aa.id) AS admin_role
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN employees rm ON rm.id = e.reporting_manager_id
    LEFT JOIN admin_accounts aa ON aa.id = e.admin_account_id
    WHERE e.id = ${id}
    LIMIT 1
  `

  if (!rows.length) redirect("/admin/employees")

  const docRows = await sql`
    SELECT id, doc_type, doc_name, s3_key, file_name, file_type, file_size, uploaded_at::text AS uploaded_at
    FROM employee_documents
    WHERE employee_id = ${id}
    ORDER BY uploaded_at ASC
  `

  const documents = await Promise.all(
    docRows.map(async (row) => ({
      id: row.id as string,
      employeeId: id,
      docType: row.doc_type as string,
      docName: (row.doc_name as string | null) ?? undefined,
      s3Key: row.s3_key as string,
      fileName: row.file_name as string,
      fileType: row.file_type as string,
      fileSize: Number(row.file_size),
      uploadedAt: row.uploaded_at as string,
      presignedUrl: await generateViewPresignedUrl(row.s3_key as string),
    }))
  )

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
    qualification: (r.qualification as string | null) ?? undefined,
    skills: (r.skills as string[] | null) ?? undefined,
    documents,
  }

  const canEdit = session.role === "super_admin" ||
    hasPermission(session.role, session.permissions, "employees", "edit")

  const roleRows = await sql`SELECT id, name, label FROM admin_roles ORDER BY name`
  const roles = roleRows.map((row) => ({ id: row.id as string, name: row.name as string, label: row.label as string }))

  return <EmployeeDetailView employee={employee} canEdit={canEdit} roles={roles} />
}
