/**
 * lib/admin-rbac.ts — Server-side RBAC guard for API route handlers.
 * Server-only — never import from client components.
 */
import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase-admin"
import { sql } from "@/lib/db"
import { hasPermission } from "@/lib/permissions"
import type { AdminRole, Permission, PermissionModule, PermissionAction } from "@/types"

type RbacSession = {
  adminId: string
  role: AdminRole
  permissions: Permission[]
}

/**
 * Reads __session cookie, verifies the Firebase ID token, looks up the
 * admin_accounts record, and returns the RBAC session payload.
 * Returns null if unauthenticated or unauthorised.
 */
async function resolveSession(req: NextRequest): Promise<RbacSession | null> {
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
      permissions: [],
    }
  }

  const rows = await sql`
    SELECT
      aa.id,
      ar.name AS role_name,
      COALESCE(
        json_agg(
          json_build_object('id', p.id, 'module', p.module, 'action', p.action, 'description', p.description)
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'
      ) AS permissions
    FROM admin_accounts aa
    JOIN admin_roles ar ON ar.id = aa.role_id
    LEFT JOIN admin_role_permissions arp ON arp.role_id = aa.role_id
    LEFT JOIN permissions p ON p.id = arp.permission_id
    WHERE aa.firebase_uid = ${uid}
      AND aa.status = 'active'
    GROUP BY aa.id, ar.name
  `

  if (!rows.length) return null

  return {
    adminId: rows[0].id as string,
    role: rows[0].role_name as AdminRole,
    permissions: rows[0].permissions as Permission[],
  }
}

/**
 * requirePermission — call at the top of every protected route handler.
 *
 * Returns { adminId, role, permissions } on success.
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

  if (session.role !== "super_admin") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
  }

  return session
}
