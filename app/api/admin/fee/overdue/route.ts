import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requirePermission } from "@/lib/admin-rbac"

/**
 * GET /api/admin/fee/overdue
 *
 * Returns all installments that are effectively overdue — computed dynamically
 * from due_date + grace_period_days rather than the stored `status` column.
 *
 * Status derivation rule per installment:
 *   - When is_status_auto_calculated = false  → use stored status
 *   - Otherwise, derive:
 *       paid_amount >= total_amount            → "paid"
 *       paid_amount > 0                        → "partially_paid"
 *       CURRENT_DATE > due_date + grace_period → "overdue"
 *       else                                   → "upcoming"
 *
 * Only rows whose effective status is "overdue" or "partially_paid" AND whose
 * due date is past the grace period are returned.
 *
 * Query params:
 *   courseId        — filter to a single course (optional)
 *   minDaysOverdue  — integer, skip rows with fewer days overdue (optional)
 */
export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "accounts", "view")
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const courseId = searchParams.get("courseId")
  const minDaysOverdue = parseInt(searchParams.get("minDaysOverdue") ?? "0") || 0

  try {
    // ── Main overdue query ────────────────────────────────────────────────────
    //
    // effective_status is computed inline so the dashboard never goes stale
    // waiting for a cron recalculation job.
    //
    // grace_period_days comes from courses.grace_period_days (may be NULL → 0).
    // total_installments is the count of installments in the same enrollment.
    const rows = await sql`
      WITH installment_counts AS (
        SELECT enrollment_id, COUNT(*)::int AS total_installments
        FROM student_installments
        GROUP BY enrollment_id
      ),
      computed AS (
        SELECT
          si.id                                         AS installment_id,
          si.enrollment_id,
          si.installment_number,
          si.due_date::text                             AS due_date,
          si.total_amount::float                        AS total_amount,
          si.paid_amount::float                         AS paid_amount,
          (si.total_amount - si.paid_amount)::float     AS balance_due,
          si.waiver_reduction::float                    AS waiver_reduction,
          si.overpayment_reduction::float               AS overpayment_reduction,
          si.is_status_auto_calculated,
          si.status                                     AS stored_status,

          -- grace period: fall back to 0 if NULL
          COALESCE(c.grace_period_days, 0)              AS grace_period_days,

          -- days past deadline (after grace) — negative means not yet due
          (CURRENT_DATE - (si.due_date + COALESCE(c.grace_period_days, 0)))::int
                                                        AS days_overdue,

          -- dynamic effective status
          CASE
            WHEN si.is_status_auto_calculated = false   THEN si.status
            WHEN si.paid_amount >= si.total_amount       THEN 'paid'
            WHEN CURRENT_DATE <= (si.due_date + COALESCE(c.grace_period_days, 0))
              THEN CASE
                     WHEN si.paid_amount > 0 THEN 'partially_paid'
                     ELSE 'upcoming'
                   END
            ELSE
              CASE
                WHEN si.paid_amount > 0 THEN 'partially_paid'
                ELSE 'overdue'
              END
          END                                           AS effective_status,

          -- student info
          st.id                                         AS student_id,
          st.name                                       AS student_name,

          -- course info
          sc.course_id,
          c.title                                       AS course_title,

          -- total installments in this enrollment
          ic.total_installments

        FROM student_installments si
        JOIN student_courses sc ON sc.id = si.enrollment_id
        JOIN courses c           ON c.id::text = sc.course_id
        JOIN students st         ON st.id = sc.student_id
        JOIN installment_counts ic ON ic.enrollment_id = si.enrollment_id
        WHERE sc.payment_type = 'installment'
      )
      SELECT *
      FROM computed
      WHERE
        -- only rows that are past the grace deadline
        days_overdue > 0
        AND effective_status IN ('overdue', 'partially_paid')
        ${courseId ? sql`AND course_id = ${courseId}` : sql``}
        ${minDaysOverdue > 0 ? sql`AND days_overdue >= ${minDaysOverdue}` : sql``}
      ORDER BY days_overdue DESC, balance_due DESC
    `

    // ── Summary stats ─────────────────────────────────────────────────────────

    // Total unique students with any effective overdue installment
    const uniqueStudents = new Set<string>()
    let totalOverdueAmount = 0

    // "this month" = due_date in current calendar month AND days_overdue > 0
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    let overdueThisMonth = 0

    const result = rows.map((r) => {
      uniqueStudents.add(r.student_id as string)
      const balance = Number(r.balance_due)
      totalOverdueAmount += balance

      const dueDateStr = (r.due_date as string).slice(0, 7) // "YYYY-MM"
      if (dueDateStr === thisMonth) overdueThisMonth++

      return {
        installmentId: r.installment_id as string,
        enrollmentId: r.enrollment_id as string,
        installmentNumber: r.installment_number as number,
        totalInstallments: r.total_installments as number,
        dueDate: r.due_date as string,
        totalAmount: Number(r.total_amount),
        paidAmount: Number(r.paid_amount),
        balanceDue: balance,
        waiverReduction: Number(r.waiver_reduction || 0),
        overpaymentReduction: Number(r.overpayment_reduction || 0),
        gracePeriodDays: Number(r.grace_period_days),
        daysOverdue: Number(r.days_overdue),
        effectiveStatus: r.effective_status as string,
        studentId: r.student_id as string,
        studentName: r.student_name as string,
        courseId: r.course_id as string,
        courseTitle: r.course_title as string,
      }
    })

    return NextResponse.json({
      summary: {
        totalStudents: uniqueStudents.size,
        totalOverdueAmount,
        overdueThisMonth,
      },
      rows: result,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Database error"
    console.error("[fee/overdue] Error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
