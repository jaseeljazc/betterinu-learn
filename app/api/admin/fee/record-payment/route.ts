import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/admin-rbac"
import { recordFeePayment } from "@/lib/fee-payment"

/**
 * POST /api/admin/fee/record-payment
 * Records a student installment payment. Used by the student detail page.
 */
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "accounts", "create")
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
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
    s3Key,
  } = body

  if (!installmentId || !studentId || !enrollmentId)
    return NextResponse.json(
      { error: "installmentId, studentId, and enrollmentId are required" },
      { status: 400 },
    )

  if (!amount || Number(amount) <= 0)
    return NextResponse.json({ error: "Amount must be positive" }, { status: 400 })

  if (!paymentDate)
    return NextResponse.json({ error: "Payment date is required" }, { status: 400 })

  if (!accountId)
    return NextResponse.json({ error: "accountId is required" }, { status: 400 })

  const validModes = ["cash", "upi", "bank_transfer", "cheque", "other"]
  if (!validModes.includes(paymentMode))
    return NextResponse.json({ error: "Invalid payment mode" }, { status: 400 })

  try {
    const adminId =
      auth.adminId === "super_admin_bootstrap" ? null : auth.adminId

    const result = await recordFeePayment({
      installmentId,
      studentId,
      enrollmentId,
      amount: Number(amount),
      paymentDate,
      paymentMode,
      referenceNumber: referenceNumber || null,
      notes: notes || null,
      accountId,
      categoryId: categoryId || null,
      adminId: adminId ?? "",
      s3Key: s3Key || null,
    })

    return NextResponse.json({
      ok: true,
      ...result,
      message:
        result.overpayment > 0
          ? `Payment recorded. Note: overpayment of ₹${result.overpayment.toFixed(2)}.`
          : "Payment recorded successfully.",
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Database error"
    console.error("[record-payment] Error:", msg)
    return NextResponse.json({ error: msg }, { status: 422 })
  }
}
