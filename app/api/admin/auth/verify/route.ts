import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase-admin"
import { sql } from "@/lib/db"
import type { AdminRole } from "@/types"

/**
 * POST /api/admin/auth/verify
 * Body: { idToken: string }
 *
 * Verifies the Firebase ID token, confirms the UID maps to an active
 * admin_accounts row, mints an httpOnly __session cookie, and writes a
 * client-readable __rbac cookie that includes the compact permissions array
 * so custom roles work correctly in the sidebar nav.
 *
 * Compact format: [{m, a}] keeps the cookie well under the 4KB browser limit
 * (max 36 perms × ~20 bytes ≈ 900 bytes).
 */
export async function POST(req: NextRequest) {
  const { idToken } = await req.json()
  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 })
  }

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
    const ALL_MODULES = ["students","courses","curriculum","tasks","admins","accounts","employees","payroll","attendance"]
    const ALL_ACTIONS = ["view","create","edit","delete"]
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

  // Look up admin + role + permissions from DB
  const rows = await sql`
    SELECT
      aa.id,
      aa.full_name,
      aa.email,
      ar.name AS role_name,
      COALESCE(
        json_agg(
          json_build_object('module', p.module, 'action', p.action)
        ) FILTER (WHERE p.id IS NOT NULL),
        '[]'
      ) AS permissions
    FROM admin_accounts aa
    JOIN admin_roles ar ON ar.id = aa.role_id
    LEFT JOIN admin_role_permissions arp ON arp.role_id = aa.role_id
    LEFT JOIN permissions p ON p.id = arp.permission_id
    WHERE aa.firebase_uid = ${uid}
      AND aa.status = 'active'
    GROUP BY aa.id, aa.full_name, aa.email, ar.name
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
  const role = rows[0].role_name as AdminRole

  // Deduplicate (guard against Cartesian product from the GROUP BY join)
  // and compact to {m, a} to keep cookie size small.
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

  const response = NextResponse.json({ ok: true, adminId, role })
  response.cookies.set("__session", idToken, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  })                                                                                            
  response.cookies.set(
    "__rbac",
    JSON.stringify({ adminId, fullName, email, role, permissions }),
    {
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    }
  )

  return response
}
