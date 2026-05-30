"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  Users,
  Coins,
  CalendarClock,
  Filter,
  ArrowDownUp,
  RefreshCw,
  CreditCard,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable } from "@/components/admin/data-table"
import type { ColumnDef } from "@tanstack/react-table"

import {
  useOverdueInstallments,
  useAllCourses,
} from "@/lib/hooks/useOverdueInstallments"
import { RecordPaymentModal } from "@/components/admin/students/student-detail/record-payment-modal"
import type { OverdueInstallment } from "@/lib/services/student-service"
import type { Installment, FeeEnrollment } from "@/lib/services/student-service"

// ── Types ─────────────────────────────────────────────────────────────────────

type SortKey = "daysOverdue" | "balanceDue"

type ActivePayment = {
  studentId: string
  installment: Installment
  enrollment: FeeEnrollment
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/** Maps an OverdueInstallment → the Installment shape RecordPaymentModal expects */
function toModalInstallment(row: OverdueInstallment): Installment {
  return {
    id: row.installmentId,
    installmentNumber: row.installmentNumber,
    dueDate: row.dueDate,
    totalAmount: row.totalAmount,
    paidAmount: row.paidAmount,
    remainingBalance: row.balanceDue,
    status: row.effectiveStatus,
    overpaymentReduction: row.overpaymentReduction,
    waiverReduction: row.waiverReduction,
  }
}

/** Maps an OverdueInstallment → the FeeEnrollment shape RecordPaymentModal expects */
function toModalEnrollment(row: OverdueInstallment): FeeEnrollment {
  return {
    enrollmentId: row.enrollmentId,
    courseId: row.courseId,
    courseTitle: row.courseTitle,
    paymentType: "installment",
    planStartDate: null,
    installments: [],
  }
}

// ── Days Overdue badge ─────────────────────────────────────────────────────────

function DaysOverdueBadge({ days }: { days: number }) {
  const cls =
    days >= 60
      ? "bg-red-100 text-red-800 border-red-300"
      : days >= 30
        ? "bg-orange-100 text-orange-800 border-orange-300"
        : days >= 14
          ? "bg-amber-100 text-amber-800 border-amber-300"
          : "bg-yellow-100 text-yellow-800 border-yellow-300"

  return (
    <Badge variant="outline" className={`text-[10px] font-bold ${cls}`}>
      {days}d overdue
    </Badge>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "partially_paid") {
    return (
      <Badge
        variant="outline"
        className="text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 border-amber-300 whitespace-nowrap"
      >
        Partial + Overdue
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="text-[10px] font-bold uppercase tracking-wide bg-red-50 text-red-700 border-red-300"
    >
      Overdue
    </Badge>
  )
}

// ── Summary card ──────────────────────────────────────────────────────────────

type SummaryCardProps = {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  accent: string
}

function SummaryCard({ icon, label, value, sub, accent }: SummaryCardProps) {
  return (
    <Card className="shadow-0">
      <CardContent className="flex items-start gap-4 p-4">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-md ${accent}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-xl font-bold text-foreground leading-tight">
            {value}
          </p>
          {sub && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// (OverdueRow component deleted in favor of DataTable columns definition)

// ── Main component ────────────────────────────────────────────────────────────

const MIN_DAYS_OPTIONS = [
  { label: "All overdue", value: 0 },
  { label: "≥ 7 days", value: 7 },
  { label: "≥ 14 days", value: 14 },
  { label: "≥ 30 days", value: 30 },
  { label: "≥ 60 days", value: 60 },
]

export function OverdueDashboard() {
  const [courseFilter, setCourseFilter] = useState<string>("all")
  const [minDays, setMinDays] = useState<number>(0)
  const [sortKey, setSortKey] = useState<SortKey>("daysOverdue")
  const [activePayment, setActivePayment] = useState<ActivePayment | null>(null)

  const { data, isLoading, isError, refetch, isFetching } =
    useOverdueInstallments({
      courseId: courseFilter === "all" ? undefined : courseFilter,
      minDaysOverdue: minDays || undefined,
    })

  const rows = data?.rows ?? []
  const summary = data?.summary

  const { data: coursesData } = useAllCourses()
  const allCourses = coursesData?.courses ?? []

  function handleRecordPayment(row: OverdueInstallment) {
    setActivePayment({
      studentId: row.studentId,
      installment: toModalInstallment(row),
      enrollment: toModalEnrollment(row),
    })
  }

  const columns = useMemo<ColumnDef<OverdueInstallment>[]>(
    () => [
      {
        accessorKey: "studentName",
        header: "Student",
        cell: ({ row }) => (
          <Link
            href={`/admin/students/${row.original.studentId}`}
            className="text-xs font-semibold text-primary hover:underline underline-offset-2"
          >
            {row.original.studentName}
          </Link>
        ),
      },
      {
        accessorKey: "courseTitle",
        header: "Course",
        cell: ({ row }) => (
          <span className="text-xs text-foreground">{row.original.courseTitle}</span>
        ),
      },
      {
        id: "installment",
        header: "Installment",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <span className="inline-flex items-center justify-center size-6 rounded-full bg-primary/10 text-[11px] font-bold text-primary">
              {row.original.installmentNumber}
            </span>
            <span className="text-[10px] text-muted-foreground">
              of {row.original.totalInstallments}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "dueDate",
        header: "Due Date",
        cell: ({ row }) => (
          <div>
            <span className="text-xs text-foreground">{fmtDate(row.original.dueDate)}</span>
            {row.original.gracePeriodDays > 0 && (
              <span className="ml-1 text-[10px] text-muted-foreground">
                +{row.original.gracePeriodDays}d grace
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "daysOverdue",
        header: "Days Overdue",
        cell: ({ row }) => <DaysOverdueBadge days={row.original.daysOverdue} />,
      },
      {
        accessorKey: "totalAmount",
        header: "Total",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-foreground">
            {fmt(row.original.totalAmount)}
          </span>
        ),
      },
      {
        accessorKey: "paidAmount",
        header: "Paid",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-green-700">
            {fmt(row.original.paidAmount)}
          </span>
        ),
      },
      {
        accessorKey: "balanceDue",
        header: "Balance Due",
        cell: ({ row }) => (
          <span className="text-xs font-bold text-red-700">
            {fmt(row.original.balanceDue)}
          </span>
        ),
      },
      {
        accessorKey: "effectiveStatus",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.effectiveStatus} />,
      },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => (
          <Button
            size="sm"
            className="h-7 px-2.5 text-[11px] font-semibold rounded-md"
            onClick={() => handleRecordPayment(row.original)}
          >
            <CreditCard className="size-3 mr-1" />
            Record
          </Button>
        ),
      },
    ],
    []
  )

  // Client-side sort (API already returns sorted, but user can toggle)
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) =>
      sortKey === "daysOverdue"
        ? b.daysOverdue - a.daysOverdue
        : b.balanceDue - a.balanceDue
    )
  }, [rows, sortKey])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={<Users className="size-5 text-red-600" />}
          label="Students with overdue payments"
          value={isLoading ? "—" : (summary?.totalStudents ?? 0)}
          sub="unique students"
          accent="bg-red-50"
        />
        <SummaryCard
          icon={<Coins className="size-5 text-orange-600" />}
          label="Total overdue balance"
          value={
            isLoading ? "—" : fmt(summary?.totalOverdueAmount ?? 0)
          }
          sub="across all students"
          accent="bg-orange-50"
        />
        <SummaryCard
          icon={<CalendarClock className="size-5 text-amber-600" />}
          label="Installments due this month"
          value={isLoading ? "—" : (summary?.overdueThisMonth ?? 0)}
          sub="past grace period"
          accent="bg-amber-50"
        />
      </div>

      {/* Filter + sort bar */}
      <div className="flex flex-wrap items-center gap-2">

        {/* Course filter */}
        <Select
          value={courseFilter}
          onValueChange={setCourseFilter}
          
        >
          <SelectTrigger className="h-9 w-48 text-xs ">
            <SelectValue placeholder="All courses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courses</SelectItem>
            {allCourses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Min days overdue */}
        <Select
          value={String(minDays)}
          onValueChange={(v) => setMinDays(Number(v))}
        >
          <SelectTrigger className="h-9 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MIN_DAYS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={String(o.value)}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <div className="flex items-center gap-1.5 ml-auto">
          <ArrowDownUp className="size-3.5 text-muted-foreground" />
          <Select
            value={sortKey}
            onValueChange={(v) => setSortKey(v as SortKey)}
          >
            <SelectTrigger className="h-9 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daysOverdue">Most overdue first</SelectItem>
              <SelectItem value="balanceDue">Highest balance first</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 rounded-md"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh"
          >
            <RefreshCw
              className={`size-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Table */}
      {isError ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center rounded-md border border-default bg-card">
          <AlertTriangle className="size-8 text-destructive" />
          <p className="text-sm font-semibold text-foreground">
            Failed to load overdue installments
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={sorted}
          loading={isLoading}
          emptyMessage="No overdue installments"
          emptyIcon={Coins}
          caption={`${sorted.length} overdue installment${sorted.length !== 1 ? "s" : ""} · auto-refreshes every 5 min`}
        />
      )}

      {/* Record Payment Modal (reused from student detail page) */}
      {activePayment && (
        <RecordPaymentModal
          open={!!activePayment}
          onClose={() => {
            setActivePayment(null)
            refetch()
          }}
          studentId={activePayment.studentId}
          installment={activePayment.installment}
          enrollment={activePayment.enrollment}
        />
      )}
    </div>
  )
}
