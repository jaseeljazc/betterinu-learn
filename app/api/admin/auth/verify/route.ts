import { NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase-admin"
import { sql } from "@/lib/db"
import type { AdminRole, Permission } from "@/types"

/**
 * POST /api/admin/auth/verify
 * Body: { idToken: string }
 *
 * Verifies the Firebase ID token, confirms the UID maps to an active
 * admin_accounts row, and mints an httpOnly __session cookie that carries
 * the enriched RBAC payload (role + permissions).
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

  // super_admin bootstrap bypass
  const superAdminUid = process.env.SUPER_ADMIN_UID
  if (superAdminUid && uid === superAdminUid) {
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
    return response
  }

  // Look up admin_accounts + role + permissions
  const rows = await sql`
    SELECT
      aa.id,
      aa.full_name,
      aa.email,
      ar.name AS role_name,
      COALESCE(
        json_agg(
          json_build_object(
            'id', p.id,
            'module', p.module,
            'action', p.action,
            'description', p.description
          )
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
  const permissions = rows[0].permissions as Permission[]

  // Update last_login
  await sql`UPDATE admin_accounts SET last_login = NOW() WHERE id = ${adminId}`

  const response = NextResponse.json({ ok: true, adminId, role })
  response.cookies.set("__session", idToken, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  })

  // Store RBAC payload in a separate readable cookie for the client layout
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
