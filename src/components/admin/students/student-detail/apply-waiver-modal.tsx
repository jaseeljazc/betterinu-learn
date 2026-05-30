"use client"

import { useState, useEffect, useMemo } from "react"
import { Gift, AlertCircle } from "lucide-react"

import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import { useApplyWaiver } from "@/lib/hooks/useStudentDetail"
import type {
  FeeEnrollment,
  Installment,
  ApplyWaiverPayload,
} from "@/lib/services/student-service"

// ── Types ─────────────────────────────────────────────────────────────────────

type ApplyWaiverModalProps = {
  open: boolean
  onClose: () => void
  studentId: string
  enrollment: FeeEnrollment
}

type WaiverReason = ApplyWaiverPayload["reason"]

const REASON_OPTIONS: { value: WaiverReason; label: string }[] = [
  { value: "merit", label: "Merit" },
  { value: "financial_need", label: "Financial Need" },
  { value: "staff_child", label: "Staff / Faculty Child" },
  { value: "special_circumstance", label: "Special Circumstance" },
  { value: "management_decision", label: "Management Decision" },
  { value: "other", label: "Other" },
]

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

/** Returns all installments that still have a remaining balance */
function getUnpaidInstallments(installments: Installment[]): Installment[] {
  return installments.filter(
    (i) =>
      i.status !== "paid" && i.status !== "waived" && i.remainingBalance > 0,
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ApplyWaiverModal({
  open,
  onClose,
  studentId,
  enrollment,
}: ApplyWaiverModalProps) {
  const applyWaiverMutation = useApplyWaiver(studentId)

  // ── Form state ────────────────────────────────────────────────────────────
  /** "all" means entire course; otherwise it's an installment UUID */
  const [targetId, setTargetId] = useState<string>("all")
  const [waiverType, setWaiverType] = useState<"full" | "partial">("partial")
  /** "amount" | "percent" — which input mode the user is editing */
  const [inputMode, setInputMode] = useState<"amount" | "percent">("amount")
  const [amountStr, setAmountStr] = useState("")
  const [percentStr, setPercentStr] = useState("")
  const [reason, setReason] = useState<WaiverReason | "">("")
  const [notes, setNotes] = useState("")

  const unpaidInstallments = useMemo(
    () => getUnpaidInstallments(enrollment.installments),
    [enrollment.installments],
  )

  /** The remaining balance of the currently selected target */
  const targetRemainingBalance = useMemo(() => {
    if (targetId === "all") {
      return unpaidInstallments.reduce((s, i) => s + i.remainingBalance, 0)
    }
    const inst = enrollment.installments.find((i) => i.id === targetId)
    return inst?.remainingBalance ?? 0
  }, [targetId, unpaidInstallments, enrollment.installments])

  /** The parsed numeric waiver amount (for partial waivers) */
  const waiverAmount = useMemo(() => {
    if (waiverType === "full") return targetRemainingBalance
    return parseFloat(amountStr) || 0
  }, [waiverType, amountStr, targetRemainingBalance])

  // Reset partial inputs when target or waiver type changes
  useEffect(() => {
    setAmountStr("")
    setPercentStr("")
  }, [targetId, waiverType])

  // Sync amount ↔ percentage
  function handleAmountChange(val: string) {
    setAmountStr(val)
    const n = parseFloat(val)
    if (!isNaN(n) && targetRemainingBalance > 0) {
      setPercentStr(((n / targetRemainingBalance) * 100).toFixed(2))
    } else {
      setPercentStr("")
    }
  }

  function handlePercentChange(val: string) {
    setPercentStr(val)
    const pct = parseFloat(val)
    if (!isNaN(pct) && targetRemainingBalance > 0) {
      setAmountStr(((pct / 100) * targetRemainingBalance).toFixed(2))
    } else {
      setAmountStr("")
    }
  }

  // ── Validation ────────────────────────────────────────────────────────────
  const validationError = useMemo((): string | null => {
    if (unpaidInstallments.length === 0) {
      return "There are no unpaid installments to waive."
    }
    if (targetId !== "all") {
      const inst = enrollment.installments.find((i) => i.id === targetId)
      if (!inst || inst.remainingBalance <= 0) {
        return "This installment has no remaining balance."
      }
    }
    if (waiverType === "partial") {
      if (!amountStr || waiverAmount <= 0) {
        return "Enter a waiver amount greater than ₹0."
      }
      if (waiverAmount > targetRemainingBalance + 0.01) {
        return `Waiver cannot exceed remaining balance of ${fmt(targetRemainingBalance)}.`
      }
    }
    if (!reason) return "Please select a reason."
    return null
  }, [
    unpaidInstallments,
    targetId,
    enrollment.installments,
    waiverType,
    amountStr,
    waiverAmount,
    targetRemainingBalance,
    reason,
  ])

  const canSubmit = !validationError && !applyWaiverMutation.isPending

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!canSubmit || !reason) return

    await applyWaiverMutation.mutateAsync({
      enrollmentId: enrollment.enrollmentId,
      installmentId: targetId === "all" ? null : targetId,
      waiverType,
      waiverAmount,
      reason: reason as WaiverReason,
      internalNotes: notes.trim(),
      studentId,
    })

    onClose()
  }

  // ── Derived summary values ────────────────────────────────────────────────
  const effectiveWaiverAmount =
    waiverType === "full" ? targetRemainingBalance : waiverAmount
  const payableAfterWaiver = Math.max(
    0,
    targetRemainingBalance - effectiveWaiverAmount,
  )

  return (
    <Dialog
      open={open}
      title="Apply Fee Waiver"
      onClose={onClose}
      size="xl"
      scrollable={false}
    >
      <div className="flex flex-col gap-5 overflow-y-auto max-h-[65vh] px-2">
        {/* No unpaid installments guard */}
        {unpaidInstallments.length === 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
            <span>
              All installments are already paid or waived. There is nothing to
              apply a waiver to.
            </span>
          </div>
        )}

        {/* Enrollment label */}
        <div className="flex items-center gap-2 rounded-md bg-muted/5 px-3 py-2">
          <Gift className="size-4 text-emerald-600 shrink-0" />
          <p className="text-xs font-medium text-foreground">
            {enrollment.courseTitle}
          </p>
        </div>

        {/* 1 ── Apply to */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Apply to</Label>
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger id="waiver-target" className="h-9 text-xs">
              <SelectValue placeholder="Select target" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                <span className="font-medium">Entire course fee</span>
                <span className="ml-1 text-muted-foreground">
                  —{" "}
                  {fmt(
                    unpaidInstallments.reduce(
                      (s, i) => s + i.remainingBalance,
                      0,
                    ),
                  )}{" "}
                  remaining across {unpaidInstallments.length} installment
                  {unpaidInstallments.length !== 1 ? "s" : ""}
                </span>
              </SelectItem>
              {enrollment.installments.map((inst) => {
                const isPaidOrWaived =
                  inst.status === "paid" ||
                  inst.status === "waived" ||
                  inst.remainingBalance <= 0
                return (
                  <SelectItem
                    key={inst.id}
                    value={inst.id}
                    disabled={isPaidOrWaived}
                    className="text-xs"
                  >
                    <span className="font-medium">
                      Installment #{inst.installmentNumber}
                    </span>
                    <span className="ml-1 text-muted-foreground">
                      · Due {fmtDate(inst.dueDate)} ·{" "}
                      {fmt(inst.remainingBalance)} remaining
                    </span>
                    {isPaidOrWaived && (
                      <Badge
                        variant="outline"
                        className="ml-1 text-[9px] px-1 py-0 capitalize"
                      >
                        {inst.status}
                      </Badge>
                    )}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        {/* 2 ── Waiver type */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Waiver type</Label>
          <RadioGroup
            value={waiverType}
            onValueChange={(v) => setWaiverType(v as "full" | "partial")}
            className="grid-cols-2 gap-3"
          >
            <label
              htmlFor="waiver-full"
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-xs transition-colors",
                waiverType === "full"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-default hover:bg-muted/10",
              )}
            >
              <RadioGroupItem value="full" id="waiver-full" />
              <div>
                <p className="font-semibold">Full waiver</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Waive entire remaining balance
                </p>
              </div>
            </label>
            <label
              htmlFor="waiver-partial"
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-xs transition-colors",
                waiverType === "partial"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : "border-default hover:bg-muted/10",
              )}
            >
              <RadioGroupItem value="partial" id="waiver-partial" />
              <div>
                <p className="font-semibold">Partial waiver</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Waive a specific amount
                </p>
              </div>
            </label>
          </RadioGroup>
        </div>

        {/* 3 ── Amount / Percentage (partial only) */}
        {waiverType === "partial" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Waiver value</Label>
              {/* Simple toggle instead of Tabs component */}
              <div className="flex rounded-md border border-default overflow-hidden">
                <button
                  type="button"
                  onClick={() => setInputMode("amount")}
                  className={cn(
                    "px-3 py-1 text-[10px] font-semibold transition-colors",
                    inputMode === "amount"
                      ? "bg-primary text-background"
                      : "bg-transparent text-muted-foreground hover:bg-muted/10",
                  )}
                >
                  ₹ Amount
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("percent")}
                  className={cn(
                    "px-3 py-1 text-[10px] font-semibold transition-colors border-l border-default",
                    inputMode === "percent"
                      ? "bg-primary text-background"
                      : "bg-transparent text-muted-foreground hover:bg-muted/10",
                  )}
                >
                  % Percent
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Amount input */}
              <div className="relative">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  ₹
                </span>
                <Input
                  id="waiver-amount"
                  type="number"
                  min={0}
                  step={1}
                  className={cn(
                    "h-9 pl-6 text-xs",
                    inputMode !== "amount" && "opacity-60",
                  )}
                  placeholder="0.00"
                  value={amountStr}
                  onFocus={() => setInputMode("amount")}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />
              </div>

              {/* Percentage input */}
              <div className="relative">
                <Input
                  id="waiver-percent"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  className={cn(
                    "h-9 pr-6 text-xs",
                    inputMode !== "percent" && "opacity-60",
                  )}
                  placeholder="0.00"
                  value={percentStr}
                  onFocus={() => setInputMode("percent")}
                  onChange={(e) => handlePercentChange(e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground">
              Remaining balance: {fmt(targetRemainingBalance)}
            </p>
          </div>
        )}

        {/* 4 ── Summary card */}
        {(waiverType === "full" || waiverAmount > 0) &&
          targetRemainingBalance > 0 && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50/60 px-4 py-3 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 mb-2">
                Waiver Summary
              </p>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Remaining balance</span>
                <span className="font-medium">
                  {fmt(targetRemainingBalance)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-emerald-700">
                <span className="font-medium">Waiver applied</span>
                <span className="font-bold">
                  − {fmt(effectiveWaiverAmount)}
                </span>
              </div>
              <div className="h-px bg-emerald-200 my-1" />
              <div className="flex justify-between text-xs font-bold">
                <span>Payable after waiver</span>
                <span
                  className={
                    payableAfterWaiver === 0
                      ? "text-emerald-700"
                      : "text-foreground"
                  }
                >
                  {fmt(payableAfterWaiver)}
                </span>
              </div>
            </div>
          )}

        {/* 5 ── Reason */}
        <div className="space-y-1.5">
          <Label htmlFor="waiver-reason" className="text-xs font-semibold">
            Reason <span className="text-destructive">*</span>
          </Label>
          <Select
            value={reason}
            onValueChange={(v) => setReason(v as WaiverReason)}
          >
            <SelectTrigger id="waiver-reason" className="h-9 text-xs">
              <SelectValue placeholder="Select reason…" />
            </SelectTrigger>
            <SelectContent>
              {REASON_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 6 ── Internal notes */}
        <div className="space-y-1.5 mb-2">
          <Label htmlFor="waiver-notes" className="text-xs font-semibold">
            Internal notes{" "}
            <span className="font-normal text-muted-foreground">
              (not visible to student)
            </span>
          </Label>
          <Textarea
            id="waiver-notes"
            className="min-h-[72px] resize-none text-xs"
            placeholder="Optional — add context for your records…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Validation error */}
        {validationError && reason !== "" && (
          <div className="flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="size-3.5 shrink-0" />
            {validationError}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-5 flex justify-end gap-2 border-t border-default pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={applyWaiverMutation.isPending}
          className="h-8 px-4 text-xs"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          className="h-8 px-4 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleSubmit}
          disabled={!canSubmit || unpaidInstallments.length === 0}
        >
          {applyWaiverMutation.isPending ? "Applying…" : "Apply Waiver"}
        </Button>
      </div>
    </Dialog>
  )
}
