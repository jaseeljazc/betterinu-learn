import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import Link from "next/link"
import { ArrowLeft, CalendarDays } from "lucide-react"
import { sql } from "@/lib/db"
import { adminAuth } from "@/lib/firebase-admin"
import { hasPermission } from "@/lib/permissions"
import { AttendanceView } from "@/components/admin/employees/attendance-view"
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
      GROUP BY ar.name LIMIT 1
    `
    if (!rows.length) return null
    return { role: rows[0].role_name as AdminRole, permissions: rows[0].permissions as Permission[] }
  } catch { return null }
}

export default async function AttendancePage() {
  const session = await getSession()
  if (!session) redirect("/admin/login")
  if (!hasPermission(session.role, session.permissions, "attendance", "view")) {
    redirect("/admin/employees")
  }

  const canMark = session.role === "super_admin" ||
    hasPermission(session.role, session.permissions, "attendance", "create")
  const canEdit = session.role === "super_admin" ||
    hasPermission(session.role, session.permissions, "attendance", "edit")

  return (
    <div className="w-full min-h-screen bg-subtle px-6 lg:px-10 py-10">
      <div className="mb-8">
        <Link
          href="/admin/employees"
          className="inline-flex items-center gap-2 text-sm text-secondary hover:text-primary mb-4 transition-colors"
        >
          <ArrowLeft className="size-4" /> Back to Employees
        </Link>
        <div className="flex items-center gap-3 mb-1">
          <CalendarDays className="size-6 text-primary" />
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Attendance
          </h1>
        </div>
        <p className="text-sm text-secondary">Track and manage daily employee attendance.</p>
      </div>

      <AttendanceView canMark={canMark} canEdit={canEdit} />
    </div>
  )
}
