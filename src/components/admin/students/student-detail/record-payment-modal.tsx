"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, CreditCard, CalendarDays, Banknote, TrendingDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"

import { useRecordPayment } from "@/lib/hooks/useStudentDetail"
import type { Installment, FeeEnrollment } from "@/lib/services/student-service"
import { AttachmentUploader } from "@/components/admin/accounts/attachment-uploader"
import type { AccountAttachment } from "@/types"

// ── Types ─────────────────────────────────────────────────────────────────────

type Account = {
  id: string
  name: string
  type: string
  currentBalance: number
  isActive: boolean
}

type RecordPaymentModalProps = {
  open: boolean
  onClose: () => void
  studentId: string
  installment: Installment
  enrollment: FeeEnrollment
}

type PaymentMode = "cash" | "upi" | "bank_transfer" | "cheque" | "other"

const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
]

const STATUS_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  upcoming: {
    label: "Upcoming",
    className:
      "bg-blue-50 text-blue-700 border-blue-200",
  },
  paid: {
    label: "Paid",
    className:
      "bg-green-50 text-green-700 border-green-200",
  },
  partially_paid: {
    label: "Partially Paid",
    className:
      "bg-amber-50 text-amber-700 border-amber-200",
  },
  overdue: {
    label: "Overdue",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  waived: {
    label: "Waived",
    className:
      "bg-purple-50 text-purple-700 border-purple-200",
  },
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n)
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RecordPaymentModal({
  open,
  onClose,
  studentId,
  installment,
  enrollment,
}: RecordPaymentModalProps) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState("")
  const [amount, setAmount] = useState(
    installment.remainingBalance.toFixed(2),
  )
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash")
  const [referenceNumber, setReferenceNumber] = useState("")
  const [notes, setNotes] = useState("")
  const [attachments, setAttachments] = useState<AccountAttachment[]>([])

  const recordMutation = useRecordPayment(studentId)

  // Fetch active accounts on open
  useEffect(() => {
    if (!open) return
    fetch("/api/admin/accounts/accounts", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const active = (data.accounts ?? []).filter((a: Account) => a.isActive)
        setAccounts(active)
        if (active.length === 1) setAccountId(active[0].id)
      })
      .catch(() => {})
  }, [open])

  const numericAmount = parseFloat(amount) || 0
  const overpayment = Math.max(0, numericAmount - installment.remainingBalance)
  const isOverpaying = overpayment > 0

  const statusCfg =
    STATUS_BADGE[installment.status] ?? STATUS_BADGE.upcoming

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accountId) return
    if (numericAmount <= 0) return
    const uploadedS3Key = attachments[0]?.s3Key
    recordMutation.mutate(
      {
        installmentId: installment.id,
        studentId,
        enrollmentId: enrollment.enrollmentId,
        amount: numericAmount,
        paymentDate,
        paymentMode,
        referenceNumber: referenceNumber || undefined,
        notes: notes || undefined,
        accountId,
        s3Key: uploadedS3Key || undefined,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Record Payment"
      size="lg"
      scrollable={false}
      
    >
      <form onSubmit={handleSubmit} className="flex  flex-col flex-1 min-h-0 ">
        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-5 pb-2 px-1" >
          {/* Installment Summary Card */}
          <div className="rounded-md border border-default bg-muted/5 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CreditCard className="size-4 text-primary" />
                <p className="text-sm font-bold text-foreground">
                  Installment {installment.installmentNumber}
                </p>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold uppercase tracking-wide ${statusCfg.className}`}
              >
                {statusCfg.label}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground">
              {enrollment.courseTitle}
            </p>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total", value: fmt(installment.totalAmount) },
                { label: "Paid", value: fmt(installment.paidAmount), cls: "text-green-700" },
                {
                  label: "Remaining",
                  value: fmt(installment.remainingBalance),
                  cls: installment.remainingBalance > 0 ? "text-amber-700" : "text-green-700",
                },
              ].map(({ label, value, cls }) => (
                <div key={label} className="text-center">
                  <p className={`text-base font-bold ${cls ?? "text-foreground"}`}>
                    {value}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" />
              Due:{" "}
              {new Date(installment.dueDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>

            {installment.overpaymentReduction && installment.overpaymentReduction > 0 ? (
              <div className="flex items-start gap-2 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded p-2.5">
                <TrendingDown className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  This installment was reduced by {fmt(installment.overpaymentReduction)} due to overpayment from a previous installment.
                </span>
              </div>
            ) : null}
          </div>

          {/* Overpayment warning */}
          {isOverpaying && (
            <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
              <p className="text-xs text-amber-800">
                <strong>Overpayment:</strong> This amount exceeds the remaining
                balance by{" "}
                <strong>{fmt(overpayment)}</strong>. It will be recorded with
                a note.
              </p>
            </div>
          )}

          <Separator />

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="pay-amount">
                Amount <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                  ₹
                </span>
                <Input
                  id="pay-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="pl-7 text-green-600"
                  required
                />
              </div>
            </div>

            {/* Payment Date */}
            <div className="space-y-1.5">
              <Label htmlFor="pay-date">
                Payment Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pay-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>

            {/* Payment Mode */}
            <div className="space-y-1.5">
              <Label>
                Payment Mode <span className="text-destructive">*</span>
              </Label>
              <Select
                value={paymentMode}
                onValueChange={(v) => setPaymentMode(v as PaymentMode)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Account */}
            <div className="space-y-1.5">
              <Label>
                Deposit Account <span className="text-destructive">*</span>
              </Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="flex items-center gap-2">
                        <Banknote className="size-3.5 text-muted-foreground" />
                        {a.name}
                        <span className="text-muted-foreground text-xs">
                          ({fmt(a.currentBalance)})
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reference Number */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="pay-ref">Reference Number</Label>
              <Input
                id="pay-ref"
                value={referenceNumber}
                className="placeholder:text-sm"
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="UPI ref / cheque no. / transaction ID"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="pay-notes">Notes</Label>
            <Textarea
              id="pay-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional internal notes"
              className="resize-none"
            />
          </div>

          {/* Screenshot / Receipt */}
          <div className="space-y-1.5">
            <Label>Receipt / Screenshot <span className="text-muted-foreground">(Optional)</span></Label>
            <AttachmentUploader
              transactionId={null}
              existingAttachments={attachments}
              onAttachmentsChange={setAttachments}
            />
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 pt-4 mt-2 border-t border-default">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={recordMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={
              recordMutation.isPending ||
              !accountId ||
              numericAmount <= 0
            }
          >
            {recordMutation.isPending ? "Recording…" : "Record Payment"}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
