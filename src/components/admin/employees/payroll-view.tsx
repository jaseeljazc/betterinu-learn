"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, ReceiptText, Wallet, CheckCircle2, Clock, PlayCircle } from "lucide-react"
import { DataTable } from "@/components/admin/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import type { PayrollRun, Account } from "@/types"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PayslipModal } from "./payslip-modal"
import { toast } from "sonner"

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n)
}

function monthLabel(monthStr: string) {
  const [y, m] = monthStr.split("-")
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
}

function prevMonth(monthStr: string) {
  const [y, m] = monthStr.split("-")
  const d = new Date(parseInt(y), parseInt(m) - 1, 1)
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function nextMonth(monthStr: string) {
  const [y, m] = monthStr.split("-")
  const d = new Date(parseInt(y), parseInt(m) - 1, 1)
  d.setMonth(d.getMonth() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function currentYearMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function PayrollView({ canEdit }: { canEdit: boolean }) {
  const [month, setMonth] = useState(currentYearMonth())
  const [runs, setRuns] = useState<PayrollRun[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [disburseAccountId, setDisburseAccountId] = useState("")
  const [running, setRunning] = useState(false)
  const [disbursing, setDisbursing] = useState(false)
  
  const [payslipId, setPayslipId] = useState<string | null>(null)

  const fetchData = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/admin/payroll?month=${month}`, { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/accounts/accounts", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([payData, accData]) => {
        setRuns(payData.runs ?? [])
        const accs = (accData.accounts ?? []).filter((a: Account) => a.isActive)
        setAccounts(accs)
        if (!disburseAccountId && accs.length) setDisburseAccountId(accs[0].id)
      })
      .finally(() => setLoading(false))
  }, [month, disburseAccountId]) // added disburseAccountId dependency safely

  useEffect(() => { fetchData() }, [fetchData])

  const totalGross = runs.reduce((s, r) => s + r.grossSalary, 0)
  const totalDeductions = runs.reduce((s, r) => s + r.lopDeduction, 0)
  const totalNet = runs.reduce((s, r) => s + r.netSalary, 0)
  
  const hasDisbursed = runs.some(r => r.status === "disbursed")
  const approvedCount = runs.filter(r => r.status === "approved").length

  async function handleRunPayroll() {
    setRunning(true)
    try {
      const res = await fetch("/api/admin/payroll/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ month }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to run payroll")
      toast.success(`Payroll generated for ${data.total} employees`)
      fetchData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setRunning(false)
    }
  }

  async function handleUpdateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/admin/payroll/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to update status")
      fetchData()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  async function handleDisburse() {
    if (!disburseAccountId || !approvedCount) return
    setDisbursing(true)
    try {
      const res = await fetch("/api/admin/payroll/disburse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ month, accountId: disburseAccountId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to disburse")
      toast.success(`Disbursed ${data.disbursed} salaries successfully`)
      fetchData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setDisbursing(false)
    }
  }

  const columns: ColumnDef<PayrollRun>[] = [
    {
      id: "employee",
      header: "Employee",
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-sm text-foreground">{row.original.employee.fullName}</p>
          <p className="text-[11px] text-muted">{row.original.employee.employeeCode}</p>
        </div>
      ),
    },
    {
      id: "attendance",
      header: "Attendance",
      cell: ({ row }) => (
        <div className="text-xs text-secondary">
          <p>{row.original.workingDays} WD | {row.original.daysPresent} P</p>
        </div>
      )
    },
    {
      accessorKey: "leaveCount",
      header: "Leaves",
      cell: ({ getValue }) => <span className="text-sm font-medium">{getValue() as number}</span>,
    },
    {
      accessorKey: "absentCount",
      header: "Absences",
      cell: ({ getValue }) => <span className="text-sm font-medium">{getValue() as number}</span>,
    },
    {
      accessorKey: "halfDayCount",
      header: "Half-Days",
      cell: ({ getValue }) => <span className="text-sm font-medium">{getValue() as number}</span>,
    },
    {
      id: "lopDays",
      header: "LOP Days",
      cell: ({ row }) => {
        const p = row.original
        const totalLop = p.lopFullDays + p.lopHalfDays
        return totalLop > 0 ? <span className="text-sm font-medium text-red-600">{totalLop}</span> : <span className="text-sm text-muted">0</span>
      },
    },
    {
      accessorKey: "grossSalary",
      header: "Gross",
      cell: ({ getValue }) => <span className="text-sm font-medium">{fmtCurrency(getValue() as number)}</span>,
    },
    {
      accessorKey: "lopDeduction",
      header: "Deduction",
      cell: ({ getValue }) => {
        const v = getValue() as number
        return v > 0 ? <span className="text-sm text-red-600 font-medium">−{fmtCurrency(v)}</span> : <span className="text-sm text-muted">—</span>
      },
    },
    {
      accessorKey: "netSalary",
      header: "Net",
      cell: ({ getValue }) => <span className="text-sm font-bold text-foreground">{fmtCurrency(getValue() as number)}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const s = getValue() as string
        if (s === "disbursed") return <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-[11px] font-semibold text-green-700"><CheckCircle2 className="size-3" />Disbursed</span>
        if (s === "approved") return <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">Approved</span>
        if (s === "on_hold") return <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">On Hold</span>
        return <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">Draft</span>
      },
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => {
        const p = row.original
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPayslipId(p.id)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Payslip
            </button>
            {canEdit && p.status !== "disbursed" && (
              <select
                value={p.status}
                onChange={(e) => handleUpdateStatus(p.id, e.target.value)}
                className="h-7 text-xs rounded-md border border-default bg-white px-2 py-1 outline-none focus:border-primary"
              >
                <option value="draft">Draft</option>
                <option value="approved">Approve</option>
                <option value="on_hold">Hold</option>
              </select>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-5">
      {/* Month selector & actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMonth(prevMonth(month))}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-default bg-white text-secondary hover:text-primary hover:border-primary transition-colors"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-bold text-foreground min-w-32 text-center">
          {monthLabel(month)}
        </span>
        <button
          onClick={() => setMonth(nextMonth(month))}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-default bg-white text-secondary hover:text-primary hover:border-primary transition-colors"
        >
          <ChevronRight className="size-4" />
        </button>

        {canEdit && (
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={handleRunPayroll}
              disabled={running}
              className="flex items-center gap-2 rounded-md bg-white border border-default px-4 py-2 text-sm font-semibold text-secondary hover:text-primary disabled:opacity-50 whitespace-nowrap shadow-xs"
            >
              <PlayCircle className="size-4" />
              {running ? "Running…" : "Run Payroll"}
            </button>

            <div className="h-6 w-px bg-default mx-1" />

            <select
              value={disburseAccountId}
              onChange={(e) => setDisburseAccountId(e.target.value)}
              className="h-9 rounded-md border border-default bg-white px-3 text-sm text-secondary outline-none focus:border-primary"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <button
              onClick={handleDisburse}
              disabled={disbursing || !approvedCount || !disburseAccountId}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 whitespace-nowrap shadow-xs"
            >
              <Wallet className="size-4" />
              {disbursing ? "Disbursing…" : `Disburse Approved (${approvedCount})`}
            </button>
          </div>
        )}
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Gross", value: totalGross, color: "text-foreground" },
          { label: "LOP Deductions", value: totalDeductions, color: "text-red-600" },
          { label: "Net Payable", value: totalNet, color: "text-green-700" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-md border border-default bg-white px-5 py-4 shadow-xs">
            <p className="text-xs font-semibold text-muted mb-1">{label}</p>
            <p className={`text-xl font-extrabold tracking-tight ${color}`}>{fmtCurrency(value)}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-md border border-default bg-white shadow-xs overflow-hidden">
        <DataTable
          columns={columns}
          data={runs}
          loading={loading}
          emptyMessage="No payroll runs for this month. Click 'Run Payroll' to generate."
          emptyIcon={ReceiptText}
        />
      </div>

      {/* Payslip Modal */}
      {payslipId && (
        <PayslipModal
          runId={payslipId}
          onClose={() => setPayslipId(null)}
        />
      )}
    </div>
  )
}
