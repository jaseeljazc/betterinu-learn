"use client"

import { useState } from "react"
import Link from "next/link"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  CreditCard,
  Gift,
  Minus,
  ReceiptText,
  Wallet,
} from "lucide-react"

import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { useStudentFee } from "@/lib/hooks/useStudentFee"
import { ReceiptModal } from "@/components/admin/students/student-detail/receipt-modal"
import type {
  StudentFeeEnrollment,
  StudentInstallment,
  StudentPaymentLog,
} from "@/lib/services/student-fee-service"

/** One QueryClient per mount — stable because of useState initialiser */
const feeQueryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
})

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function fmtMode(mode: string) {
  const MAP: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    bank_transfer: "Bank Transfer",
    cheque: "Cheque",
    other: "Other",
  }
  return MAP[mode] ?? mode
}

// ── Status badge config ────────────────────────────────────────────────────────

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

// ── Reminder banner logic ─────────────────────────────────────────────────────

type ReminderInfo = {
  overdueCount: number
  nextDueInstallment: StudentInstallment | null
  nextDueEnrollmentTitle: string
}

function computeReminders(enrollments: StudentFeeEnrollment[]): ReminderInfo {
  let overdueCount = 0
  let nextDueInstallment: StudentInstallment | null = null
  let nextDueEnrollmentTitle = ""

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sevenDaysLater = new Date(today)
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)

  for (const enr of enrollments) {
    for (const inst of enr.installments) {
      if (inst.status === "paid" || inst.status === "waived") continue

      if (inst.status === "overdue") {
        overdueCount++
        continue
      }

      // Upcoming / partially_paid: check if due within 7 days
      const dueDate = new Date(inst.dueDate)
      dueDate.setHours(0, 0, 0, 0)
      if (dueDate <= sevenDaysLater && inst.remainingBalance > 0) {
        // Pick the soonest upcoming installment
        if (
          !nextDueInstallment ||
          dueDate < new Date(nextDueInstallment.dueDate)
        ) {
          nextDueInstallment = inst
          nextDueEnrollmentTitle = enr.courseTitle
        }
      }
    }
  }

  return { overdueCount, nextDueInstallment, nextDueEnrollmentTitle }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ReminderBanners({
  enrollments,
}: {
  enrollments: StudentFeeEnrollment[]
}) {
  const { overdueCount, nextDueInstallment, nextDueEnrollmentTitle } =
    computeReminders(enrollments)

  if (overdueCount === 0 && !nextDueInstallment) return null

  return (
    <div className="flex flex-col gap-3 mb-6">
      {overdueCount > 0 && (
        <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-bold text-red-800">
              You have {overdueCount} overdue payment
              {overdueCount > 1 ? "s" : ""}
            </p>
            <p className="mt-0.5 text-xs text-red-700">
              Please contact the admin or pay at the earliest to avoid further
              penalties.
            </p>
          </div>
        </div>
      )}

      {nextDueInstallment && (
        <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-bold text-amber-800">
              Upcoming payment reminder
            </p>
            <p className="mt-0.5 text-xs text-amber-700">
              Your next installment of{" "}
              <span className="font-semibold">
                {fmt(nextDueInstallment.remainingBalance)}
              </span>{" "}
              for{" "}
              <span className="font-semibold">{nextDueEnrollmentTitle}</span> is
              due on{" "}
              <span className="font-semibold">
                {fmtDate(nextDueInstallment.dueDate)}
              </span>
              .
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function InstallmentRow({
  installment,
  total,
}: {
  installment: StudentInstallment
  total: number
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

  const hasWaiver = installment.waiverReduction > 0
  const originalAmount =
    installment.totalAmount + installment.waiverReduction + installment.overpaymentReduction

  return (
    <div className="flex flex-col gap-2 rounded-md border border-default bg-white p-3">
      {/* Top row: number label + status badge + date */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {installment.installmentNumber}
          </div>
          <span className="text-xs font-semibold text-foreground">
            Installment {installment.installmentNumber} of {total}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={`text-[10px] font-bold uppercase tracking-wide ${cfg.cls} flex items-center gap-1`}
          >
            <StatusIcon className="size-2.5" />
            {cfg.label}
          </Badge>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <CalendarDays className="size-3" />
            Due {fmtDate(installment.dueDate)}
          </span>
        </div>
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-3 gap-2 text-center py-0.5">
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Amount Due</p>
          <p className="text-sm font-bold text-foreground">
            {fmt(installment.totalAmount)}
          </p>
          {hasWaiver && (
            <p className="text-[10px] text-muted-foreground line-through">
              {fmt(originalAmount)}
            </p>
          )}
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Paid</p>
          <p className="text-sm font-bold text-green-600">
            {fmt(installment.paidAmount)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Balance </p>
          <p
            className={`text-sm font-bold ${
              installment.remainingBalance > 0
                ? installment.status === "overdue"
                  ? "text-red-600"
                  : "text-red-600 "
                : "text-green-600"
            }`}
          >
            {fmt(installment.remainingBalance)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <Progress value={pct} className="h-1.5 flex-1" />
        <span className="text-[10px] text-muted-foreground shrink-0 font-medium">{pct}% paid</span>
      </div>

      {/* Waiver note */}
      {hasWaiver && (
        <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 border border-emerald-100/50 px-2.5 py-1 text-[10px] text-emerald-700">
          <Gift className="size-3 shrink-0 text-emerald-600" />
          <span>
            Fee waiver of <span className="font-semibold">{fmt(installment.waiverReduction)}</span> applied.
          </span>
        </div>
      )}
    </div>
  )
}

function PaymentHistorySection({ logs }: { logs: StudentPaymentLog[] }) {
  const [open, setOpen] = useState(false)
  const [receiptLogId, setReceiptLogId] = useState<string | null>(null)

  return (
    <div className="border-t border-default pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <ReceiptText className="size-3.5" />
          Payment History{" "}
          <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] font-bold">
            {logs.length}
          </span>
        </span>
        {open ? (
          <ChevronUp className="size-3.5" />
        ) : (
          <ChevronDown className="size-3.5" />
        )}
      </button>

      {open && (
        <div className="mt-3">
          {logs.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-4">
              No payments recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-default">
              <table className="w-full text-xs">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                      Date
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">
                      Amount
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                      Mode
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                      Reference
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground">
                      Receipt
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-default">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="bg-white hover:bg-muted/10 transition-colors"
                    >
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {fmtDate(log.paymentDate)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-green-600">
                        {fmt(log.amountPaid)}
                      </td>
                      <td className="px-3 py-2.5">{fmtMode(log.paymentMode)}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {log.referenceNumber ?? (
                          <span className="text-[10px] italic">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="xs"
                          className="h-6 rounded border border-border px-1.5 text-[10px] font-semibold text-muted-foreground hover:text-teal-700"
                          onClick={() => setReceiptLogId(log.id)}
                        >
                          <ReceiptText className="mr-1 size-3" />
                          Receipt
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {receiptLogId && (
        <ReceiptModal
          open={!!receiptLogId}
          onClose={() => setReceiptLogId(null)}
          paymentLogId={receiptLogId}
        />
      )}
    </div>
  )
}

function FeeCard({ enrollment }: { enrollment: StudentFeeEnrollment }) {
  const [collapsed, setCollapsed] = useState(false)
  const hasWaiver = enrollment.totalWaiverReduction > 0
  const pct =
    enrollment.totalAmount > 0
      ? Math.min(
          Math.round((enrollment.paidAmount / enrollment.totalAmount) * 100),
          100,
        )
      : 0

  const isInstallment = enrollment.paymentType === "installment"

  return (
    <div className="rounded-xl border border-default bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-default bg-muted/5">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Wallet className="size-4 text-primary shrink-0" />
            <h3 className="text-sm font-bold text-foreground">
              {enrollment.courseTitle}
            </h3>
            <Badge
              variant="outline"
              className="text-[10px] font-semibold capitalize border-default"
            >
              {isInstallment ? "Installment Plan" : "One-time Payment"}
            </Badge>
            {enrollment.isPlanCustomized && (
              <Badge
                variant="outline"
                className="text-[10px] font-semibold bg-blue-50 text-blue-700 border-blue-200"
              >
                Custom Plan
              </Badge>
            )}
          </div>

          {/* Fee summary */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Total Fee</p>
              <p className="text-sm font-bold text-foreground">
                {fmt(enrollment.totalAmount)}
              </p>
              {hasWaiver && (
                <p className="text-[10px] text-muted-foreground line-through">
                  {fmt(enrollment.originalTotalAmount)}
                </p>
              )}
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Paid</p>
              <p className="text-sm font-bold text-green-600">
                {fmt(enrollment.paidAmount)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Outstanding</p>
              <p
                className={`text-sm font-bold ${
                  enrollment.outstandingBalance > 0
                    ? "text-foreground"
                    : "text-green-600"
                }`}
              >
                {fmt(enrollment.outstandingBalance)}
              </p>
            </div>
          </div>

          {/* Overall progress */}
          <div className="space-y-0.5 pt-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Payment progress</span>
              <span className="font-semibold text-foreground">{pct}%</span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>

          {/* Waiver summary (enrollment-level) */}
          {hasWaiver && (
            <div className="flex flex-wrap gap-3 pt-1 text-[10px] text-muted-foreground">
              <span>
                Original:{" "}
                <span className="font-medium text-foreground line-through">
                  {fmt(enrollment.originalTotalAmount)}
                </span>
              </span>
              <span className="text-emerald-600 font-semibold">
                Waiver: −{fmt(enrollment.totalWaiverReduction)}
              </span>
              <span>
                Payable:{" "}
                <span className="font-semibold text-foreground">
                  {fmt(enrollment.totalAmount)}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        {isInstallment && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 rounded-md text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronUp className="size-4" />
            )}
          </Button>
        )}
      </div>

      {/* Installment timeline */}
      {isInstallment && !collapsed && (
        <div className="px-5 py-4 space-y-3 bg-muted/5">
          {enrollment.installments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No installments found.
            </p>
          ) : (
            enrollment.installments.map((inst) => (
              <InstallmentRow
                key={inst.id}
                installment={inst}
                total={enrollment.installments.length}
              />
            ))
          )}

          {/* Payment History */}
          <PaymentHistorySection logs={enrollment.paymentLogs} />
        </div>
      )}

      {/* Payment history for one-time plans */}
      {!isInstallment && enrollment.paymentLogs.length > 0 && (
        <div className="px-5 py-4 bg-muted/5">
          <PaymentHistorySection logs={enrollment.paymentLogs} />
        </div>
      )}
    </div>
  )
}

// ── Skeleton loaders ──────────────────────────────────────────────────────────

function FeeCardSkeleton() {
  return (
    <div className="h-48 rounded-xl border border-default bg-white shadow-sm animate-pulse" />
  )
}

// ── Inner component (must be inside QueryClientProvider) ─────────────────────

function StudentFeeSectionInner() {
  const { data: enrollments, isLoading, error } = useStudentFee()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <FeeCardSkeleton />
        <FeeCardSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <AlertCircle className="size-4 shrink-0" />
        Failed to load fee information. Please try again.
      </div>
    )
  }

  if (!enrollments || enrollments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-default bg-white py-14 text-center shadow-sm">
        <CreditCard size={36} className="text-muted-foreground" />
        <div>
          <p className="font-semibold text-foreground">No fee records</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            No fee plans have been assigned to your account yet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ReminderBanners enrollments={enrollments} />
      <div className="space-y-4">
        {enrollments.map((enr) => (
          <FeeCard key={enr.enrollmentId} enrollment={enr} />
        ))}
      </div>
    </div>
  )
}

// ── Main exported component (provides its own QueryClient) ────────────────────

export function StudentFeeSection() {
  return (
    <QueryClientProvider client={feeQueryClient}>
      <StudentFeeSectionInner />
    </QueryClientProvider>
  )
}
