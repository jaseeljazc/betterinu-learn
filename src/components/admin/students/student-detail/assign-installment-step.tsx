"use client"

import { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import {
  AlertTriangle,
  CalendarDays,
  Sparkles,
} from "lucide-react"
import type { CourseRow } from "./types"

type AssignInstallmentStepProps = {
  course: CourseRow
  startDate: string
  setStartDate: (v: string) => void
  isCustomized: boolean
  setIsCustomized: (v: boolean) => void
  installmentCount: number | ""
  setInstallmentCount: (v: number | "") => void
  installmentAmount: number | ""
  setInstallmentAmount: (v: number | "") => void
  mismatch: boolean
  basePrice: number
}

function generateDueDates(startDate: string, count: number): Date[] {
  const base = new Date(startDate)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base)
    d.setMonth(d.getMonth() + i)
    return d
  })
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function fmt(n: number | "") {
  const val = Number(n) || 0
  return `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function AssignInstallmentStep({
  course,
  startDate,
  setStartDate,
  isCustomized,
  setIsCustomized,
  installmentCount,
  setInstallmentCount,
  installmentAmount,
  setInstallmentAmount,
  mismatch,
  basePrice,
}: AssignInstallmentStepProps) {
  const dueDates = useMemo(
    () => generateDueDates(startDate, Number(installmentCount) || 0),
    [startDate, installmentCount],
  )

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Step 2 — Installment Plan
      </p>

      {/* Customize toggle */}
      <div className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
        <Checkbox
          id="customize-plan"
          checked={isCustomized}
          onCheckedChange={(v) => setIsCustomized(!!v)}
          className="mt-0.5"
        />
        <div className="flex-1">
          <Label
            htmlFor="customize-plan"
            className="text-sm font-semibold cursor-pointer flex items-center gap-2"
          >
            Customize plan for this student
            {isCustomized && (
              <Badge className="text-[10px] h-4 px-1.5 gap-0.5">
                <Sparkles className="size-2.5" />
                Custom Plan
              </Badge>
            )}
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Override the course default installment schedule for this student only.
          </p>
        </div>
      </div>

      {/* Config fields */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="inst-count" className="text-xs font-semibold">
            No. of Installments
          </Label>
          <Input
            id="inst-count"
            type="number"
            min={1}
            step={1}
            value={installmentCount === "" ? "" : installmentCount}
            disabled={!isCustomized}
            onChange={(e) => {
              const v = e.target.value
              if (v === "") {
                setInstallmentCount("")
                setInstallmentAmount("")
              } else {
                const count = Math.max(1, parseInt(v) || 1)
                setInstallmentCount(count)
                const autoAmount = parseFloat(
                  (basePrice / count).toFixed(2)
                )
                setInstallmentAmount(autoAmount)
              }
            }}
            onWheel={(e) => e.currentTarget.blur()}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="inst-amount" className="text-xs font-semibold">
            Amount / Month (₹)
          </Label>
          <Input
            id="inst-amount"
            type="number"
            min={0}
            step={0.01}
            value={installmentAmount === "" ? "" : installmentAmount}
            disabled={!isCustomized}
            onChange={(e) => {
              const v = e.target.value
              setInstallmentAmount(v === "" ? "" as any : Math.max(0, parseFloat(v) || 0))
            }}
            onWheel={(e) => e.currentTarget.blur()}
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="inst-start" className="text-xs font-semibold">
            Start Date
          </Label>
          <Input
            id="inst-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Mismatch warning */}
      {mismatch && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
          <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            {installmentCount} × {fmt(installmentAmount)} = {fmt(Number(installmentCount) * Number(installmentAmount))},
            but course installment total is{" "}
            {course.installment_total_price != null
              ? fmt(Number(course.installment_total_price))
              : "—"}
            . The plan will still be saved.
          </p>
        </div>
      )}

      <Separator />

      {/* Due dates preview */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
          <CalendarDays className="size-3.5" />
          Installment Schedule Preview
        </p>
        <div className="max-h-48 overflow-y-auto rounded-md border border-border">
          <div className="divide-y divide-border">
            {dueDates.map((d, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2 text-xs"
              >
                <span className="text-muted-foreground font-medium">
                  Installment {i + 1}
                </span>
                <span className="font-semibold text-foreground">{fmtDate(d)}</span>
                <span className="text-primary font-bold">{fmt(installmentAmount)}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Total:{" "}
          <strong className="text-foreground">
            {fmt(Number(installmentCount) * Number(installmentAmount))}
          </strong>
          {course.installment_total_price != null && (
            <span className="ml-1">
              (course total: {fmt(Number(course.installment_total_price))}
              {basePrice !== Number(course.installment_total_price) && (
                <> / after waiver: <span className="font-semibold text-foreground">{fmt(basePrice)}</span></>
              )}
              )
            </span>
          )}
        </p>
      </div>
    </div>
  )
}
