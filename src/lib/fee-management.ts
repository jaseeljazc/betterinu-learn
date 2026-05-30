/**
 * lib/fee-management.ts — Server-side fee management utilities.
 *
 * Core rule: installment status is ALWAYS derived from data, never set manually,
 * unless `is_status_auto_calculated = FALSE` (e.g. admin-applied waiver).
 *
 * Call `recalculateInstallmentStatus` after every payment, waiver, or adjustment
 * to keep the status column in sync with the actual paid_amount and due_date.
 */

import { sql } from "@/lib/db"

type InstallmentStatus =
  | "upcoming"
  | "paid"
  | "partially_paid"
  | "overdue"
  | "waived"

/**
 * Derives the correct installment status from the installment's financial
 * state and the course's grace period, then persists it.
 *
 * The function is a no-op if `is_status_auto_calculated = FALSE` — that flag
 * means an admin has manually locked the status (e.g. marked it "waived")
 * and it must not be overwritten by this utility.
 *
 * @param installmentId - UUID of the `student_installments` row to recalculate
 */
export async function recalculateInstallmentStatus(
  installmentId: string,
): Promise<void> {
  // Fetch the installment with the linked course's grace period in one query
  const rows = await sql`
    SELECT
      si.paid_amount,
      si.total_amount,
      si.due_date,
      si.is_status_auto_calculated,
      si.status AS current_status,
      COALESCE(c.grace_period_days, 3) AS grace_period_days
    FROM student_installments si
    JOIN student_courses      sc ON sc.id        = si.enrollment_id
    JOIN courses               c  ON c.id::text   = sc.course_id
    WHERE si.id = ${installmentId}
  `

  if (!rows.length) {
    throw new Error(
      `recalculateInstallmentStatus: installment ${installmentId} not found`,
    )
  }

  const row = rows[0]

  // Skip auto-calculation when the status was manually locked (e.g. waived)
  if (!row.is_status_auto_calculated) {
    return
  }

  const paidAmount = Number(row.paid_amount)
  const totalAmount = Number(row.total_amount)
  const gracePeriodDays = Number(row.grace_period_days)

  // Deadline = due_date + grace_period_days
  const dueDate = new Date(row.due_date as string)
  const deadline = new Date(dueDate)
  deadline.setDate(deadline.getDate() + gracePeriodDays)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let newStatus: InstallmentStatus

  if (paidAmount >= totalAmount) {
    newStatus = "paid"
  } else if (paidAmount > 0) {
    // Partially paid — may still be overdue if deadline has passed
    newStatus = today > deadline ? "overdue" : "partially_paid"
  } else if (today > deadline) {
    newStatus = "overdue"
  } else {
    newStatus = "upcoming"
  }

  // Only write if the status actually changed — avoids unnecessary writes
  if (newStatus === row.current_status) {
    return
  }

  await sql`
    UPDATE student_installments
    SET
      status     = ${newStatus},
      updated_at = NOW()
    WHERE id = ${installmentId}
  `
}

/**
 * Recalculates the status of every installment that belongs to an enrollment.
 * Useful after bulk operations (e.g. applying a full-course waiver).
 *
 * @param enrollmentId - UUID of the `student_courses` row
 */
export async function recalculateEnrollmentInstallments(
  enrollmentId: string,
): Promise<void> {
  const rows = await sql`
    SELECT id FROM student_installments
    WHERE enrollment_id = ${enrollmentId}
    ORDER BY installment_number
  `

  for (const row of rows) {
    await recalculateInstallmentStatus(row.id as string)
  }
}

/**
 * Generates a default installment schedule for an enrollment.
 * Inserts `installmentCount` rows into `student_installments`,
 * each due one calendar month apart starting from `planStartDate`.
 *
 * Call this immediately after an enrollment is created with payment_type = 'installment'.
 *
 * @param enrollmentId     - UUID of the `student_courses` row
 * @param installmentCount - Number of installments to generate
 * @param amountPerInstallment - Amount due per installment
 * @param planStartDate    - Date of the first installment due date
 */
export async function generateInstallmentSchedule(
  enrollmentId: string,
  installmentCount: number,
  amountPerInstallment: number,
  planStartDate: Date,
): Promise<void> {
  if (installmentCount < 1) {
    throw new Error("installmentCount must be at least 1")
  }
  if (amountPerInstallment <= 0) {
    throw new Error("amountPerInstallment must be greater than 0")
  }

  for (let i = 0; i < installmentCount; i++) {
    const dueDate = new Date(planStartDate)
    dueDate.setMonth(dueDate.getMonth() + i)

    await sql`
      INSERT INTO student_installments (
        enrollment_id,
        installment_number,
        due_date,
        total_amount,
        paid_amount,
        status,
        is_status_auto_calculated
      )
      VALUES (
        ${enrollmentId},
        ${i + 1},
        ${dueDate.toISOString().split("T")[0]},
        ${amountPerInstallment},
        0,
        'upcoming',
        TRUE
      )
    `
  }
}
