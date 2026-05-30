import { NextRequest, NextResponse } from "next/server"
import { extractToken, verifyStudentToken } from "@/lib/auth"
import { sql } from "@/lib/db"

/**
 * GET /api/student/fee
 *
 * Returns all fee enrollments for the authenticated student, including:
 *  - Enrollment & course metadata (payment type, customization, totals)
 *  - Per-installment rows (waiver_reduction, overpayment_reduction)
 *  - Payment history logs (entry_type = 'payment' only; internal admin notes excluded)
 */
export async function GET(req: NextRequest) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    ""
  const student = await verifyStudentToken(token)
  if (!student)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const studentId = student.studentId

  try {
    // ── 1. Fetch enrollments + installments ─────────────────────────────────
    const rows = await sql`
      SELECT
        sc.id                       AS enrollment_id,
        sc.course_id,
        sc.payment_type,
        sc.is_plan_customized,
        sc.plan_start_date::text    AS plan_start_date,
        c.title                     AS course_title,
        COALESCE(c.grace_period_days, 3) AS grace_period_days,
        si.id                       AS installment_id,
        si.installment_number,
        si.due_date::text           AS due_date,
        si.total_amount::float      AS total_amount,
        si.paid_amount::float       AS paid_amount,
        si.status,
        si.overpayment_reduction::float AS overpayment_reduction,
        si.waiver_reduction::float      AS waiver_reduction
      FROM student_courses sc
      JOIN courses c ON c.id::text = sc.course_id
      LEFT JOIN student_installments si ON si.enrollment_id = sc.id
      WHERE sc.student_id = ${studentId}
      ORDER BY sc.assigned_at, si.installment_number
    `

    // ── 2. Fetch payment logs (payments only, no internal notes) ────────────
    const logRows = await sql`
      SELECT
        pl.id,
        pl.enrollment_id,
        pl.installment_id,
        pl.amount_paid::float       AS amount_paid,
        pl.payment_date::text       AS payment_date,
        pl.payment_mode,
        pl.reference_number,
        pl.entry_type,
        pl.created_at::text         AS created_at
      FROM student_payment_logs pl
      WHERE pl.student_id = ${studentId}
        AND pl.entry_type = 'payment'
      ORDER BY pl.payment_date DESC
    `

    // ── 3. Group logs by enrollment ─────────────────────────────────────────
    type PaymentLog = {
      id: string
      installmentId: string
      amountPaid: number
      paymentDate: string
      paymentMode: string
      referenceNumber: string | null
      entryType: string
    }

    const logsByEnrollment = new Map<string, PaymentLog[]>()
    for (const l of logRows) {
      const eid = l.enrollment_id as string
      if (!logsByEnrollment.has(eid)) logsByEnrollment.set(eid, [])
      logsByEnrollment.get(eid)!.push({
        id: l.id as string,
        installmentId: l.installment_id as string,
        amountPaid: Number(l.amount_paid),
        paymentDate: l.payment_date as string,
        paymentMode: l.payment_mode as string,
        referenceNumber: (l.reference_number as string | null) ?? null,
        entryType: l.entry_type as string,
      })
    }

    // ── 4. Group installments + metadata by enrollment ──────────────────────
    type Installment = {
      id: string
      installmentNumber: number
      dueDate: string
      totalAmount: number
      paidAmount: number
      remainingBalance: number
      status: string
      overpaymentReduction: number
      waiverReduction: number
    }

    type Enrollment = {
      enrollmentId: string
      courseId: string
      courseTitle: string
      paymentType: string
      isPlanCustomized: boolean
      planStartDate: string | null
      gracePeriodDays: number
      totalAmount: number
      paidAmount: number
      outstandingBalance: number
      totalWaiverReduction: number
      originalTotalAmount: number
      installments: Installment[]
      paymentLogs: PaymentLog[]
    }

    const enrollmentMap = new Map<string, Enrollment>()

    for (const r of rows) {
      const eid = r.enrollment_id as string
      if (!enrollmentMap.has(eid)) {
        enrollmentMap.set(eid, {
          enrollmentId: eid,
          courseId: r.course_id as string,
          courseTitle: r.course_title as string,
          paymentType: r.payment_type as string,
          isPlanCustomized: Boolean(r.is_plan_customized),
          planStartDate: (r.plan_start_date as string | null) ?? null,
          gracePeriodDays: Number(r.grace_period_days),
          totalAmount: 0,
          paidAmount: 0,
          outstandingBalance: 0,
          totalWaiverReduction: 0,
          originalTotalAmount: 0,
          installments: [],
          paymentLogs: logsByEnrollment.get(eid) ?? [],
        })
      }

      if (r.installment_id) {
        const totalAmount = Number(r.total_amount)
        const paidAmount = Number(r.paid_amount)
        const waiverReduction = Number(r.waiver_reduction || 0)
        const overpaymentReduction = Number(r.overpayment_reduction || 0)

        const entry = enrollmentMap.get(eid)!
        entry.installments.push({
          id: r.installment_id as string,
          installmentNumber: r.installment_number as number,
          dueDate: r.due_date as string,
          totalAmount,
          paidAmount,
          remainingBalance: totalAmount - paidAmount,
          status: r.status as string,
          overpaymentReduction,
          waiverReduction,
        })

        entry.totalAmount += totalAmount
        entry.paidAmount += paidAmount
        entry.outstandingBalance += totalAmount - paidAmount
        entry.totalWaiverReduction += waiverReduction
        // Original = current total + waiver reductions that were applied
        entry.originalTotalAmount = entry.totalAmount + entry.totalWaiverReduction
      }
    }

    const enrollments = Array.from(enrollmentMap.values())
    return NextResponse.json({ enrollments })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Database error"
    console.error("[student/fee] Error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
