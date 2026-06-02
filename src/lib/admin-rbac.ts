/**
 * lib/admin-rbac.ts — Server-side RBAC guard for API route handlers.
 * Server-only — never import from client components.
 *
 * Multi-role edition: a user's effective permissions are the UNION of all
 * permissions granted by every role assigned in admin_account_roles.
 */
import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase-admin"
import { sql } from "@/lib/db"
import { hasPermission } from "@/lib/permissions"
import type { AdminRole, Permission, PermissionModule, PermissionAction } from "@/types"

export type RbacSession = {
  adminId: string
  /** Primary role name (first assigned role, for backward-compat display). */
  role: AdminRole
  /** All roles this account holds. */
  roles: AdminRole[]
  permissions: Permission[]
}

/**
 * resolveSession
 *
 * Reads the __session cookie, verifies the Firebase ID token, then queries
 * admin_account_roles to get the full union of roles + permissions for the
 * account. Returns null if unauthenticated or unauthorised.
 */
export async function resolveSession(req: NextRequest): Promise<RbacSession | null> {
  const token = req.cookies.get("__session")?.value
  if (!token) return null

  let uid: string
  try {
    const decoded = await adminAuth.verifyIdToken(token)
    uid = decoded.uid
  } catch {
    return null
  }

  // super_admin bypass via env var (bootstrapping the very first admin)
  const superAdminUid = process.env.SUPER_ADMIN_UID
  if (superAdminUid && uid === superAdminUid) {
    return {
      adminId: "super_admin_bootstrap",
      role: "super_admin",
      roles: ["super_admin"],
      permissions: [],
    }
  }

  /**
   * Multi-role query:
   * Join admin_accounts → admin_account_roles → admin_roles → admin_role_permissions → permissions
   * Collect ALL roles and the UNION of their permissions for this account.
   */
  const rows = await sql`
    SELECT
      aa.id,
      aa.status,
      json_agg(DISTINCT ar.name)  FILTER (WHERE ar.id IS NOT NULL)  AS role_names,
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
    GROUP BY aa.id, aa.status
  `

  if (!rows.length) return null

  const roleNames = (rows[0].role_names as AdminRole[]) ?? []
  // Primary role: super_admin wins, otherwise first in list
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

/**
 * requirePermission — call at the top of every protected route handler.
 *
 * A user passes if ANY of their roles grants the requested permission
 * (union semantics). Returns { adminId, role, roles, permissions } on success.
 * Returns a NextResponse (401 or 403) on failure — return it immediately.
 */
export async function requirePermission(
  req: NextRequest,
  module: PermissionModule,
  action: PermissionAction
): Promise<RbacSession | NextResponse> {
  const session = await resolveSession(req)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!hasPermission(session.role, session.permissions, module, action)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  return session
}

export async function requireAdminSession(
  req: NextRequest
): Promise<RbacSession | NextResponse> {
  const session = await resolveSession(req)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return session
}

/**
 * requireSuperAdmin — shorthand for routes that only super_admin may access.
 */
export async function requireSuperAdmin(
  req: NextRequest
): Promise<RbacSession | NextResponse> {
  const session = await resolveSession(req)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!session.roles.includes("super_admin")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  return session
}
