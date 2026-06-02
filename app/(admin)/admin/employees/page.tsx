import { redirect } from "next/navigation"
import Link from "next/link"
import { Users, Plus, Building2, Wallet, CalendarDays } from "lucide-react"
import { hasPermission } from "@/lib/permissions"
import { getPageSession } from "@/lib/server-session"
import { EmployeeDirectory } from "@/components/admin/employees/employee-directory"

export default async function EmployeesPage() {
  const session = await getPageSession()
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
