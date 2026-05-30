import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requirePermission } from "@/lib/admin-rbac"

/**
 * GET /api/admin/fee/enrolled-students
 *
 * Returns all students who have at least one installment-based enrollment,
 * with their enrollments (course title + summary stats).
 * Used by the financial panel's student-fee cascading dropdowns.
 */
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "accounts", "view")
  if (auth instanceof NextResponse) return auth

  try {
    const rows = await sql`
      SELECT DISTINCT ON (s.id)
        s.id            AS student_id,
        s.full_name,
        s.student_code,
        s.email
      FROM students s
      JOIN student_courses sc ON sc.student_id = s.id
      JOIN student_installments si ON si.enrollment_id = sc.id
      WHERE sc.payment_type = 'installment'
      ORDER BY s.id, s.full_name
    `

    const students = rows.map((r) => ({
      id: r.student_id as string,
      fullName: r.full_name as string,
      studentCode: r.student_code as string,
      email: r.email as string,
    }))

    return NextResponse.json({ students })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Database error"
    console.error("[fee/enrolled-students] Error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
