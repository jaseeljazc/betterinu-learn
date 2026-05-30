"use client"

// Touch to trigger Next.js rebuild
import { useState } from "react"
import { AlertTriangle } from "lucide-react"

import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { useAddAdjustment } from "@/lib/hooks/useStudentDetail"

// ── Types ─────────────────────────────────────────────────────────────────────

type AddAdjustmentModalProps = {
  open: boolean
  onClose: () => void
  studentId: string
  installmentId: string
  enrollmentId: string
  installmentNumber: number | null
  courseTitle: string | null
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AddAdjustmentModal({
  open,
  onClose,
  studentId,
  installmentId,
  enrollmentId,
  installmentNumber,
  courseTitle,
}: AddAdjustmentModalProps) {
  const [amount, setAmount] = useState("")
  const [notes, setNotes] = useState("")

  const { mutate, isPending } = useAddAdjustment(studentId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(amount)
    if (!parsed || parsed <= 0) return

    mutate(
      {
        installmentId,
        enrollmentId,
        studentId,
        amount: parsed,
        notes: notes.trim(),
      },
      {
        onSuccess: () => {
          setAmount("")
          setNotes("")
          onClose()
        },
      }
    )
  }

  return (
    <Dialog
      open={open}
      title="Add Adjustment Entry"
      onClose={onClose}
      size="sm"
    >
      <div className="flex flex-col gap-4">
        {/* Info banner */}
        <div className="flex items-start gap-2.5 rounded-md border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div className="text-xs leading-relaxed text-amber-800">
            <p className="font-semibold">Immutable audit trail</p>
            <p className="mt-0.5">
              The original entry stays intact. This creates a new log entry with a
              negative amount for audit transparency.
            </p>
            {courseTitle && installmentNumber && (
              <p className="mt-1 font-medium text-amber-900">
                {courseTitle} · Installment #{installmentNumber}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adj-amount" className="text-xs font-semibold">
              Adjustment Amount (₹){" "}
              <span className="font-normal text-muted-foreground">
                — will be stored as −ve
              </span>
            </Label>
            <Input
              id="adj-amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="e.g. 500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="text-sm"
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adj-notes" className="text-xs font-semibold">
              Reason / Notes <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="adj-notes"
              placeholder="Explain the reason for this adjustment…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              required
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !amount || !notes.trim()}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {isPending ? "Saving…" : "Record Adjustment"}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  )
}
