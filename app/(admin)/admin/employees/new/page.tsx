import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, UserPlus } from "lucide-react"
import { sql } from "@/lib/db"
import { hasPermission } from "@/lib/permissions"
import { getPageSession } from "@/lib/server-session"
import { EmployeeForm } from "@/components/admin/employees/employee-form"

export default async function NewEmployeePage() {
  const session = await getPageSession()
  if (!session) redirect("/admin/login")
  if (!hasPermission(session.role, session.permissions, "employees", "create")) {
    redirect("/admin/dashboard")
  }

  // Fetch roles for admin access assignment
  const roleRows = await sql`SELECT id, name, label FROM admin_roles ORDER BY name`
  const roles = roleRows.map((r) => ({ id: r.id as string, name: r.name as string, label: r.label as string }))

  return (
    <div className="w-full min-h-screen bg-subtle px-6 lg:px-10 py-10">
      <div className="mb-8">
        <Link href="/admin/employees" className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="size-4" /> Back to Employees
        </Link>
        <div className="flex items-center gap-3 mb-1">
          <UserPlus className="size-6 text-primary" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Add New Employee
          </h1>
        </div>
        <p className="text-sm text-secondary">Fill in the employee details below.</p>
      </div>

      <EmployeeForm roles={roles} />
    </div>
  )
}
