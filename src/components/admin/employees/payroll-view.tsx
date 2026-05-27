"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, ReceiptText, Wallet, CheckCircle2, PlayCircle } from "lucide-react"
import { DataTable } from "@/components/admin/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import type { PayrollRun, Account } from "@/types"
import { PayslipModal } from "./payslip-modal"
import { Dialog } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"

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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function nextMonth(monthStr: string) {
  const [y, m] = monthStr.split("-")
  const d = new Date(parseInt(y), parseInt(m) - 1, 1)
  d.setMonth(d.getMonth() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function currentYearMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

/* ------------------------------------------------------------------ */
/*  Status Badge                                                        */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: string }) {
  if (status === "disbursed")
    return (
      <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 gap-1">
        <CheckCircle2 className="size-3" /> Disbursed
      </Badge>
    )
  if (status === "approved")
    return (
      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
        Approved
      </Badge>
    )
  if (status === "on_hold")
    return (
      <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
        On Hold
      </Badge>
    )
  return (
    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
      Draft
    </Badge>
  )
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
  const [disburseConfirmOpen, setDisburseConfirmOpen] = useState(false)

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
  }, [month, disburseAccountId])

  useEffect(() => { fetchData() }, [fetchData])

  const totalGross = runs.reduce((s, r) => s + r.grossSalary, 0)
  const totalDeductions = runs.reduce((s, r) => s + r.lopDeduction, 0)
  const totalNet = runs.reduce((s, r) => s + r.netSalary, 0)

  const approvedCount = runs.filter((r) => r.status === "approved").length

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
      ),
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
        return totalLop > 0
          ? <span className="text-sm font-medium text-red-600">{totalLop}</span>
          : <span className="text-sm text-muted">0</span>
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
        return v > 0
          ? <span className="text-sm text-red-600 font-medium">−{fmtCurrency(v)}</span>
          : <span className="text-sm text-muted">—</span>
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
      cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => {
        const p = row.original
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => setPayslipId(p.id)}
            >
              Payslip
            </Button>
            {canEdit && p.status !== "disbursed" && (
              <Select value={p.status} onValueChange={(v) => handleUpdateStatus(p.id, v)}>
                <SelectTrigger className="h-7 text-xs w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="approved">Approve</SelectItem>
                  <SelectItem value="on_hold">Hold</SelectItem>
                </SelectContent>
              </Select>
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
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setMonth(prevMonth(month))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-bold text-foreground min-w-32 text-center">
          {monthLabel(month)}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => setMonth(nextMonth(month))}
        >
          <ChevronRight className="size-4" />
        </Button>

        {canEdit && (
          <div className="ml-auto flex items-center gap-3">
            <Button variant="outline" onClick={handleRunPayroll} disabled={running}>
              <PlayCircle className="size-4" />
              {running ? "Running…" : "Run Payroll"}
            </Button>

            <Separator orientation="vertical" className="h-6" />

            <Select value={disburseAccountId} onValueChange={setDisburseAccountId} >
              <SelectTrigger className="h-11 min-w-36 text-sm bg-background ">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={() => setDisburseConfirmOpen(true)}
              disabled={disbursing || !approvedCount || !disburseAccountId}
            >
              <Wallet className="size-4" />
              {disbursing ? "Disbursing…" : `Disburse Approved (${approvedCount})`}
            </Button>
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
          <Card key={label} className="shadow-xs">
            <CardContent className="px-5 py-4">
              <p className="text-xs font-semibold text-muted mb-1">{label}</p>
              <p className={`text-xl font-extrabold tracking-tight ${color}`}>{fmtCurrency(value)}</p>
            </CardContent>
          </Card>
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

      {payslipId && (
        <PayslipModal runId={payslipId} onClose={() => setPayslipId(null)} />
      )}

      {/* Disburse confirmation modal */}
      <Dialog
        open={disburseConfirmOpen}
        title="Confirm Disbursement"
        onClose={() => setDisburseConfirmOpen(false)}
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-default bg-subtle px-3 py-2">
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">Month</p>
              <p className="text-sm font-bold text-foreground">{monthLabel(month)}</p>
            </div>
            <div className="rounded-md border border-default bg-subtle px-3 py-2">
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">Account</p>
              <p className="text-sm font-bold text-foreground">
                {accounts.find((a) => a.id === disburseAccountId)?.name ?? "—"}
              </p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">
              Approved Employees ({approvedCount})
            </p>
            <div className="max-h-52 overflow-y-auto rounded-md border border-default divide-y divide-border">
              {runs
                .filter((r) => r.status === "approved")
                .map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{r.employee.fullName}</p>
                      <p className="text-[11px] text-muted">{r.employee.employeeCode}</p>
                    </div>
                    <p className="text-sm font-bold text-foreground">{fmtCurrency(r.netSalary)}</p>
                  </div>
                ))}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between rounded-md bg-subtle px-3 py-2 border border-default">
            <p className="text-xs font-bold text-muted uppercase">Total Net Payable</p>
            <p className="text-lg font-extrabold text-green-700">
              {fmtCurrency(
                runs.filter((r) => r.status === "approved").reduce((s, r) => s + r.netSalary, 0)
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDisburseConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={disbursing}
              onClick={async () => {
                await handleDisburse()
                setDisburseConfirmOpen(false)
              }}
            >
              <Wallet className="size-4" />
              {disbursing ? "Disbursing…" : "Confirm & Disburse"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}