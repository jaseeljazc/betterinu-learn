/**
 * src/lib/fee-waiver.ts — Server-side fee waiver utility.
 *
 * Applies a full or partial waiver to one installment or distributes it
 * proportionally across all unpaid installments of an enrollment.
 *
 * A waiver reduces `total_amount` (what is owed) — it is NOT a payment.
 * It does not touch `paid_amount`. Each reduced installment gets a
 * corresponding `student_payment_logs` row with `entry_type = 'waiver'`
 * and a `student_fee_waivers` row at the enrollment or installment level.
 */

import { sql } from "@/lib/db"
import { recalculateInstallmentStatus } from "@/lib/fee-management"

export type ApplyFeeWaiverParams = {
  enrollmentId: string
  /** null means distribute across the entire course's unpaid installments */
  installmentId: string | null
  waiverType: "full" | "partial"
  /** Monetary amount to waive in total */
  waiverAmount: number
  reason:
    | "merit"
    | "financial_need"
    | "staff_child"
    | "special_circumstance"
    | "management_decision"
    | "other"
  internalNotes: string | null
  adminId: string
  studentId: string
}

type InstallmentRow = {
  id: string
  totalAmount: number
  paidAmount: number
  remainingBalance: number
}

/**
 * Applies a fee waiver to one installment or distributes it proportionally
 * across all unpaid installments.
 *
 * @throws if `waiverAmount` exceeds the total remaining balance of the targets
 */
export async function applyFeeWaiver(
  params: ApplyFeeWaiverParams,
): Promise<void> {
  const {
    enrollmentId,
    installmentId,
    waiverType,
    waiverAmount,
    reason,
    internalNotes,
    adminId,
    studentId,
  } = params

  // ── 1. Fetch target installment(s) ────────────────────────────────────────

  let targets: InstallmentRow[]

  if (installmentId) {
    // Single installment
    const rows = await sql`
      SELECT
        id,
        total_amount::float AS total_amount,
        paid_amount::float  AS paid_amount
      FROM student_installments
      WHERE id = ${installmentId}
        AND enrollment_id = ${enrollmentId}
    `
    if (!rows.length) {
      throw new Error("Installment not found")
    }
    const r = rows[0]
    const totalAmount = Number(r.total_amount)
    const paidAmount = Number(r.paid_amount)
    targets = [
      {
        id: r.id as string,
        totalAmount,
        paidAmount,
        remainingBalance: totalAmount - paidAmount,
      },
    ]
  } else {
    // All unpaid installments for the enrollment
    const rows = await sql`
      SELECT
        id,
        total_amount::float AS total_amount,
        paid_amount::float  AS paid_amount
      FROM student_installments
      WHERE enrollment_id = ${enrollmentId}
        AND status NOT IN ('paid', 'waived')
        AND total_amount > paid_amount
      ORDER BY installment_number
    `
    targets = rows.map((r) => {
      const totalAmount = Number(r.total_amount)
      const paidAmount = Number(r.paid_amount)
      return {
        id: r.id as string,
        totalAmount,
        paidAmount,
        remainingBalance: totalAmount - paidAmount,
      }
    })
    if (!targets.length) {
      throw new Error("No unpaid installments to apply a waiver to")
    }
  }

  const totalRemaining = targets.reduce((s, t) => s + t.remainingBalance, 0)

  // For a full waiver, we waive the entire remaining balance
  const effectiveWaiverAmount =
    waiverType === "full" ? totalRemaining : waiverAmount

  if (effectiveWaiverAmount <= 0) {
    throw new Error("Waiver amount must be greater than 0")
  }
  if (effectiveWaiverAmount > totalRemaining + 0.01) {
    throw new Error(
      `Waiver amount (₹${effectiveWaiverAmount.toFixed(2)}) exceeds remaining balance (₹${totalRemaining.toFixed(2)})`,
    )
  }

  // ── 2. Compute per-installment reduction amounts ───────────────────────────

  type Allocation = { installment: InstallmentRow; reduction: number }
  const allocations: Allocation[] = []

  if (waiverType === "full") {
    // Full waiver: zero out all remaining balances
    for (const inst of targets) {
      allocations.push({ installment: inst, reduction: inst.remainingBalance })
    }
  } else if (targets.length === 1) {
    // Single installment partial waiver
    allocations.push({
      installment: targets[0],
      reduction: Math.min(effectiveWaiverAmount, targets[0].remainingBalance),
    })
  } else {
    // Proportional distribution across multiple installments
    let remaining = effectiveWaiverAmount
    for (let i = 0; i < targets.length; i++) {
      const inst = targets[i]
      const isLast = i === targets.length - 1
      let share: number
      if (isLast) {
        // Remainder goes to last to avoid floating-point drift
        share = Math.min(remaining, inst.remainingBalance)
      } else {
        share = Math.min(
          Math.round(
            (inst.remainingBalance / totalRemaining) *
              effectiveWaiverAmount *
              100,
          ) / 100,
          inst.remainingBalance,
        )
        remaining -= share
      }
      if (share > 0) {
        allocations.push({ installment: inst, reduction: share })
      }
    }
  }

  // ── 3. Apply reductions to each installment ────────────────────────────────

  for (const { installment, reduction } of allocations) {
    const newTotalAmount = Math.max(
      0,
      Math.round((installment.totalAmount - reduction) * 100) / 100,
    )
    const willBeFullyWaived = newTotalAmount <= installment.paidAmount

    await sql`
      UPDATE student_installments
      SET
        total_amount      = ${newTotalAmount},
        waiver_reduction  = waiver_reduction + ${reduction},
        status            = CASE
                              WHEN ${willBeFullyWaived} THEN 'waived'
                              ELSE status
                            END,
        is_status_auto_calculated = CASE
                                      WHEN ${willBeFullyWaived} THEN FALSE
                                      ELSE is_status_auto_calculated
                                    END,
        updated_at        = NOW()
      WHERE id = ${installment.id}
    `

    // Only run auto-recalculation if we didn't manually lock the status
    if (!willBeFullyWaived) {
      await recalculateInstallmentStatus(installment.id)
    }

    // Audit log entry (entry_type = 'waiver', payment_mode = 'other' as sentinel)
    await sql`
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
        ${installment.id},
        ${enrollmentId},
        ${studentId},
        ${reduction},
        NOW(),
        'other',
        ${adminId},
        ${internalNotes ?? null},
        'waiver'
      )
    `
  }

  // ── 4. Insert student_fee_waivers record ───────────────────────────────────

  await sql`
    INSERT INTO student_fee_waivers (
      enrollment_id,
      installment_id,
      waiver_type,
      waiver_amount,
      reason,
      internal_notes,
      approved_by
    ) VALUES (
      ${enrollmentId},
      ${installmentId ?? null},
      ${waiverType},
      ${effectiveWaiverAmount},
      ${reason},
      ${internalNotes ?? null},
      ${adminId}
    )
  `
}
