/**
 * app/api/admin/employees/tasks/departments/route.ts
 *
 * GET /api/admin/employees/tasks/departments — list active departments for task context
 */
import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { resolveSession } from "@/lib/admin-rbac"

export async function GET(req: NextRequest) {
  try {
    const session = await resolveSession(req)
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    // Retrieve active departments for selection in task manager
    const rows = await sql`
      SELECT id, name
      FROM departments
      WHERE is_active = TRUE
      ORDER BY name ASC
    `

    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
      })),
    })
  } catch (err: any) {
    console.error("GET /api/admin/employees/tasks/departments:", err)
    return NextResponse.json({ success: false, error: err.message || "Internal server error" }, { status: 500 })
  }
}
