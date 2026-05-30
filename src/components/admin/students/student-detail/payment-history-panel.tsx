"use client"

import { useState } from "react"
import Link from "next/link"
import {
  History,
  ChevronDown,
  ChevronUp,
  BadgeCheck,
  Gift,
  ArrowDownLeft,
  Plus,
  User,
  FileText,
  ReceiptText,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { usePaymentLogs } from "@/lib/hooks/useStudentDetail"
import { AddAdjustmentModal } from "./add-adjustment-modal"
import { ReceiptModal } from "./receipt-modal"
import type { PaymentLog } from "@/lib/services/student-service"

// ── Types ─────────────────────────────────────────────────────────────────────

type PaymentHistoryPanelProps = {
  studentId: string
  /** Enrollment data available in the fee panel so we can pre-fill adjustment context */
  enrollments?: Array<{
    enrollmentId: string
    courseTitle: string
    installments: Array<{ id: string; installmentNumber: number }>
  }>
  canRecordPayment: boolean
}

type AdjustmentTarget = {
  installmentId: string
  enrollmentId: string
  installmentNumber: number | null
  courseTitle: string | null
}

// ── Config ────────────────────────────────────────────────────────────────────

const ENTRY_CFG: Record<
  string,
  { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }
> = {
  payment: {
    label: "Payment",
    cls: "bg-green-50 text-green-700 border-green-200",
    icon: BadgeCheck,
  },
  waiver: {
    label: "Waiver",
    cls: "bg-purple-50 text-purple-700 border-purple-200",
    icon: Gift,
  },
  adjustment: {
    label: "Adjustment",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
    icon: ArrowDownLeft,
  },
}

const MODE_LABELS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  other: "Other",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n)
}

function fmtDateTime(d: string) {
  const date = new Date(d)
  return {
    date: date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    time: date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  }
}

// ── Log Row ───────────────────────────────────────────────────────────────────

function LogRow({
  log,
  onAddAdjustment,
  onViewReceipt,
  canRecordPayment,
}: {
  log: PaymentLog
  onAddAdjustment: (target: AdjustmentTarget) => void
  onViewReceipt: (id: string) => void
  canRecordPayment: boolean
}) {
  const cfg = ENTRY_CFG[log.entryType] ?? ENTRY_CFG.payment
  const Icon = cfg.icon
  const { date, time } = fmtDateTime(log.paymentDate)
  const isAdjustment = log.entryType === "adjustment"

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-white p-3 sm:flex-row sm:items-start sm:gap-4">
      {/* Entry type icon bubble */}
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${isAdjustment ? "bg-amber-100" : log.entryType === "waiver" ? "bg-purple-100" : "bg-green-100"}`}
      >
        <Icon
          className={`size-4 ${isAdjustment ? "text-amber-600" : log.entryType === "waiver" ? "text-purple-600" : "text-green-600"}`}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wide ${cfg.cls}`}>
            {cfg.label}
          </Badge>
          {log.courseTitle && (
            <span className="text-xs text-muted-foreground truncate max-w-[180px]">
              {log.courseTitle}
              {log.installmentNumber && ` · Inst. #${log.installmentNumber}`}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
          {/* Amount */}
          <span className={`font-bold text-sm ${isAdjustment ? "text-amber-700" : "text-foreground"}`}>
            {isAdjustment ? "−" : "+"}{fmt(log.amountPaid)}
          </span>

          {/* Date / time */}
          <span className="flex items-baseline gap-1">
            {date}
            <span className="text-[10px] text-muted">{time}</span>
          </span>

          {/* Mode (skip 'other' for waiver/adjustment) */}
          {log.entryType === "payment" && (
            <span>{MODE_LABELS[log.paymentMode] ?? log.paymentMode}</span>
          )}

          {/* Ref number */}
          {log.referenceNumber && (
            <span>Ref: {log.referenceNumber}</span>
          )}
        </div>

        {/* Recorded by */}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <User className="size-3" />
          <span>Recorded by {log.recordedByName}</span>
        </div>

        {/* Notes */}
        {log.notes && (
          <div className="flex items-start gap-1.5 rounded-md bg-muted/10 px-2 py-1.5 text-[11px] text-foreground">
            <FileText className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
            <span>{log.notes}</span>
          </div>
        )}
      </div>

      {/* View receipt action */}
      {log.entryType === "payment" && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 rounded-md border border-border px-2 text-[10px] font-semibold text-muted-foreground hover:text-teal-700"
          onClick={() => onViewReceipt(log.id)}
        >
          <ReceiptText className="mr-1 size-3" />
          Receipt
        </Button>
      )}

      {/* Adjustment action - hidden as per request */}
      {false && canRecordPayment && log.entryType !== "adjustment" && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 rounded-md border border-border px-2 text-[10px] font-semibold text-muted-foreground hover:text-amber-700"
          onClick={() =>
            onAddAdjustment({
              installmentId: log.installmentId,
              enrollmentId: log.enrollmentId,
              installmentNumber: log.installmentNumber,
              courseTitle: log.courseTitle,
            })
          }
        >
          <Plus className="mr-1 size-3" />
          Adjust
        </Button>
      )}
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function PaymentHistoryPanel({
  studentId,
  canRecordPayment,
}: PaymentHistoryPanelProps) {
  const [collapsed, setCollapsed] = useState(true)
  const [adjustTarget, setAdjustTarget] = useState<AdjustmentTarget | null>(null)
  const [receiptLogId, setReceiptLogId] = useState<string | null>(null)

  const { data: logs, isLoading } = usePaymentLogs(studentId)

  const logCount = logs?.length ?? 0

  return (
    <>
      <Card className="rounded-md border border-border shadow-none">
        <CardHeader className="p-0">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/5"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
          >
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
              <History className="size-4 text-primary" />
              Payment History 
              {logCount > 0 && (
                <Badge
                  variant="outline"
                  className="ml-1 border-primary/20 bg-primary/5 text-[10px] font-bold text-primary"
                >
                  {logCount}
                </Badge>
              )}
            </CardTitle>
            {collapsed ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="size-4 text-muted-foreground" />
            )}
          </button>
        </CardHeader>

        {!collapsed && (
          <CardContent className="border-t border-border p-3">
            {isLoading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-md border border-border bg-muted/30"
                  />
                ))}
              </div>
            ) : !logs || logs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <History className="size-7 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">
                  No payment history yet.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {logs.map((log) => (
                  <LogRow
                    key={log.id}
                    log={log}
                    onAddAdjustment={setAdjustTarget}
                    onViewReceipt={setReceiptLogId}
                    canRecordPayment={canRecordPayment}
                  />
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {adjustTarget && (
        <AddAdjustmentModal
          open={!!adjustTarget}
          onClose={() => setAdjustTarget(null)}
          studentId={studentId}
          installmentId={adjustTarget.installmentId}
          enrollmentId={adjustTarget.enrollmentId}
          installmentNumber={adjustTarget.installmentNumber}
          courseTitle={adjustTarget.courseTitle}
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
