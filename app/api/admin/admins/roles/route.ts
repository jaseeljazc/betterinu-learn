import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireSuperAdmin } from "@/lib/admin-rbac"

/**
 * GET /api/admin/admins/roles
 * Returns all admin_roles (excluding super_admin) for use in forms.
 * Requires: super_admin
 */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth

  const rows = await sql`
    SELECT id, name, label, description, is_system
    FROM admin_roles
    ORDER BY
      CASE name
        WHEN 'admin'      THEN 1
        WHEN 'instructor' THEN 2
        WHEN 'support'    THEN 3
        ELSE 4
      END
  `

  return NextResponse.json({ roles: rows })
}
