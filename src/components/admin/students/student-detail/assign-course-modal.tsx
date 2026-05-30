"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import {
  CreditCard,
  CalendarDays,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react"

import { useAssignCourse } from "@/lib/hooks/useStudentDetail"
import { AssignInstallmentStep } from "./assign-installment-step"
import { AssignWaiverSection } from "./assign-waiver-section"
import type { CourseRow } from "./types"

export type AssignFeePlan = {
  paymentType: "one_time" | "installment"
  startDate: string
  isCustomized: boolean
  installmentCount: number
  installmentAmount: number
}

export type AssignWaiver = {
  waiverType: "full" | "partial"
  amount: number
  reason: string
  notes: string
}

type AssignCourseModalProps = {
  open: boolean
  onClose: () => void
  studentId: string
  course: CourseRow
}

function fmt(n: number | null | undefined) {
  if (n == null) return "—"
  return `₹${Number(n).toLocaleString("en-IN")}`
}

function today() {
  return new Date().toISOString().split("T")[0]
}

export function AssignCourseModal({
  open,
  onClose,
  studentId,
  course,
}: AssignCourseModalProps) {
  const hasFee =
    course.one_time_price != null && course.installment_total_price != null

  const savings =
    hasFee
      ? Number(course.installment_total_price) - Number(course.one_time_price)
      : 0

  // ── Step 1 state ────────────────────────────────────────────────────────────
  const [paymentType, setPaymentType] = useState<"one_time" | "installment">(
    "one_time",
  )

  // ── Step 2 state (installment) ───────────────────────────────────────────
  const defaultCount = Number(course.default_installment_count ?? 3)
  const defaultAmount =
    course.default_installment_amount != null
      ? Number(course.default_installment_amount)
      : course.installment_total_price
      ? Number(course.installment_total_price) / defaultCount
      : 0

  const [startDate, setStartDate] = useState(today())
  const [isCustomized, setIsCustomized] = useState(false)
  const [installmentCount, setInstallmentCount] = useState<number | "">(defaultCount)
  const [installmentAmount, setInstallmentAmount] = useState<number | "">(
    Number(defaultAmount.toFixed(2)),
  )

  // ── Waiver state ────────────────────────────────────────────────────────────
  const [waiver, setWaiver] = useState<AssignWaiver | null>(null)

  const waiverAmount = waiver
    ? waiver.waiverType === "full"
      ? Number(course.installment_total_price ?? 0)
      : Number(waiver.amount ?? 0)
    : 0

  const baseInstallmentPrice = Math.max(
    0,
    Number(course.installment_total_price ?? 0) - waiverAmount
  )

  // Keep installment amount in sync when not customized or when waiver changes
  useEffect(() => {
    const count = Number(installmentCount) || 1
    const amount = parseFloat((baseInstallmentPrice / count).toFixed(2))
    setInstallmentAmount(amount)
  }, [isCustomized, installmentCount, baseInstallmentPrice])

  // ── Mutation ────────────────────────────────────────────────────────────────
  const assignMutation = useAssignCourse(studentId)

  function handleConfirm() {
    assignMutation.mutate(
      {
        courseId: course.id,
        payment_type: paymentType,
        plan_start_date: startDate,
        is_plan_customized: isCustomized,
        custom_installment_count: isCustomized ? (Number(installmentCount) || 1) : undefined,
        custom_installment_amount: isCustomized ? (Number(installmentAmount) || 0) : undefined,
        waiver: waiver ?? undefined,
      },
      { onSuccess: onClose },
    )
  }

  const mismatch =
    paymentType === "installment" &&
    Number(installmentCount) > 0 &&
    Number(installmentAmount) > 0 &&
    Math.abs(Number(installmentAmount) * Number(installmentCount) - baseInstallmentPrice) > 0.5

  return (
    <Dialog open={open} onClose={onClose} title="Assign Course & Configure Fee Plan" size="xl" scrollable={false}>
      <div className="flex-1 min-h-0 overflow-y-auto pr-2">
        <div className="space-y-5 pb-2">
          {/* Course info banner */}
          <div className="rounded-md border border-border bg-muted/5 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">{course.title}</p>
              {course.level && (
                <p className="text-xs text-muted-foreground mt-0.5">{course.level}</p>
              )}
            </div>
            {course.one_time_price != null && (
              <Badge variant="default" className="shrink-0">
                From {fmt(course.one_time_price)}
              </Badge>
            )}
          </div>

          {/* No fee configured warning */}
          {!hasFee && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
              <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Fee settings are not configured for this course. The course will be assigned
                without a payment plan. Update the course fee settings first for full functionality.
              </p>
            </div>
          )}

          {/* ── Step 1: Payment Type ────────────────────────────────────────── */}
          {hasFee && (
            <>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  Step 1 — Payment Type
                </p>
                <RadioGroup
                  value={paymentType}
                  onValueChange={(v) =>
                    setPaymentType(v as "one_time" | "installment")
                  }
                  className="grid grid-cols-2 gap-3"
                >
                  {/* One-time card */}
                  <Label
                    htmlFor="pay-onetime"
                    className={`flex cursor-pointer flex-col gap-1.5 rounded-md border-2 p-4 transition-all
                      ${paymentType === "one_time"
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/40"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem id="pay-onetime" value="one_time" />
                        <span className="text-sm font-semibold">Pay in Full</span>
                      </div>
                      <CreditCard className="size-4 text-muted-foreground" />
                    </div>
                    <p className="text-xl font-bold text-foreground pl-6">
                      {fmt(course.one_time_price)}
                    </p>
                    {savings > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium pl-6">
                        <TrendingDown className="size-3" />
                        Save {fmt(savings)}
                      </span>
                    )}
                  </Label>

                  {/* Installment card */}
                  <Label
                    htmlFor="pay-installment"
                    className={`flex cursor-pointer flex-col gap-1.5 rounded-md border-2 p-4 transition-all
                      ${paymentType === "installment"
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/40"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem id="pay-installment" value="installment" />
                        <span className="text-sm font-semibold">Installments</span>
                      </div>
                      <CalendarDays className="size-4 text-muted-foreground" />
                    </div>
                    <p className="text-xl font-bold text-foreground pl-6">
                      {fmt(course.installment_total_price)}
                    </p>
                    <span className="text-xs text-muted-foreground pl-6">
                      {defaultCount} × {fmt(defaultAmount)} / month
                    </span>
                  </Label>
                </RadioGroup>
              </div>

              <Separator />

              {/* ── Step 2: Installment Config ──────────────────────────── */}
              {paymentType === "installment" && (
                <AssignInstallmentStep
                  course={course}
                  startDate={startDate}
                  setStartDate={setStartDate}
                  isCustomized={isCustomized}
                  setIsCustomized={setIsCustomized}
                  installmentCount={installmentCount}
                  setInstallmentCount={setInstallmentCount}
                  installmentAmount={installmentAmount}
                  setInstallmentAmount={setInstallmentAmount}
                  mismatch={mismatch}
                  basePrice={baseInstallmentPrice}
                />
              )}

              <Separator />
            </>
          )}

          {/* ── Waiver section ──────────────────────────────────────────────── */}
          <AssignWaiverSection waiver={waiver} setWaiver={setWaiver} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-4 shrink-0">
        <Button variant="ghost" onClick={onClose} disabled={assignMutation.isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={assignMutation.isPending}
          className="gap-2"
        >
          {assignMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Assigning…
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" />
              Confirm Assignment
            </>
          )}
        </Button>
      </div>
    </Dialog>
  )
}
