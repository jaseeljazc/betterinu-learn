import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requirePermission } from "@/lib/admin-rbac"

/**
 * GET /api/admin/employees/departments/[id]
 * Returns a single department.
 * Requires: employees/view
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(req, "employees", "view")
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const rows = await sql`
    SELECT d.id, d.name, d.description, d.is_active,
      e.id AS head_id, e.full_name AS head_name
    FROM departments d
    LEFT JOIN employees e ON e.id = d.head_employee_id
    WHERE d.id = ${id}
    LIMIT 1
  `

  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const r = rows[0]
  return NextResponse.json({
    department: {
      id: r.id, name: r.name, description: r.description, isActive: r.is_active,
      headEmployee: r.head_id ? { id: r.head_id, fullName: r.head_name } : undefined,
    },
  })
}

/**
 * PATCH /api/admin/employees/departments/[id]
 * Updates or soft-deactivates a department.
 * Requires: employees/edit
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(req, "employees", "edit")
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const { name, description, headEmployeeId, isActive } = await req.json()

  await sql`
    UPDATE departments SET
      name               = COALESCE(${name ?? null}, name),
      description        = ${description ?? null},
      head_employee_id   = ${headEmployeeId ?? null},
      is_active          = COALESCE(${isActive ?? null}, is_active)
    WHERE id = ${id}
  `

  return NextResponse.json({ ok: true })
}
