"use client"

import { useState } from "react"
import {
  CreditCard,
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertCircle,
  Minus,
  ChevronDown,
  ChevronUp,
  Wallet,
  TrendingDown,
  Gift,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

import { useStudentInstallments } from "@/lib/hooks/useStudentDetail"
import { RecordPaymentModal } from "./record-payment-modal"
import { ApplyWaiverModal } from "./apply-waiver-modal"
import { PaymentHistoryPanel } from "./payment-history-panel"
import { ReceiptModal } from "./receipt-modal"
import type { Installment, FeeEnrollment } from "@/lib/services/student-service"

// ── Types ─────────────────────────────────────────────────────────────────────

type FeePlanPanelProps = {
  studentId: string
  canRecordPayment: boolean
}

type ActivePayment = {
  installment: Installment
  enrollment: FeeEnrollment
}

type ActiveWaiver = {
  enrollment: FeeEnrollment
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; cls: string }
> = {
  upcoming: {
    label: "Upcoming",
    icon: Clock,
    cls: "bg-blue-50 text-blue-700 border-blue-200",
  },
  paid: {
    label: "Paid",
    icon: CheckCircle2,
    cls: "bg-green-50 text-green-700 border-green-200",
  },
  partially_paid: {
    label: "Partial",
    icon: Minus,
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
  overdue: {
    label: "Overdue",
    icon: AlertCircle,
    cls: "bg-red-50 text-red-700 border-red-200",
  },
  waived: {
    label: "Waived",
    icon: CheckCircle2,
    cls: "bg-purple-50 text-purple-700 border-purple-200",
  },
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

// ── Installment Row ────────────────────────────────────────────────────────────

function InstallmentRow({
  installment,
  enrollment,
  onRecordPayment,
  canRecordPayment,
}: {
  installment: Installment
  enrollment: FeeEnrollment
  onRecordPayment: (inst: Installment, enr: FeeEnrollment) => void
  canRecordPayment: boolean
}) {
  const cfg = STATUS_CFG[installment.status] ?? STATUS_CFG.upcoming
  const StatusIcon = cfg.icon
  const pct =
    installment.totalAmount > 0
      ? Math.min(
        Math.round((installment.paidAmount / installment.totalAmount) * 100),
        100,
      )
      : 0
  const canPay =
    canRecordPayment &&
    installment.status !== "paid" &&
    installment.status !== "waived"

  const hasWaiver = (installment.waiverReduction ?? 0) > 0
  // Original = current total + waiverReduction + overpaymentReduction
  const originalAmount =
    installment.totalAmount +
    (installment.waiverReduction ?? 0) +
    (installment.overpaymentReduction ?? 0)

  return (
    <div className="flex flex-col gap-2 rounded-md border border-default bg-white p-3 sm:flex-row sm:items-center sm:gap-3">
      {/* Installment number bubble */}
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
        {installment.installmentNumber}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={`text-[10px] font-bold uppercase tracking-wide ${cfg.cls} flex items-center gap-1`}
          >
            <StatusIcon className="size-2.5" />
            {cfg.label}
          </Badge>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="size-3" />
            Due {fmtDate(installment.dueDate)}
          </span>
          {installment.overpaymentReduction && installment.overpaymentReduction > 0 ? (
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold flex items-center gap-1"
            >
              <TrendingDown className="size-2.5 text-emerald-600" />
              {fmt(installment.overpaymentReduction)} reduced
            </Badge>
          ) : null}
          {hasWaiver && (
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold flex items-center gap-1"
            >
              <Gift className="size-2.5 text-emerald-600" />
              {fmt(installment.waiverReduction!)} waiver
            </Badge>
          )}
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] text-muted-foreground shrink-0">
            Paid {fmt(installment.paidAmount)} of {fmt(installment.totalAmount)}
            {installment.overpaymentReduction && installment.overpaymentReduction > 0 ? (
              <span className="ml-1.5 text-muted-foreground line-through text-[10px]">
                (was {fmt(installment.totalAmount + installment.overpaymentReduction)})
              </span>
            ) : null}
          </span>
          <Progress value={pct} className="h-1.5 flex-1" />
          <span className="text-xs font-semibold text-foreground shrink-0">{pct}%</span>
        </div>

        {/* Waiver breakdown (Original → Waiver → Payable) */}
        {hasWaiver && (
          <div className="flex flex-wrap gap-3 pt-0.5 text-[10px] text-muted-foreground">
            <span>
              Original:{" "}
              <span className="font-medium text-foreground line-through">
                {fmt(originalAmount)}
              </span>
            </span>
            <span className="text-emerald-600 font-medium">
              Waiver: −{fmt(installment.waiverReduction!)}
            </span>
            <span>
              Payable:{" "}
              <span className="font-semibold text-foreground">
                {fmt(installment.totalAmount)}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Remaining + action */}
      <div className="flex shrink-0 flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-1.5 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-dashed border-default">
        <p className="text-sm font-bold text-foreground">
          {fmt(installment.remainingBalance)}{" "}
          <span className="text-[11px] font-normal text-muted-foreground">
            remaining
          </span>
        </p>
        {canPay && (
          <Button
            size="sm"
            className="h-8 rounded-md px-3 text-xs font-semibold py-2 bg-primary text-white"
            onClick={() => onRecordPayment(installment, enrollment)}
          >
            Record Payment
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Enrollment Card ────────────────────────────────────────────────────────────

function EnrollmentCard({
  enrollment,
  onRecordPayment,
  onApplyWaiver,
  canRecordPayment,
}: {
  enrollment: FeeEnrollment
  onRecordPayment: (inst: Installment, enr: FeeEnrollment) => void
  onApplyWaiver: (enr: FeeEnrollment) => void
  canRecordPayment: boolean
}) {
  const [collapsed, setCollapsed] = useState(false)

  const totalPaid = enrollment.installments.reduce(
    (s, i) => s + i.paidAmount,
    0,
  )
  const grandTotal = enrollment.installments.reduce(
    (s, i) => s + i.totalAmount,
    0,
  )
  const pct =
    grandTotal > 0 ? Math.round((totalPaid / grandTotal) * 100) : 0

  const overdueCount = enrollment.installments.filter(
    (i) => i.status === "overdue",
  ).length
  const paidCount = enrollment.installments.filter(
    (i) => i.status === "paid",
  ).length

  const hasUnpaid = enrollment.installments.some(
    (i) => i.status !== "paid" && i.status !== "waived" && i.remainingBalance > 0,
  )

  return (
    <div className="rounded-md border border-default bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Wallet className="size-4 text-primary shrink-0" />
            <h3 className="text-sm font-bold text-foreground">
              {enrollment.courseTitle}
            </h3>
            {overdueCount > 0 && (
              <Badge
                variant="outline"
                className="bg-red-50 text-red-700 border-red-200 text-[10px] font-bold uppercase"
              >
                {overdueCount} overdue
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {paidCount}/{enrollment.installments.length} installments paid ·{" "}
            {fmt(totalPaid)} of {fmt(grandTotal)}
          </p>
          <Progress value={pct} className="h-1.5 mt-1" />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {canRecordPayment && hasUnpaid && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-2.5  text-[10px] rounded-md bg-primary text-white font-semibold  hover:bg-primary/90 gap-1"
              onClick={() => onApplyWaiver(enrollment)}
            >
              <Gift className="size-3 text-white" />
              Apply Waiver  
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-7 rounded-md text-muted-foreground hover:text-foreground"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronUp className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Installments list */}
      {!collapsed && (
        <div className="border-t border-default p-3 space-y-2 bg-muted/5">
          {enrollment.installments.map((inst) => (
            <InstallmentRow
              key={inst.id}
              installment={inst}
              enrollment={enrollment}
              onRecordPayment={onRecordPayment}
              canRecordPayment={canRecordPayment}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function FeePlanPanel({
  studentId,
  canRecordPayment,
}: FeePlanPanelProps) {
  const [activePayment, setActivePayment] = useState<ActivePayment | null>(
    null,
  )
  const [activeWaiver, setActiveWaiver] = useState<ActiveWaiver | null>(null)
  const [receiptLogId, setReceiptLogId] = useState<string | null>(null)

  const { data: enrollments, isLoading } = useStudentInstallments(studentId)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-28 rounded-md border border-default bg-white animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (!enrollments || enrollments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-default bg-white py-14 text-center">
        <CreditCard size={36} className="text-muted-foreground" />
        <div>
          <p className="font-semibold text-foreground">
            No installment plans
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            This student has no courses with an installment payment plan.
          </p>
        </div>
      </div>
    )
  }

  function handleRecordPayment(inst: Installment, enr: FeeEnrollment) {
    setActivePayment({ installment: inst, enrollment: enr })
  }

  function handleApplyWaiver(enr: FeeEnrollment) {
    setActiveWaiver({ enrollment: enr })
  }

  return (
    <>
      <div className="space-y-3">
        {enrollments.map((enr) => (
          <EnrollmentCard
            key={enr.enrollmentId}
            enrollment={enr}
            onRecordPayment={handleRecordPayment}
            onApplyWaiver={handleApplyWaiver}
            canRecordPayment={canRecordPayment}
          />
        ))}
      </div>

      {/* Payment History Log */}
      <PaymentHistoryPanel
        studentId={studentId}
        canRecordPayment={canRecordPayment}
      />

      {activePayment && (
        <RecordPaymentModal
          open={!!activePayment}
          onClose={() => setActivePayment(null)}
          onSuccessPayment={(id) => {
            setActivePayment(null)
            setReceiptLogId(id)
          }}
          studentId={studentId}
          installment={activePayment.installment}
          enrollment={activePayment.enrollment}
        />
      )}

      {activeWaiver && (
        <ApplyWaiverModal
          open={!!activeWaiver}
          onClose={() => setActiveWaiver(null)}
          studentId={studentId}
          enrollment={activeWaiver.enrollment}
        />
      )}

      {receiptLogId && (
        <ReceiptModal
          open={!!receiptLogId}
          onClose={() => setReceiptLogId(null)}
          paymentLogId={receiptLogId}
        />
      )}
    </>
  )
}
