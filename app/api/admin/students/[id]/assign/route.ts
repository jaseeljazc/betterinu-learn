import { NextRequest, NextResponse } from "next/server"
import { extractToken, verifyAdminToken } from "@/lib/auth"
import { sql } from "@/lib/db"

/**
 * POST /api/admin/students/[id]/assign
 *
 * Assigns a course to a student and persists the fee plan.
 * If payment_type = 'installment', generates student_installments rows.
 * If a waiver is provided, inserts a student_fee_waivers row and
 * adjusts the first installment's paid_amount accordingly.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token =
    extractToken(req.headers.get("authorization")) ??
    req.cookies.get("__session")?.value ??
    ""
  const adminSession = await verifyAdminToken(token)
  if (!adminSession)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const adminId = adminSession.adminId

  const { id: studentId } = await params
  const body = await req.json()

  const {
    courseId,
    payment_type,
    plan_start_date,
    is_plan_customized,
    custom_installment_count,
    custom_installment_amount,
    waiver,
  } = body

  if (!courseId)
    return NextResponse.json({ error: "courseId is required" }, { status: 400 })

  try {
    // Check if enrollment already exists and has payments
    const existingEnrollments = await sql`
      SELECT id FROM student_courses
      WHERE student_id = ${studentId} AND course_id = ${courseId}
    `
    if (existingEnrollments.length > 0) {
      const enrollmentId = existingEnrollments[0].id as string
      
      const paymentLogCheck = await sql`
        SELECT COUNT(*)::int AS count FROM student_payment_logs
        WHERE enrollment_id = ${enrollmentId}
      `
      if (paymentLogCheck[0].count > 0) {
        return NextResponse.json(
          { error: "Cannot reconfigure payment plan once payments have been recorded." },
          { status: 400 }
        )
      }

      const installmentCheck = await sql`
        SELECT COUNT(*)::int AS count FROM student_installments
        WHERE enrollment_id = ${enrollmentId}
          AND (paid_amount > 0 OR status IN ('paid', 'partially_paid', 'waived'))
      `
      if (installmentCheck[0].count > 0) {
        return NextResponse.json(
          { error: "Cannot reconfigure payment plan once payments have been recorded." },
          { status: 400 }
        )
      }
    }

    // ── 1. Upsert the enrollment row with fee plan columns ─────────────────
    await sql`
      INSERT INTO student_courses (
        student_id, course_id,
        payment_type, plan_start_date,
        is_plan_customized,
        custom_installment_count, custom_installment_amount
      )
      VALUES (
        ${studentId}, ${courseId},
        ${payment_type ?? null},
        ${plan_start_date ?? null},
        ${is_plan_customized ?? false},
        ${custom_installment_count ?? null},
        ${custom_installment_amount ?? null}
      )
      ON CONFLICT (student_id, course_id) DO UPDATE SET
        payment_type             = EXCLUDED.payment_type,
        plan_start_date          = EXCLUDED.plan_start_date,
        is_plan_customized       = EXCLUDED.is_plan_customized,
        custom_installment_count  = EXCLUDED.custom_installment_count,
        custom_installment_amount = EXCLUDED.custom_installment_amount
    `

    // ── 2. Fetch the enrollment UUID ───────────────────────────────────────
    const enrollments = await sql`
      SELECT id FROM student_courses
      WHERE student_id = ${studentId} AND course_id = ${courseId}
    `
    const enrollmentId = enrollments[0]?.id as string
    if (!enrollmentId) throw new Error("Enrollment row not found after insert")

    // ── 3. Fetch course fee defaults ───────────────────────────────────────
    const courses = await sql`
      SELECT one_time_price, installment_total_price,
             default_installment_count, default_installment_amount,
             grace_period_days
      FROM courses WHERE id = ${courseId}
    `
    const course = courses[0]

    // ── 3.5 Calculate waiver details ───────────────────────────────────────
    let waiverAmount = 0
    let isFullWaiver = false
    if (waiver && waiver.reason) {
      if (waiver.waiverType === "full") {
        isFullWaiver = true
      } else {
        waiverAmount = Number(waiver.amount ?? 0)
      }
    }

    // ── 4. Generate installment schedule ───────────────────────────────────
    if (payment_type === "installment" && plan_start_date) {
      const count =
        is_plan_customized && custom_installment_count
          ? custom_installment_count
          : (course?.default_installment_count ?? 1)

      // Calculate original total price and remaining total
      let originalTotalPrice = Number(course?.installment_total_price ?? 0)
      let remainingTotal = 0

      if (is_plan_customized && custom_installment_amount) {
        if (isFullWaiver) {
          waiverAmount = Number(course?.installment_total_price ?? 0)
          remainingTotal = 0
          originalTotalPrice = waiverAmount
        } else {
          remainingTotal = Number(custom_installment_amount) * count
          originalTotalPrice = remainingTotal + waiverAmount
        }
      } else {
        originalTotalPrice = Number(course?.installment_total_price ?? 0)
        if (isFullWaiver) {
          waiverAmount = originalTotalPrice
        }
        remainingTotal = Math.max(0, originalTotalPrice - waiverAmount)
      }

      const isEffectivelyFullyWaived = remainingTotal === 0 && originalTotalPrice > 0

      // Calculate per-installment amount
      const amountPerInstallment = isEffectivelyFullyWaived
        ? (originalTotalPrice / count)
        : (remainingTotal / count)

      // Delete any existing installments for this enrollment (re-assignment)
      await sql`DELETE FROM student_installments WHERE enrollment_id = ${enrollmentId}`

      const start = new Date(plan_start_date)
      for (let i = 0; i < count; i++) {
        const due = new Date(start)
        due.setMonth(due.getMonth() + i)
        const dueStr = due.toISOString().split("T")[0]

        const totalAmount = amountPerInstallment
        const paidAmount = isEffectivelyFullyWaived ? totalAmount : 0
        const status = isEffectivelyFullyWaived ? "waived" : "upcoming"
        const isAuto = isEffectivelyFullyWaived ? false : true

        await sql`
          INSERT INTO student_installments (
            enrollment_id, installment_number, due_date,
            total_amount, paid_amount, status, is_status_auto_calculated
          ) VALUES (
            ${enrollmentId}, ${i + 1}, ${dueStr},
            ${totalAmount}, ${paidAmount}, ${status}, ${isAuto}
          )
        `
      }
    } else if (payment_type === "one_time" && plan_start_date) {
      const originalTotalPrice = Number(course?.one_time_price ?? 0)
      if (isFullWaiver) {
        waiverAmount = originalTotalPrice
      }
      const remainingTotal = Math.max(0, originalTotalPrice - waiverAmount)
      const isEffectivelyFullyWaived = remainingTotal === 0 && originalTotalPrice > 0

      const totalAmount = originalTotalPrice
      const paidAmount = isEffectivelyFullyWaived ? totalAmount : 0
      const status = isEffectivelyFullyWaived ? "waived" : "upcoming"
      const isAuto = isEffectivelyFullyWaived ? false : true

      // If partial waiver, the installment amount is the remaining total
      const installmentAmount = isEffectivelyFullyWaived ? totalAmount : remainingTotal

      await sql`DELETE FROM student_installments WHERE enrollment_id = ${enrollmentId}`
      await sql`
        INSERT INTO student_installments (
          enrollment_id, installment_number, due_date,
          total_amount, paid_amount, status, is_status_auto_calculated
        ) VALUES (
          ${enrollmentId}, 1, ${plan_start_date},
          ${installmentAmount}, ${paidAmount}, ${status}, ${isAuto}
        )
      `
    }

    // ── 5. Apply waiver if provided ────────────────────────────────────────
    if (waiver && waiver.reason) {
      await sql`
        INSERT INTO student_fee_waivers (
          enrollment_id, installment_id,
          waiver_type, waiver_amount, reason, internal_notes, approved_by
        ) VALUES (
          ${enrollmentId},
          NULL,
          ${waiver.waiverType},
          ${waiverAmount},
          ${waiver.reason},
          ${waiver.notes ?? null},
          ${adminId}
        )
      `
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Database error"
    console.error("[assign] Error:", msg)
    return NextResponse.json({ error: msg }, { status: 422 })
  }
}
