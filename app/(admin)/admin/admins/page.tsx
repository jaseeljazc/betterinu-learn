import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import Link from "next/link"
import { UsersRound, Plus } from "lucide-react"
import { sql } from "@/lib/db"
import { AdminsTable } from "@/components/admin/admins-table"
import type { AdminRole } from "@/types"

/**
 * Read identity from the __rbac cookie (set at login, 7-day TTL).
 * This avoids re-verifying the short-lived Firebase ID token (1-hour TTL)
 * on every Server Component render, which caused spurious redirects to
 * /admin/dashboard after the first hour of a session.
 */
async function getCurrentAdminRole(): Promise<{ adminId: string; role: AdminRole } | null> {
  const cookieStore = await cookies()
  const rbac = cookieStore.get("__rbac")?.value
  if (!rbac) return null

  try {
    const parsed = JSON.parse(rbac) as { adminId: string; role: AdminRole }
    if (!parsed.adminId || !parsed.role) return null
    return { adminId: parsed.adminId, role: parsed.role }
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
      aa.temp_password,
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
    tempPassword: r.temp_password as string | null,
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
