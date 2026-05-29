import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import Link from "next/link"
import { Users, Plus, Building2, Wallet, CalendarDays } from "lucide-react"
import { sql } from "@/lib/db"
import { adminAuth } from "@/lib/firebase-admin"
import { hasPermission } from "@/lib/permissions"
import { EmployeeDirectory } from "@/components/admin/employees/employee-directory"
import type { AdminRole, Permission } from "@/types"

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
      GROUP BY ar.name
      LIMIT 1
    `
    if (!rows.length) return null
    return { role: rows[0].role_name as AdminRole, permissions: rows[0].permissions as Permission[] }
  } catch { return null }
}

export default async function EmployeesPage() {
  const session = await getSession()
  if (!session) redirect("/admin/login")
  if (!hasPermission(session.role, session.permissions, "employees", "view")) {
    redirect("/admin/dashboard")
  }

  const canEdit = session.role === "super_admin" ||
    hasPermission(session.role, session.permissions, "employees", "create")

  return (
    <div className="w-full min-h-screen bg-subtle px-6 lg:px-10 py-10">
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Users className="size-6 text-primary" />
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Employees
            </h1>
          </div>
          <p className="text-sm text-secondary">View and manage your team directory.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/employees/departments"
            className="flex items-center gap-2 rounded-md border border-default bg-white px-4 py-2.5 text-sm font-semibold text-secondary hover:bg-subtle hover:text-primary transition-colors"
          >
            <Building2 className="size-4" /> Departments
          </Link>
          <Link
            href="/admin/employees/payroll"
            className="flex items-center gap-2 rounded-md border border-default bg-white px-4 py-2.5 text-sm font-semibold text-secondary hover:bg-subtle hover:text-primary transition-colors"
          >
            <Wallet className="size-4" /> Payroll
          </Link>
          <Link
            href="/admin/employees/attendance"
            className="flex items-center gap-2 rounded-md border border-default bg-white px-4 py-2.5 text-sm font-semibold text-secondary hover:bg-subtle hover:text-primary transition-colors"
          >
            <CalendarDays className="size-4" /> Attendance
          </Link>
          {canEdit && (
            <Link
              href="/admin/employees/new"
              className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all shadow-sm"
            >
              <Plus className="size-4" /> Add Employee
            </Link>
          )}
        </div>
      </div>

      <EmployeeDirectory canEdit={canEdit} />
    </div>
  )
}
