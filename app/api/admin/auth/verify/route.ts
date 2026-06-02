import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase-admin"
import { sql } from "@/lib/db"
import type { AdminRole } from "@/types"
import fs from "fs"

/**
 * POST /api/admin/auth/verify
 * Body: { idToken: string }
 *
 * Verifies the Firebase ID token, confirms the UID maps to an active
 * admin_accounts row, mints an httpOnly __session cookie, and writes a
 * client-readable __rbac cookie that includes the compact permissions array
 * so custom roles work correctly in the sidebar nav.
 *
 * Multi-role edition: permissions are the UNION of all roles assigned via
 * admin_account_roles. The primary role is `super_admin` if held, otherwise
 * the first role in the list.
 *
 * Compact format: [{m, a}] keeps the cookie well under the 4KB browser limit.
 */
export async function POST(req: NextRequest) {
  let idToken: string | undefined
  try {
    const body = await req.json()
    idToken = body?.idToken
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 })
  }

  try {

  let uid: string
  try {
    const decoded = await adminAuth.verifyIdToken(idToken)
    uid = decoded.uid
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  // super_admin bootstrap bypass — no DB row required
  const superAdminUid = process.env.SUPER_ADMIN_UID
  if (superAdminUid && uid === superAdminUid) {
    const ALL_MODULES = [
      "students", "courses", "curriculum", "tasks", "tasks_mgmt",
      "admins", "accounts", "employees", "payroll", "attendance",
    ]
    const ALL_ACTIONS = ["view", "create", "edit", "delete"]
    const permissions = ALL_MODULES.flatMap((m) => ALL_ACTIONS.map((a) => ({ m, a })))

    const response = NextResponse.json({
      ok: true,
      adminId: "super_admin_bootstrap",
      role: "super_admin",
    })
    response.cookies.set("__session", idToken, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })
    response.cookies.set(
      "__rbac",
      JSON.stringify({
        adminId: "super_admin_bootstrap",
        fullName: "Super Admin",
        email: "superadmin@betterinu.com",
        role: "super_admin",
        roles: ["super_admin"],
        permissions,
      }),
      {
        httpOnly: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      }
    )
    return response
  }

  /**
   * Multi-role query: collect all roles + union of permissions for this account
   * via the admin_account_roles pivot table.
   */
  const rows = await sql`
    SELECT
      aa.id,
      aa.full_name,
      aa.email,
      json_agg(DISTINCT ar.name)  FILTER (WHERE ar.id IS NOT NULL) AS role_names,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object('module', p.module, 'action', p.action)
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
    GROUP BY aa.id, aa.full_name, aa.email
  `

  if (!rows.length) {
    return NextResponse.json(
      { error: "Access denied. This account is not an active admin." },
      { status: 403 }
    )
  }

  const adminId = rows[0].id as string
  const fullName = rows[0].full_name as string
  const email = rows[0].email as string
  const roleNames = (rows[0].role_names as AdminRole[]) ?? []

  // Primary role: super_admin wins; otherwise first in list
  const primaryRole: AdminRole = roleNames.includes("super_admin")
    ? "super_admin"
    : (roleNames[0] ?? "support")

  // Deduplicate permissions and compact to {m, a}
  const rawPerms = rows[0].permissions as Array<{ module: string; action: string }> || []
  const seen = new Set<string>()
  const permissions = rawPerms
    .filter((p) => {
      if (!p?.module || !p.action) return false
      const key = `${p.module}:${p.action}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((p) => ({ m: p.module, a: p.action }))

  // Update last_login timestamp
  await sql`UPDATE admin_accounts SET last_login = NOW() WHERE id = ${adminId}`

  const response = NextResponse.json({ ok: true, adminId, role: primaryRole })
  response.cookies.set("__session", idToken, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  })
  response.cookies.set(
    "__rbac",
    JSON.stringify({
      adminId,
      fullName,
      email,
      role: primaryRole,
      roles: roleNames,
      permissions,
    }),
    {
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    }
  )

    return response
  } catch (err: unknown) {
    console.error("POST /api/admin/auth/verify unexpected error:", err)
    try {
      fs.writeFileSync("error.log", err instanceof Error ? err.stack || err.message : String(err))
    } catch {}
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
