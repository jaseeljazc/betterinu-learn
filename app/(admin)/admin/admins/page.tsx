import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { sql } from "@/lib/db"
import { AdminsTable } from "@/components/admin/admins-table"
import type { AdminRole } from "@/types"
import type { AdminFormRole } from "@/components/admin/admin-form"

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
      cb.full_name AS created_by_name,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'id',    ar.id,
            'name',  ar.name,
            'label', ar.label
          )
        ) FILTER (WHERE ar.id IS NOT NULL),
        '[]'
      ) AS roles
    FROM admin_accounts aa
    JOIN admin_account_roles aar ON aar.admin_account_id = aa.id
    JOIN admin_roles ar          ON ar.id = aar.role_id
    LEFT JOIN admin_accounts cb ON cb.id = aa.created_by
    GROUP BY aa.id, cb.full_name
    ORDER BY aa.created_at DESC
  `
}

async function getAllRoles(): Promise<AdminFormRole[]> {
  const rows = await sql`
    SELECT
      ar.id, ar.name, ar.label, ar.description,
      COALESCE(
        json_agg(
          json_build_object('module', p.module, 'action', p.action)
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'
      ) AS permissions
    FROM admin_roles ar
    LEFT JOIN admin_role_permissions arp ON arp.role_id = ar.id
    LEFT JOIN permissions p ON p.id = arp.permission_id
    WHERE ar.name != 'super_admin'
    GROUP BY ar.id
    ORDER BY ar.name
  `
  return rows.map(r => ({
    id: r.id as string,
    name: r.name as AdminRole,
    label: r.label as string,
    description: r.description as string,
    permissions: r.permissions as any
  }))
}

export default async function AdminsPage() {
  const session = await getCurrentAdminRole()
  if (!session || session.role !== "super_admin") {
    redirect("/admin/dashboard")
  }

  const [adminsRows, allRoles] = await Promise.all([getAdmins(), getAllRoles()])

  const admins = adminsRows.map((r) => ({
    id:            r.id as string,
    fullName:      r.full_name as string,
    email:         r.email as string,
    status:        r.status as "active" | "inactive" | "pending",
    lastLogin:     r.last_login as string | null,
    createdAt:     r.created_at as string,
    roles:         r.roles as Array<{ id: string; name: AdminRole; label: string }>,
    createdByName: r.created_by_name as string | null,
    tempPassword:  r.temp_password as string | null,
  }))

  return <AdminsTable admins={admins} allRoles={allRoles} currentAdminId={session.adminId} />
}
