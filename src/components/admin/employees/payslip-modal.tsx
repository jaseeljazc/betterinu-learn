"use client"

import { useState, useEffect } from "react"
import { X, Download, Mail, Building2 } from "lucide-react"
import type { PayslipData } from "@/types"

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n)
}

export function PayslipModal({
  runId,
  onClose,
  endpoint,
}: {
  runId: string,
  onClose: () => void,
  endpoint?: string,
}) {
  const [data, setData] = useState<PayslipData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(endpoint ?? `/api/admin/payroll/${runId}/payslip`, { credentials: "include" })
      .then(res => res.json())
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [endpoint, runId])

  function handleDownloadPdf() {
    window.print()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-default shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-default">
          <h2 className="font-bold text-lg text-foreground">Payslip</h2>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-2 rounded-lg border border-default px-3 py-1.5 text-sm font-semibold text-secondary hover:bg-subtle transition-colors disabled:opacity-50 print:hidden"
              disabled={!data}
              onClick={handleDownloadPdf}
            >
              <Download className="size-4" /> Download PDF
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-subtle text-muted transition-colors print:hidden" onClick={onClose}>
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {loading ? (
            <div className="h-64 flex items-center justify-center text-muted">Loading payslip...</div>
          ) : !data ? (
            <div className="h-64 flex items-center justify-center text-red-500">Failed to load payslip</div>
          ) : (
            <div className="space-y-8 print:space-y-6">
              
              {/* Company & Month */}
              <div className="flex items-start justify-between border-b border-dashed border-default pb-6">
                <div>
                  <div className="flex items-center gap-2 text-primary font-bold text-xl mb-1">
                    <Building2 className="size-6" /> BetterInU
                  </div>
                  <p className="text-sm text-secondary">Payslip for the month of</p>
                  <p className="text-lg font-bold text-foreground">{data.month}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-bold text-foreground text-base">{data.employee.fullName}</p>
                  <p className="text-muted">{data.employee.designation || "Employee"}</p>
                  <p className="text-muted">Code: {data.employee.employeeCode}</p>
                  {data.employee.department && <p className="text-muted">Dept: {data.employee.department}</p>}
                </div>
              </div>

              {/* Attendance Summary */}
              <div className="grid grid-cols-5 gap-3 rounded-xl bg-subtle p-4 text-center">
                <div>
                  <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-0.5">Work Days</p>
                  <p className="font-bold text-foreground text-base">{data.attendance.workingDays}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-0.5">Present</p>
                  <p className="font-bold text-foreground text-base">{data.attendance.daysPresent}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-0.5">Leaves</p>
                  <p className="font-bold text-amber-600 text-base">{data.attendance.leaveCount}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-0.5">Absences</p>
                  <p className="font-bold text-red-600 text-base">{data.attendance.absentCount}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-0.5">Half-Days</p>
                  <p className="font-bold text-blue-600 text-base">{data.attendance.halfDayCount}</p>
                </div>
              </div>

              {/* Earnings & Deductions Table */}
              <div className="grid grid-cols-2 gap-8">
                {/* Earnings */}
                <div>
                  <h3 className="font-bold text-sm text-foreground border-b border-default pb-2 mb-3">Earnings</h3>
                  <div className="space-y-2">
                    {data.earnings.map((e, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-secondary">{e.label}</span>
                        <span className="font-medium">{fmtCurrency(e.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <h3 className="font-bold text-sm text-foreground border-b border-default pb-2 mb-3">Deductions</h3>
                  <div className="space-y-2">
                    {data.deductions.map((d, i) => (
                      <div key={i} className="flex justify-between text-sm text-red-700">
                        <span>{d.label}</span>
                        <span className="font-medium">−{fmtCurrency(d.amount)}</span>
                      </div>
                    ))}
                    {data.deductions.length === 0 && (
                      <div className="text-sm text-muted italic">No deductions</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-2 gap-8 border-t border-default pt-3 mt-6">
                <div className="flex justify-between font-bold text-sm">
                  <span>Gross Earnings</span>
                  <span>{fmtCurrency(data.grossSalary)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm">
                  <span>Total Deductions</span>
                  <span className="text-red-600">−{fmtCurrency(data.totalDeductions)}</span>
                </div>
              </div>

              {/* Net Payable */}
              <div className="mt-6 rounded-xl bg-primary/5 border border-primary/10 p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-secondary">Net Payable Salary</p>
                  {data.status === "disbursed" && (
                    <p className="text-xs font-semibold text-green-600 flex items-center gap-1 mt-1">
                      Paid on {new Date(data.disbursedAt!).toLocaleDateString('en-GB')}
                    </p>
                  )}
                </div>
                <p className="text-2xl font-extrabold text-primary tracking-tight">
                  {fmtCurrency(data.netSalary)}
                </p>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
