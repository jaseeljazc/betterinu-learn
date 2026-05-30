"use client"

import { useEffect } from "react"
import { IndianRupee, AlertTriangle, TrendingDown } from "lucide-react"

export type FeeSettings = {
  one_time_price: string
  installment_total_price: string
  default_installment_count: string
  default_installment_amount: string
  grace_period_days: string
}

type FeeSettingsSectionProps = {
  fee: FeeSettings
  onChange: (fee: FeeSettings) => void
  inputClass: string
}

/**
 * Reusable fee configuration section for the course create and edit forms.
 *
 * - Auto-calculates `default_installment_amount` when total or count changes.
 * - Shows a savings summary and a mismatch warning when the admin overrides
 *   the auto-calculated per-installment amount.
 */
export function FeeSettingsSection({
  fee,
  onChange,
  inputClass,
}: FeeSettingsSectionProps) {
  const oneTime = parseFloat(fee.one_time_price) || 0
  const totalInst = parseFloat(fee.installment_total_price) || 0
  const count = parseInt(fee.default_installment_count, 10) || 0
  const perInstallment = parseFloat(fee.default_installment_amount) || 0
  const grace = parseInt(fee.grace_period_days, 10) || 3

  /** Auto-recalculate per-installment when total or count changes. */
  useEffect(() => {
    if (count > 0 && totalInst > 0) {
      const auto = parseFloat((totalInst / count).toFixed(2))
      onChange({ ...fee, default_installment_amount: String(auto) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fee.installment_total_price, fee.default_installment_count])

  function set(field: keyof FeeSettings, value: string) {
    onChange({ ...fee, [field]: value })
  }

  const savings = totalInst - oneTime
  const savingsPositive = savings > 0

  /** Check if the admin-entered per-installment amount is consistent. */
  const expectedAmount = count > 0 ? parseFloat((totalInst / count).toFixed(2)) : 0
  const mismatch =
    perInstallment > 0 &&
    count > 0 &&
    totalInst > 0 &&
    Math.abs(perInstallment * count - totalInst) > 0.01

  return (
    <div className="space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-2 border-b border-[#f0ede6] pb-3">
        <IndianRupee className="size-4 text-[#1a4031]" />
        <h2 className="text-sm font-bold uppercase tracking-wide text-[#1a4031]">
          Fee Settings
        </h2>
      </div>

      {/* Row 1: One-time price + Installment total price */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-semibold mb-1.5">
            One-time Payment Price (₹) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#7a7a62] pointer-events-none">
              ₹
            </span>
            <input
              type="number"
              min={0}
              step={0.01}
              required
              value={fee.one_time_price}
              onChange={(e) => set("one_time_price", e.target.value)}
              className={`${inputClass} pl-7`}
              placeholder="e.g. 12000"
            />
          </div>
          <p className="mt-1 text-xs text-[#7a7a62]">
            Discounted price when the student pays in full upfront.
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5">
            Total Price via Installments (₹) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#7a7a62] pointer-events-none">
              ₹
            </span>
            <input
              type="number"
              min={0}
              step={0.01}
              required
              value={fee.installment_total_price}
              onChange={(e) => set("installment_total_price", e.target.value)}
              className={`${inputClass} pl-7`}
              placeholder="e.g. 15000"
            />
          </div>
          <p className="mt-1 text-xs text-[#7a7a62]">
            Total amount collected across all installments.
          </p>
        </div>
      </div>

      {/* Validation: one-time must be less than installment total */}
      {oneTime > 0 && totalInst > 0 && oneTime >= totalInst && (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2.5">
          <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 font-medium">
            One-time price should be <strong>less than</strong> the installment total. Students need an incentive to pay upfront.
          </p>
        </div>
      )}

      {/* Row 2: Count + Per-installment amount + Grace period */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-semibold mb-1.5">
            Number of Installments *
          </label>
          <input
            type="number"
            min={1}
            step={1}
            required
            value={fee.default_installment_count}
            onChange={(e) => set("default_installment_count", e.target.value)}
            className={inputClass}
            placeholder="e.g. 3"
          />
          <p className="mt-1 text-xs text-[#7a7a62]">
            Default monthly installment count.
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5">
            Amount per Installment (₹) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#7a7a62] pointer-events-none">
              ₹
            </span>
            <input
              type="number"
              min={0}
              step={0.01}
              required
              value={fee.default_installment_amount}
              onChange={(e) => set("default_installment_amount", e.target.value)}
              className={`${inputClass} pl-7`}
              placeholder="Auto-calculated"
            />
          </div>
          <p className="mt-1 text-xs text-[#7a7a62]">
            Auto-filled as total ÷ count. You can override it.
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5">
            Grace Period (days)
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={fee.grace_period_days}
            onChange={(e) => set("grace_period_days", e.target.value)}
            className={inputClass}
            placeholder="3"
          />
          <p className="mt-1 text-xs text-[#7a7a62]">
            Days before an overdue installment is flagged.
          </p>
        </div>
      </div>

      {/* Mismatch warning */}
      {mismatch && (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2.5">
          <AlertTriangle className="size-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 font-medium">
            Amount mismatch: {count} × ₹{perInstallment.toLocaleString("en-IN")} = ₹
            {(perInstallment * count).toLocaleString("en-IN")}, but installment total is ₹
            {totalInst.toLocaleString("en-IN")}. The course will still save, but consider
            correcting this to ₹{expectedAmount.toLocaleString("en-IN")} per installment.
          </p>
        </div>
      )}

      {/* Savings summary */}
      {savingsPositive && oneTime > 0 && (
        <div className="flex items-center gap-2.5 rounded-md bg-[#e8f0ec] border border-[#c5d9cc] px-4 py-3">
          <TrendingDown className="size-4 text-[#1a4031] shrink-0" />
          <p className="text-sm text-[#1a4031] font-medium">
            Students who pay in full save{" "}
            <strong>₹{savings.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</strong>{" "}
            compared to installments.
          </p>
        </div>
      )}
    </div>
  )
}
