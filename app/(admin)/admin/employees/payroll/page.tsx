import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Wallet } from "lucide-react"
import { hasPermission } from "@/lib/permissions"
import { getPageSession } from "@/lib/server-session"
import { PayrollView } from "@/components/admin/employees/payroll-view"

export default async function PayrollPage() {
  const session = await getPageSession()
  if (!session) redirect("/admin/login")
  if (!hasPermission(session.role, session.permissions, "payroll", "view")) {
    redirect("/admin/dashboard")
  }

  const canEdit = session.role === "super_admin" ||
    hasPermission(session.role, session.permissions, "payroll", "create")

  return (
    <div className="w-full min-h-screen bg-subtle px-6 lg:px-10 py-10">
      <div className="mb-8">
        <Link href="/admin/employees" className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="size-4" /> Back to Employees
        </Link>
        <div className="flex items-center gap-3 mb-1">
          <Wallet className="size-6 text-primary" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Payroll
          </h1>
        </div>
        <p className="text-sm text-secondary">Attendance-driven monthly salary calculation and disbursements.</p>
      </div>

      <PayrollView canEdit={canEdit} />
    </div>
  )
}
