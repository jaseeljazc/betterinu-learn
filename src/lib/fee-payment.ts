/**
 * lib/fee-payment.ts — Shared server-side utility for recording a student fee payment.
 *
 * Called by both:
 *   - POST /api/admin/fee/record-payment  (from student detail page)
 *   - POST /api/admin/accounts/transactions  (from financial panel, when student fee)
 *
 * What this does:
 *   1. Fetches the installment to validate it exists and compute remaining balance
 *   2. Detects overpayment and auto-appends a note
 *   3. Updates student_installments.paid_amount
 *   4. Inserts a student_payment_logs row
 *   5. Calls recalculateInstallmentStatus
 *   6. Inserts an account_transactions row (income, linked to student/enrollment/installment)
 *   7. Recalculates the account balance
 */

import { sql } from "@/lib/db"
import { recalculateInstallmentStatus } from "@/lib/fee-management"

export type RecordFeePaymentParams = {
  installmentId: string
  studentId: string
  enrollmentId: string
  amount: number
  paymentDate: string
  paymentMode: "cash" | "upi" | "bank_transfer" | "cheque" | "other"
  referenceNumber?: string | null
  notes?: string | null
  accountId: string
  categoryId?: string | null
  adminId: string
  s3Key?: string | null
}

export type RecordFeePaymentResult = {
  transactionId: string
  paymentLogId: string
  overpayment: number
  newPaidAmount: number
  newStatus: string
}

export async function recordFeePayment(
  params: RecordFeePaymentParams,
): Promise<RecordFeePaymentResult> {
  const {
    installmentId,
    studentId,
    enrollmentId,
    amount,
    paymentDate,
    paymentMode,
    referenceNumber,
    notes,
    accountId,
    categoryId,
    adminId,
    s3Key,
  } = params

  // ── 1. Fetch the installment ───────────────────────────────────────────────
  const installments = await sql`
    SELECT id, total_amount, paid_amount, status
    FROM student_installments
    WHERE id = ${installmentId}
  `

  if (!installments.length) {
    throw new Error(`Installment ${installmentId} not found`)
  }

  const inst = installments[0]
  const totalAmount = Number(inst.total_amount)
  const currentPaid = Number(inst.paid_amount)
  const remaining = totalAmount - currentPaid

  // ── 2. Overpayment and Cascading Logic ─────────────────────────────────────
  const overpayment = Math.max(0, amount - remaining)
  let finalNotes = notes ?? null
  const distributionDetails: string[] = []
  let newPaidAmount = 0

  if (overpayment > 0) {
    // Fully pay the current installment
    newPaidAmount = totalAmount
    await sql`
      UPDATE student_installments
      SET paid_amount = ${newPaidAmount},
          updated_at  = NOW()
      WHERE id = ${installmentId}
    `

    // Cascading logic to subsequent installments
    let excess = overpayment

    // Fetch subsequent installments
    const subsequentInstallments = await sql`
      SELECT id, installment_number, total_amount, paid_amount
      FROM student_installments
      WHERE enrollment_id = ${enrollmentId} AND id != ${installmentId}
      ORDER BY installment_number
    `

    for (const sub of subsequentInstallments) {
      if (excess <= 0) break

      const subTotal = Number(sub.total_amount)
      const subPaid = Number(sub.paid_amount)
      const subRemaining = subTotal - subPaid

      if (excess < subRemaining) {
        const newTotal = subTotal - excess
        await sql`
          UPDATE student_installments
          SET total_amount = ${newTotal},
              overpayment_reduction = overpayment_reduction + ${excess},
              updated_at = NOW()
          WHERE id = ${sub.id}
        `
        await recalculateInstallmentStatus(sub.id as string)
        distributionDetails.push(
          `₹${excess.toFixed(2)} applied to Installment #${sub.installment_number} (total reduced from ₹${subTotal.toFixed(2)} to ₹${newTotal.toFixed(2)})`
        )
        excess = 0
      } else {
        // Fully absorbed. We set total_amount to 0, paid_amount to 0, status to 'waived', and disable auto-recalculation.
        await sql`
          UPDATE student_installments
          SET total_amount = 0,
              paid_amount = 0,
              status = 'waived',
              is_status_auto_calculated = false,
              overpayment_reduction = overpayment_reduction + ${subRemaining},
              updated_at = NOW()
          WHERE id = ${sub.id}
        `
        distributionDetails.push(
          `Installment #${sub.installment_number} (₹${subTotal.toFixed(2)}) fully absorbed and set to waived (₹0)`
        )
        excess -= subRemaining
      }
    }

    // If any excess remaining after all installments are processed
    if (excess > 0) {
      distributionDetails.push(
        `Refund Required: Excess of ₹${excess.toFixed(2)} remaining with no future installments. Flagged for manual refund.`
      )
    }

    // Append distribution info to finalNotes
    const overplayNote = `[Overpayment: ${distributionDetails.join("; ")}]`
    finalNotes = finalNotes ? `${finalNotes} — ${overplayNote}` : overplayNote

  } else {
    // Normal payment logic (no overpayment)
    newPaidAmount = currentPaid + amount
    await sql`
      UPDATE student_installments
      SET paid_amount = ${newPaidAmount},
          updated_at  = NOW()
      WHERE id = ${installmentId}
    `
  }

  // ── 4. Insert payment log ──────────────────────────────────────────────────
  const logRows = await sql`
    INSERT INTO student_payment_logs (
      installment_id, enrollment_id, student_id,
      amount_paid, payment_date, payment_mode,
      reference_number, recorded_by, notes, entry_type
    ) VALUES (
      ${installmentId}, ${enrollmentId}, ${studentId},
      ${amount}, ${paymentDate}, ${paymentMode},
      ${referenceNumber ?? null}, ${adminId}, ${finalNotes}, 'payment'
    )
    RETURNING id
  `

  const paymentLogId = logRows[0].id as string

  // ── 5. Recalculate installment status ──────────────────────────────────────
  await recalculateInstallmentStatus(installmentId)

  // Fetch the updated status for the result
  const updatedRows = await sql`
    SELECT status FROM student_installments WHERE id = ${installmentId}
  `
  const newStatus = updatedRows[0]?.status as string

  // ── 6. Create account transaction ─────────────────────────────────────────
  let finalCategoryId = categoryId || null
  if (!finalCategoryId) {
    const catRows = await sql`
      SELECT id FROM account_categories
      WHERE (name = 'Student Fees' OR name = 'Student Fee' OR name ILIKE 'student fee%') AND type = 'income'
      LIMIT 1
    `
    if (catRows.length > 0) {
      finalCategoryId = catRows[0].id as string
    }
  }

  const txRows = await sql`
    INSERT INTO account_transactions (
      type, account_id, category_id, amount, date,
      description, reference_number, status,
      created_by, student_id, enrollment_id, installment_id
    ) VALUES (
      'income', ${accountId}, ${finalCategoryId}, ${amount}, ${paymentDate},
      ${`Student fee payment — ${paymentMode}`},
      ${referenceNumber ?? null}, 'confirmed',
      ${adminId}, ${studentId}, ${enrollmentId}, ${installmentId}
    )
    RETURNING id
  `
  const transactionId = txRows[0].id as string

  // ── 6.5 Link S3 attachment if provided ─────────────────────────────────────
  if (s3Key) {
    await sql`
      UPDATE account_attachments
      SET transaction_id = ${transactionId}
      WHERE s3_key = ${s3Key} AND transaction_id IS NULL
    `
  }

  // ── 7. Recalculate account balance ─────────────────────────────────────────
  await sql`
    UPDATE accounts
    SET current_balance = (
      SELECT opening_balance FROM accounts WHERE id = ${accountId}
    ) + COALESCE((
      SELECT SUM(
        CASE
          WHEN type = 'income' THEN amount
          WHEN type = 'transfer' AND to_account_id = ${accountId} THEN amount
          WHEN type = 'expense' THEN -amount
          WHEN type = 'transfer' AND account_id = ${accountId} THEN -amount
          ELSE 0
        END
      )
      FROM account_transactions
      WHERE (account_id = ${accountId} OR to_account_id = ${accountId})
        AND status != 'void'
    ), 0)
    WHERE id = ${accountId}
  `

  return { transactionId, paymentLogId, overpayment, newPaidAmount, newStatus }
}
