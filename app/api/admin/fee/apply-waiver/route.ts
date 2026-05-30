import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/admin-rbac"
import { applyFeeWaiver, type ApplyFeeWaiverParams } from "@/lib/fee-waiver"

/**
 * POST /api/admin/fee/apply-waiver
 *
 * Applies a fee waiver to a specific installment or distributes it
 * proportionally across all unpaid installments of an enrollment.
 *
 * Body:
 *  - enrollmentId: string
 *  - installmentId?: string | null  — omit or null = entire course
 *  - waiverType: "full" | "partial"
 *  - waiverAmount: number            — ignored for full waivers
 *  - reason: string
 *  - internalNotes?: string
 *  - studentId: string
 */
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "accounts", "create")
  if (auth instanceof NextResponse) return auth

  const adminId = auth.adminId as string

  try {
    const body = await req.json()

    const {
      enrollmentId,
      installmentId = null,
      waiverType,
      waiverAmount,
      reason,
      internalNotes = null,
      studentId,
    } = body as {
      enrollmentId: string
      installmentId?: string | null
      waiverType: "full" | "partial"
      waiverAmount: number
      reason: ApplyFeeWaiverParams["reason"]
      internalNotes?: string
      studentId: string
    }

    // Basic validation
    if (!enrollmentId || !waiverType || !reason || !studentId) {
      return NextResponse.json(
        { error: "enrollmentId, waiverType, reason, and studentId are required" },
        { status: 400 },
      )
    }
    if (waiverType === "partial" && (!waiverAmount || waiverAmount <= 0)) {
      return NextResponse.json(
        { error: "waiverAmount must be greater than 0 for partial waivers" },
        { status: 400 },
      )
    }

    await applyFeeWaiver({
      enrollmentId,
      installmentId: installmentId ?? null,
      waiverType,
      waiverAmount: waiverAmount ?? 0,
      reason,
      internalNotes: internalNotes ?? null,
      adminId,
      studentId,
    })

    const target =
      installmentId ? "installment" : "all unpaid installments"
    return NextResponse.json({
      ok: true,
      message: `Fee waiver applied to ${target} successfully.`,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to apply waiver"
    console.error("[fee/apply-waiver] Error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
