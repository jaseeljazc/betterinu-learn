import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import Link from "next/link"
import { Plus, ShieldCheck } from "lucide-react"
import { sql } from "@/lib/db"
import { adminAuth } from "@/lib/firebase-admin"
import { RolesTable } from "@/components/admin/roles-table"
import type { AdminRole, AdminRoleRecord } from "@/types"

async function getSessionRole(): Promise<{ role: AdminRole } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("__session")?.value
  if (!token) return null

  try {
    const decoded = await adminAuth.verifyIdToken(token)
    const uid = decoded.uid

    if (process.env.SUPER_ADMIN_UID && uid === process.env.SUPER_ADMIN_UID) {
      return { role: "super_admin" }
    }

    const rows = await sql`
      SELECT ar.name AS role_name
      FROM admin_accounts aa
      JOIN admin_roles ar ON ar.id = aa.role_id
      WHERE aa.firebase_uid = ${uid} AND aa.status = 'active'
      LIMIT 1
    `
    if (!rows.length) return null
    return { role: rows[0].role_name as AdminRole }
  } catch {
    return null
  }
}

async function getRoles() {
  return sql`
    SELECT
      ar.id,
      ar.name,
      ar.label,
      ar.description,
      ar.is_system,
      ar.created_at,
      COUNT(DISTINCT aa.id)::int AS admin_count,
      COALESCE(
        json_agg(
          json_build_object(
            'id', p.id, 'module', p.module, 'action', p.action, 'description', p.description
          ) ORDER BY p.module, p.action
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'
      ) AS permissions
    FROM admin_roles ar
    LEFT JOIN admin_role_permissions arp ON arp.role_id = ar.id
    LEFT JOIN permissions p             ON p.id = arp.permission_id
    LEFT JOIN admin_accounts aa         ON aa.role_id = ar.id
    GROUP BY ar.id
    ORDER BY ar.is_system DESC, ar.created_at ASC
  `
}

export default async function RolesPage() {
  const session = await getSessionRole()
  if (!session || session.role !== "super_admin") {
    redirect("/admin/dashboard")
  }

  const rows = await getRoles()

  const roles = rows.map((r) => ({
    id: r.id as string,
    name: r.name as AdminRole,
    label: r.label as string,
    description: r.description as string,
    isSystem: r.is_system as boolean,
    adminCount: r.admin_count as number,
    permissions: r.permissions as AdminRoleRecord["permissions"],
  }))

  return (
    <div className="w-full min-h-screen bg-subtle px-6 py-10 lg:px-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <ShieldCheck className="size-6 text-primary" />
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
              Roles &amp; Permissions
            </h1>
          </div>
          <p className="text-sm text-secondary">
            Manage roles and their permission sets.
          </p>
        </div>
        <Link
          href="/admin/roles/new"
          className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 hover:shadow-md"
        >
          <Plus className="size-4" />
          Create New Role
        </Link>
      </div>

      <RolesTable roles={roles} />
    </div>
  )
}
