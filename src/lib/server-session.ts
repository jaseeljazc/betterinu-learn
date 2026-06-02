/**
 * lib/server-session.ts — Shared server-side session resolver for page components.
 *
 * Reads the __session httpOnly cookie, verifies the Firebase ID token, then
 * queries admin_account_roles to build the multi-role session payload.
 *
 * Server-only — never import from client components or hooks.
 */
import { cookies } from "next/headers"
import { adminAuth } from "@/lib/firebase-admin"
import { sql } from "@/lib/db"
import type { AdminRole, Permission } from "@/types"

export type PageSession = {
  adminId: string
  role: AdminRole
  roles: AdminRole[]
  permissions: Permission[]
}

/**
 * getPageSession — call at the top of every protected Server Component page.
 *
 * Returns null if the session cookie is missing, expired, or the account
 * is not an active admin. Callers should redirect to /admin/login on null.
 */
export async function getPageSession(): Promise<PageSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("__session")?.value
  if (!token) return null

  let uid: string
  try {
    const decoded = await adminAuth.verifyIdToken(token)
    uid = decoded.uid
  } catch {
    return null
  }

  // super_admin bootstrap bypass
  if (process.env.SUPER_ADMIN_UID && uid === process.env.SUPER_ADMIN_UID) {
    return {
      adminId: "super_admin_bootstrap",
      role: "super_admin",
      roles: ["super_admin"],
      permissions: [],
    }
  }

  // Multi-role query: union of all roles and their permissions
  const rows = await sql`
    SELECT
      aa.id,
      json_agg(DISTINCT ar.name) FILTER (WHERE ar.id IS NOT NULL) AS role_names,
      COALESCE(
        jsonb_agg(
          DISTINCT jsonb_build_object(
            'id',          p.id,
            'module',      p.module,
            'action',      p.action,
            'description', p.description
          )
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'
      ) AS permissions
    FROM admin_accounts aa
    JOIN admin_account_roles aar ON aar.admin_account_id = aa.id
    JOIN admin_roles ar          ON ar.id = aar.role_id
    LEFT JOIN admin_role_permissions arp ON arp.role_id = ar.id
    LEFT JOIN permissions p              ON p.id = arp.permission_id
    WHERE aa.firebase_uid = ${uid}
      AND aa.status = 'active'
    GROUP BY aa.id
  `

  if (!rows.length) return null

  const roleNames = (rows[0].role_names as AdminRole[]) ?? []
  const primaryRole: AdminRole = roleNames.includes("super_admin")
    ? "super_admin"
    : (roleNames[0] ?? "developer")

  return {
    adminId: rows[0].id as string,
    role: primaryRole,
    roles: roleNames,
    permissions: rows[0].permissions as Permission[],
  }
}
