import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import Link from "next/link"
import { UsersRound, Plus } from "lucide-react"
import { sql } from "@/lib/db"
import { adminAuth } from "@/lib/firebase-admin"
import { AdminsTable } from "@/components/admin/admins-table"
import type { AdminRole } from "@/types"

async function getCurrentAdminRole(): Promise<{ adminId: string; role: AdminRole } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("__session")?.value
  if (!token) return null

  try {
    const decoded = await adminAuth.verifyIdToken(token)
    const uid = decoded.uid

    if (process.env.SUPER_ADMIN_UID && uid === process.env.SUPER_ADMIN_UID) {
      return { adminId: "super_admin_bootstrap", role: "super_admin" }
    }

    const rows = await sql`
      SELECT aa.id, ar.name AS role_name
      FROM admin_accounts aa
      JOIN admin_roles ar ON ar.id = aa.role_id
      WHERE aa.firebase_uid = ${uid} AND aa.status = 'active'
      LIMIT 1
    `
    if (!rows.length) return null
    return { adminId: rows[0].id as string, role: rows[0].role_name as AdminRole }
  } catch {
    return null
  }
}

async function getAdmins() {
  return sql`
    SELECT
      aa.id,
      aa.full_name,
      aa.email,
      aa.status,
      aa.last_login,
      aa.created_at,
      ar.id          AS role_id,
      ar.name        AS role_name,
      ar.label       AS role_label,
      cb.full_name   AS created_by_name
    FROM admin_accounts aa
    JOIN admin_roles ar ON ar.id = aa.role_id
    LEFT JOIN admin_accounts cb ON cb.id = aa.created_by
    ORDER BY aa.created_at DESC
  `
}

export default async function AdminsPage() {
  const session = await getCurrentAdminRole()
  if (!session || session.role !== "super_admin") {
    redirect("/admin/dashboard")
  }

  const rows = await getAdmins()

  const admins = rows.map((r) => ({
    id: r.id as string,
    fullName: r.full_name as string,
    email: r.email as string,
    status: r.status as "active" | "inactive" | "pending",
    lastLogin: r.last_login as string | null,
    createdAt: r.created_at as string,
    roleName: r.role_name as AdminRole,
    roleLabel: r.role_label as string,
    createdByName: r.created_by_name as string | null,
  }))

  return (
    <div className="w-full min-h-screen bg-subtle px-6 lg:px-10 py-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <UsersRound className="size-6 text-primary" />
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
              Admins
            </h1>
          </div>
          <p className="text-sm text-secondary">
            Manage admin accounts and permissions.
          </p>
        </div>
        <Link
          href="/admin/admins/new"
          className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all shadow-sm hover:shadow-md"
        >
          <Plus className="size-4" />
          Add New Admin
        </Link>
      </div>

      <AdminsTable admins={admins} currentAdminId={session.adminId} />
    </div>
  )
}
