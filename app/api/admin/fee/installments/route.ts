import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requirePermission } from "@/lib/admin-rbac"

/**
 * GET /api/admin/fee/installments?studentId=X
 *       /api/admin/fee/installments?enrollmentId=X
 *
 * Returns all enrollments (with their installments) for a student,
 * or the installments for a single enrollment.
 */
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "accounts", "view")
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const studentId = searchParams.get("studentId")
  const enrollmentId = searchParams.get("enrollmentId")

  if (!studentId && !enrollmentId)
    return NextResponse.json(
      { error: "studentId or enrollmentId query param is required" },
      { status: 400 },
    )

  try {
    if (enrollmentId) {
      // Installments for a single enrollment
      const rows = await sql`
        SELECT
          si.id,
          si.installment_number,
          si.due_date::text       AS due_date,
          si.total_amount::float  AS total_amount,
          si.paid_amount::float   AS paid_amount,
          si.status,
          si.is_status_auto_calculated,
          si.overpayment_reduction::float AS overpayment_reduction,
          si.waiver_reduction::float      AS waiver_reduction,
          si.created_at::text     AS created_at,
          si.updated_at::text     AS updated_at
        FROM student_installments si
        WHERE si.enrollment_id = ${enrollmentId}
        ORDER BY si.installment_number
      `

      const installments = rows.map((r) => ({
        id: r.id as string,
        installmentNumber: r.installment_number as number,
        dueDate: r.due_date as string,
        totalAmount: Number(r.total_amount),
        paidAmount: Number(r.paid_amount),
        remainingBalance: Number(r.total_amount) - Number(r.paid_amount),
        status: r.status as string,
        isStatusAutoCalculated: r.is_status_auto_calculated as boolean,
        overpaymentReduction: Number(r.overpayment_reduction || 0),
        waiverReduction: Number(r.waiver_reduction || 0),
      }))

      return NextResponse.json({ installments })
    }

    // Enrollments + installments for a student
    const rows = await sql`
      SELECT
        sc.id              AS enrollment_id,
        sc.course_id,
        sc.payment_type,
        sc.is_plan_customized,
        sc.plan_start_date::text AS plan_start_date,
        c.title            AS course_title,
        si.id              AS installment_id,
        si.installment_number,
        si.due_date::text  AS due_date,
        si.total_amount::float AS total_amount,
        si.paid_amount::float  AS paid_amount,
        si.status,
        si.is_status_auto_calculated,
        si.overpayment_reduction::float AS overpayment_reduction,
        si.waiver_reduction::float      AS waiver_reduction
      FROM student_courses sc
      JOIN courses c ON c.id::text = sc.course_id
      LEFT JOIN student_installments si ON si.enrollment_id = sc.id
      WHERE sc.student_id = ${studentId}
        AND sc.payment_type = 'installment'
      ORDER BY sc.id, si.installment_number
    `

    // Group by enrollment
    const enrollmentMap = new Map<
      string,
      {
        enrollmentId: string
        courseId: string
        courseTitle: string
        paymentType: string
        planStartDate: string | null
        installments: {
          id: string
          installmentNumber: number
          dueDate: string
          totalAmount: number
          paidAmount: number
          remainingBalance: number
          status: string
          overpaymentReduction: number
          waiverReduction: number
        }[]
      }
    >()

    for (const r of rows) {
      const eid = r.enrollment_id as string
      if (!enrollmentMap.has(eid)) {
        enrollmentMap.set(eid, {
          enrollmentId: eid,
          courseId: r.course_id as string,
          courseTitle: r.course_title as string,
          paymentType: r.payment_type as string,
          planStartDate: r.plan_start_date as string | null,
          installments: [],
        })
      }
      if (r.installment_id) {
        const totalAmount = Number(r.total_amount)
        const paidAmount = Number(r.paid_amount)
        enrollmentMap.get(eid)!.installments.push({
          id: r.installment_id as string,
          installmentNumber: r.installment_number as number,
          dueDate: r.due_date as string,
          totalAmount,
          paidAmount,
          remainingBalance: totalAmount - paidAmount,
          status: r.status as string,
          overpaymentReduction: Number(r.overpayment_reduction || 0),
          waiverReduction: Number(r.waiver_reduction || 0),
        })
      }
    }

    const enrollments = Array.from(enrollmentMap.values())
    return NextResponse.json({ enrollments })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Database error"
    console.error("[fee/installments] Error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
