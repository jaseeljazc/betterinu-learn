"use client"

import { useState } from "react"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Gift } from "lucide-react"
import type { AssignWaiver } from "./assign-course-modal"

const WAIVER_REASONS = [
  { value: "merit", label: "Merit" },
  { value: "financial_need", label: "Financial Need" },
  { value: "staff_child", label: "Staff Child" },
  { value: "special_circumstance", label: "Special Circumstance" },
  { value: "management_decision", label: "Management Decision" },
  { value: "other", label: "Other" },
]

type AssignWaiverSectionProps = {
  waiver: AssignWaiver | null
  setWaiver: (w: AssignWaiver | null) => void
}

const EMPTY_WAIVER: AssignWaiver = {
  waiverType: "partial",
  amount: 0,
  reason: "",
  notes: "",
}

export function AssignWaiverSection({
  waiver,
  setWaiver,
}: AssignWaiverSectionProps) {
  // Track accordion open state to seed/clear waiver object
  const [open, setOpen] = useState("")

  function handleOpenChange(val: string) {
    setOpen(val)
    if (val === "waiver" && !waiver) {
      setWaiver({ ...EMPTY_WAIVER })
    } else if (!val) {
      setWaiver(null)
    }
  }

  function set<K extends keyof AssignWaiver>(key: K, value: AssignWaiver[K]) {
    setWaiver(waiver ? { ...waiver, [key]: value } : { ...EMPTY_WAIVER, [key]: value })
  }

  return (
    <Accordion type="single" collapsible value={open} onValueChange={handleOpenChange}>
      <AccordionItem value="waiver" className="border border-border rounded-md px-4">
        <AccordionTrigger className="text-sm font-semibold hover:no-underline">
          <span className="flex items-center gap-2">
            <Gift className="size-4 text-muted-foreground" />
            Apply Fee Waiver
            <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
            {waiver && waiver.reason && (
              <Badge variant="default" className="text-[10px]">
                Active
              </Badge>
            )}
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4 pt-1 pb-2 px-1">
            {/* Waiver type */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Waiver Type</Label>
              <RadioGroup
                value={waiver?.waiverType ?? "partial"}
                onValueChange={(v) => set("waiverType", v as "full" | "partial")}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="wfull" value="full" />
                  <Label htmlFor="wfull" className="text-sm cursor-pointer">
                    Full waiver (100%)
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="wpartial" value="partial" />
                  <Label htmlFor="wpartial" className="text-sm cursor-pointer">
                    Partial waiver
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Amount — only for partial */}
            {waiver?.waiverType === "partial" && (
              <div className="space-y-1.5">
                <Label htmlFor="waiver-amount" className="text-xs font-semibold">
                  Waiver Amount (₹)
                </Label>
                <Input
                  id="waiver-amount"
                  type="number"
                  min={0}
                  step={0.01}
                  value={waiver.amount || ""}
                  onChange={(e) => set("amount", parseFloat(e.target.value) || 0)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="e.g. 2000"
                  className="h-8 text-sm"
                />
              </div>
            )}

            {/* Reason */}
            <div className="space-y-1.5">
              <Label htmlFor="waiver-reason" className="text-xs font-semibold">
                Reason *
              </Label>
              <Select
                value={waiver?.reason ?? ""}
                onValueChange={(v) => set("reason", v)}
              >
                <SelectTrigger id="waiver-reason" className="h-8 text-sm">
                  <SelectValue placeholder="Select a reason…" />
                </SelectTrigger>
                <SelectContent>
                  {WAIVER_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Internal notes */}
            <div className="space-y-1.5">
              <Label htmlFor="waiver-notes" className="text-xs font-semibold">
                Internal Notes
              </Label>
              <Textarea
                id="waiver-notes"
                value={waiver?.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Notes visible to admin only…"
                rows={2}
                className="text-sm resize-none"
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
