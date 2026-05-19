import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requirePermission } from "@/lib/admin-rbac"

/**
 * GET /api/admin/employees/departments
 * Returns all departments (active ones by default).
 * Requires: employees/view
 */
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "employees", "view")
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const all = searchParams.get("all") === "1"

  const rows = await sql`
    SELECT
      d.id, d.name, d.description, d.is_active, d.created_at,
      e.id AS head_id, e.full_name AS head_name,
      COUNT(emp.id)::int AS employee_count
    FROM departments d
    LEFT JOIN employees e ON e.id = d.head_employee_id
    LEFT JOIN employees emp ON emp.department_id = d.id AND emp.status = 'active'
    WHERE ${all ? sql`TRUE` : sql`d.is_active = TRUE`}
    GROUP BY d.id, e.id
    ORDER BY d.name ASC
  `

  const departments = rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    isActive: r.is_active,
    employeeCount: r.employee_count,
    headEmployee: r.head_id ? { id: r.head_id, fullName: r.head_name } : undefined,
  }))

  return NextResponse.json({ departments })
}

/**
 * POST /api/admin/employees/departments
 * Creates a new department.
 * Requires: employees/edit
 */
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "employees", "edit")
  if (auth instanceof NextResponse) return auth

  const { name, description, headEmployeeId } = await req.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  const existing = await sql`SELECT id FROM departments WHERE name ILIKE ${name.trim()}`
  if (existing.length) {
    return NextResponse.json({ error: "A department with this name already exists" }, { status: 409 })
  }

  const rows = await sql`
    INSERT INTO departments (name, description, head_employee_id)
    VALUES (${name.trim()}, ${description ?? null}, ${headEmployeeId ?? null})
    RETURNING id
  `

  return NextResponse.json({ ok: true, departmentId: rows[0].id }, { status: 201 })
}
