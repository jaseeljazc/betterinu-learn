import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requirePermission } from "@/lib/admin-rbac"

/**
 * GET /api/admin/fee/payment-logs?studentId=X
 *
 * Returns all student_payment_logs for a student, enriched with:
 *   - admin name (admin_accounts.full_name) via recorded_by FK
 *   - installment number from student_installments
 *   - course title from student_courses + courses
 */
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "accounts", "view")
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const studentId = searchParams.get("studentId")

  if (!studentId)
    return NextResponse.json(
      { error: "studentId query param is required" },
      { status: 400 },
    )

  try {
    const rows = await sql`
      SELECT
        pl.id,
        pl.installment_id,
        pl.enrollment_id,
        pl.amount_paid::float       AS amount_paid,
        pl.payment_date::text       AS payment_date,
        pl.payment_mode,
        pl.reference_number,
        pl.notes,
        pl.entry_type,
        pl.created_at::text         AS created_at,
        aa.full_name                AS recorded_by_name,
        si.installment_number,
        c.title                     AS course_title
      FROM student_payment_logs pl
      LEFT JOIN admin_accounts aa ON aa.id = pl.recorded_by
      LEFT JOIN student_installments si ON si.id = pl.installment_id
      LEFT JOIN student_courses sc ON sc.id = pl.enrollment_id
      LEFT JOIN courses c ON c.id::text = sc.course_id
      WHERE pl.student_id = ${studentId}
      ORDER BY pl.payment_date DESC, pl.created_at DESC
    `

    const logs = rows.map((r) => ({
      id: r.id as string,
      installmentId: r.installment_id as string,
      enrollmentId: r.enrollment_id as string,
      amountPaid: Number(r.amount_paid),
      paymentDate: r.payment_date as string,
      paymentMode: r.payment_mode as string,
      referenceNumber: (r.reference_number as string | null) ?? null,
      notes: (r.notes as string | null) ?? null,
      entryType: r.entry_type as string,
      createdAt: r.created_at as string,
      recordedByName: (r.recorded_by_name as string | null) ?? "System",
      installmentNumber: (r.installment_number as number | null) ?? null,
      courseTitle: (r.course_title as string | null) ?? null,
    }))

    return NextResponse.json({ logs })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Database error"
    console.error("[fee/payment-logs GET] Error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * POST /api/admin/fee/payment-logs
 *
 * Creates an "adjustment" log entry with a negative amount.
 * Does NOT mutate student_installments — adjustment is purely an audit record.
 *
 * Body:
 *   installmentId  string
 *   enrollmentId   string
 *   studentId      string
 *   amount         number  (positive; will be stored as-is — represents the magnitude)
 *   notes          string  (required — must explain the correction)
 */
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "accounts", "create")
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const { installmentId, enrollmentId, studentId, amount, notes } = body

  if (!installmentId || !enrollmentId || !studentId)
    return NextResponse.json(
      { error: "installmentId, enrollmentId, and studentId are required" },
      { status: 400 },
    )

  if (!amount || Number(amount) <= 0)
    return NextResponse.json(
      { error: "Amount must be positive (it will be recorded as a negative adjustment)" },
      { status: 400 },
    )

  if (!notes || (notes as string).trim().length === 0)
    return NextResponse.json(
      { error: "Notes are required for adjustment entries" },
      { status: 400 },
    )

  const adminId =
    auth.adminId === "super_admin_bootstrap" ? null : auth.adminId

  if (!adminId)
    return NextResponse.json(
      { error: "Admin identity could not be resolved" },
      { status: 403 },
    )

  try {
    const rows = await sql`
      INSERT INTO student_payment_logs (
        installment_id,
        enrollment_id,
        student_id,
        amount_paid,
        payment_date,
        payment_mode,
        recorded_by,
        notes,
        entry_type
      ) VALUES (
        ${installmentId},
        ${enrollmentId},
        ${studentId},
        ${Number(amount)},
        NOW(),
        'other',
        ${adminId},
        ${(notes as string).trim()},
        'adjustment'
      )
      RETURNING id
    `

    return NextResponse.json({
      ok: true,
      logId: rows[0].id as string,
      message: "Adjustment recorded successfully.",
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Database error"
    console.error("[fee/payment-logs POST] Error:", msg)
    return NextResponse.json({ error: msg }, { status: 422 })
  }
}
