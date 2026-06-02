"use client"

import { useState, useEffect, useMemo } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  FileDown,
  RefreshCw,
  Search,
  FilterX,
  History,
  ScrollText,
} from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/admin/data-table"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import RoboLoader from "@/components/loading/robo-loader"
import { cn } from "@/lib/utils"

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

type AuditLogEntry = {
  id: string
  internalTaskId: string
  taskId: string
  taskTitle: string
  changedAt: string
  fieldName: string
  oldValue: string | null
  newValue: string | null
  action: string
  changedByName: string
}

type AdminOption = {
  id: string
  fullName: string
}

type ApiResponse = {
  success: boolean
  data: AuditLogEntry[]
  meta: {
    total: number
    page: number
    limit: number
  }
  admins: AdminOption[]
  error?: string
}

const ACTION_OPTIONS = [
  { value: "created", label: "Created" },
  { value: "updated", label: "Updated" },
  { value: "disabled", label: "Disabled" },
  { value: "self_assigned", label: "Self Assigned" },
  { value: "attachment_added", label: "Attachment Added" },
  { value: "attachment_removed", label: "Attachment Removed" },
  { value: "commented", label: "Commented" },
]

export function TasksAuditLogView() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Read state directly from URL query parameters (single source of truth)
  const dateFrom = searchParams.get("dateFrom") ?? ""
  const dateTo = searchParams.get("dateTo") ?? ""
  const changedBy = searchParams.get("changedBy") ?? ""
  const taskId = searchParams.get("taskId") ?? ""
  const action = searchParams.get("action") ?? ""
  const limit = 20

  // Local state for debounced text search
  const [taskSearchInput, setTaskSearchInput] = useState(taskId)
  const [isExporting, setIsExporting] = useState(false)

  // Sync local text input when URL changes externally
  useEffect(() => {
    setTaskSearchInput(taskId)
  }, [taskId])

  // Debounced filter updates
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (taskSearchInput !== taskId) {
        updateFilters({ taskId: taskSearchInput })
      }
    }, 400)
    return () => clearTimeout(delayDebounce)
  }, [taskSearchInput])

  // Central search parameters update function
  const updateFilters = (updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, val]) => {
      if (val === "" || val === undefined || val === null) {
        params.delete(key)
      } else {
        params.set(key, String(val))
      }
    })
    // Reset page to 1 on filter changes, unless page is explicitly changed
    if (!("page" in updates)) {
      params.set("page", "1")
    }
    router.push(`/admin/tasks/audit?${params.toString()}`)
  }

  const handleResetFilters = () => {
    setTaskSearchInput("")
    router.push("/admin/tasks/audit")
  }

  // TanStack Infinite Query for Audit Logs
  const {
    data: infiniteData,
    isLoading,
    refetch,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useInfiniteQuery<ApiResponse>({
    queryKey: ["tasks-audit-logs-infinite", dateFrom, dateTo, changedBy, taskId, action],
    queryFn: async ({ pageParam = 1 }) => {
      const q = new URLSearchParams()
      q.set("page", String(pageParam))
      q.set("limit", String(limit))
      if (dateFrom) q.set("dateFrom", dateFrom)
      if (dateTo) q.set("dateTo", dateTo)
      if (changedBy) q.set("changedBy", changedBy)
      if (taskId) q.set("taskId", taskId)
      if (action) q.set("action", action)

      const res = await fetch(`/api/admin/employees/tasks/audit?${q.toString()}`, { credentials: "include" })
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error ?? "Failed to fetch audit log data")
      }
      return res.json()
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const total = lastPage.meta?.total ?? 0
      const currentPage = lastPage.meta?.page ?? 1
      const totalPages = Math.ceil(total / limit)
      return currentPage < totalPages ? currentPage + 1 : undefined
    },
    retry: false,
  })

  // CSV Export Trigger
  const handleExportCSV = async () => {
    try {
      setIsExporting(true)
      const q = new URLSearchParams()
      q.set("export", "true")
      if (dateFrom) q.set("dateFrom", dateFrom)
      if (dateTo) q.set("dateTo", dateTo)
      if (changedBy) q.set("changedBy", changedBy)
      if (taskId) q.set("taskId", taskId)
      if (action) q.set("action", action)

      const res = await fetch(`/api/admin/employees/tasks/audit?${q.toString()}`, { credentials: "include" })
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error ?? "Failed to fetch audit export data")
      }
      const json = await res.json()
      const exportLogs: AuditLogEntry[] = json.data ?? []

      if (exportLogs.length === 0) {
        toast.warning("No records found to export.")
        return
      }

      // Build CSV
      const headers = ["Timestamp", "Task ID", "Task Title", "Changed By", "Action", "Field", "Old Value", "New Value"]
      const csvRows = [headers.join(",")]

      for (const log of exportLogs) {
        const row = [
          new Date(log.changedAt).toLocaleString("en-IN"),
          log.taskId,
          `"${(log.taskTitle ?? "").replace(/"/g, '""')}"`,
          log.changedByName,
          log.action,
          log.fieldName ?? "",
          `"${(log.oldValue ?? "").replace(/"/g, '""')}"`,
          `"${(log.newValue ?? "").replace(/"/g, '""')}"`,
        ]
        csvRows.push(row.join(","))
      }

      const csvString = csvRows.join("\n")
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `task_audit_log_${new Date().toISOString().split("T")[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success("CSV Export completed successfully.")
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to export CSV logs")
    } finally {
      setIsExporting(false)
    }
  }

  if (error) {
    return (
      <div className="rounded-md border p-8 text-center bg-card border-border">
        <ScrollText className="mx-auto mb-3 size-8 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">Audit Log unavailable</p>
        <p className="text-xs mt-1 text-muted-foreground">
          {error instanceof Error ? error.message : "Insufficient permissions to view this content."}
        </p>
      </div>
    )
  }

  const logs = infiniteData?.pages.flatMap((p) => p.data ?? []) ?? []
  const admins = infiniteData?.pages[0]?.admins ?? []
  const totalCount = infiniteData?.pages[infiniteData.pages.length - 1]?.meta?.total ?? 0
  const hasFilters = !!(dateFrom || dateTo || changedBy || taskId || action)

  // Helper to color code audit action badges
  const getActionBadgeClass = (act: string) => {
    switch (act) {
      case "created":
        return "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800"
      case "disabled":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800"
      case "updated":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800"
      case "self_assigned":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-800"
      case "attachment_added":
      case "attachment_removed":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800"
      case "commented":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800"
      case "sprint_changed":
      case "project_changed":
      case "status_changed":
      case "priority_changed":
        return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-800"
      default:
        return "bg-muted text-muted-foreground border-transparent"
    }
  }

  const columns = useMemo<ColumnDef<AuditLogEntry>[]>(() => [
    {
      accessorKey: "changedAt",
      header: "Timestamp",
      cell: ({ row }) => (
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
          {new Date(row.original.changedAt).toLocaleString("en-IN", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })}
        </span>
      ),
    },
    {
      accessorKey: "taskId",
      header: "Task ID",
      cell: ({ row }) => (
        <Link
          href={`/admin/tasks/${row.original.internalTaskId}`}
          className="font-mono font-bold hover:underline text-green-700 dark:text-green-400 text-xs"
        >
          {row.original.taskId}
        </Link>
      ),
    },
    {
      accessorKey: "taskTitle",
      header: "Task Title",
      cell: ({ row }) => (
        <span className="font-medium text-foreground truncate max-w-[150px] block text-xs" title={row.original.taskTitle}>
          {row.original.taskTitle}
        </span>
      ),
    },
    {
      accessorKey: "changedByName",
      header: "Changed By",
      cell: ({ row }) => (
        <span className="font-semibold text-foreground whitespace-nowrap text-xs">
          {row.original.changedByName}
        </span>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <span
          className={cn(
            "px-2 py-0.5 rounded border text-[10px] font-semibold capitalize whitespace-nowrap",
            getActionBadgeClass(row.original.action)
          )}
        >
          {row.original.action.replace("_", " ")}
        </span>
      ),
    },
    {
      accessorKey: "fieldName",
      header: "Field",
      cell: ({ row }) => {
        const fieldName = row.original.fieldName
        return fieldName ? (
          <span className="font-mono text-[10px] text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 dark:text-slate-200 dark:bg-slate-800/80 dark:border-slate-700">
            {fieldName}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )
      },
    },
    {
      accessorKey: "oldValue",
      header: "Old Value",
      cell: ({ row }) => {
        const oldValue = row.original.oldValue
        return (
          <span className="text-muted-foreground truncate max-w-[140px] block text-xs" title={oldValue ?? ""}>
            {oldValue ?? <span className="text-[10px] opacity-40">—</span>}
          </span>
        )
      },
    },
    {
      accessorKey: "newValue",
      header: "New Value",
      cell: ({ row }) => {
        const newValue = row.original.newValue
        return (
          <span className="text-foreground font-medium truncate max-w-[140px] block text-xs" title={newValue ?? ""}>
            {newValue ?? <span className="text-[10px] opacity-40">—</span>}
          </span>
        )
      },
    },
  ], [])

  return (
    <div className="space-y-6">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <History className="size-4 text-primary" />
            Global Task Audit Logs
          </h2>
          <p className="text-xs mt-0.5 text-muted-foreground">
            Full paginated ledger of change log mutations across all tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md border border-border text-xs bg-card text-muted-foreground hover:bg-subtle/50 transition-colors"
          >
            <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
            Refresh
          </button>
          <Button
            size="sm"
            onClick={handleExportCSV}
            disabled={isExporting || logs.length === 0}
            className="h-8 gap-1.5 font-semibold bg-green-700 text-white hover:bg-green-800"
          >
            <FileDown className="size-3.5" />
            {isExporting ? "Exporting…" : "Export to CSV"}
          </Button>
        </div>
      </div>

      {/* ── Filters Bar ───────────────────────────────────────────────────── */}
      <div className="rounded-md border border-border bg-card p-4 flex flex-wrap items-end gap-4">
        {/* Task Search */}
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <label className="text-[11px] font-semibold block text-muted-foreground">
            Task ID / Title
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search e.g. TASK-1002"
              value={taskSearchInput}
              onChange={(e) => setTaskSearchInput(e.target.value)}
              className="w-full h-9 rounded-md border border-border pl-8 pr-3 text-xs outline-none bg-card text-foreground"
            />
          </div>
        </div>

        {/* Changed By filter */}
        <div className="space-y-1.5 min-w-[180px]">
          <label className="text-[11px] font-semibold block text-muted-foreground">
            Changed By
          </label>
          <Select
            value={changedBy || "__all__"}
            onValueChange={(v) => updateFilters({ changedBy: v === "__all__" ? "" : v })}
          >
            <SelectTrigger className="w-full h-9 border-border bg-card text-xs">
              <SelectValue placeholder="All Administrators" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Administrators</SelectItem>
              {admins.map((adm) => (
                <SelectItem key={adm.id} value={adm.id}>
                  {adm.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action filter */}
        <div className="space-y-1.5 min-w-[150px]">
          <label className="text-[11px] font-semibold block text-muted-foreground">
            Action Type
          </label>
          <Select
            value={action || "__all__"}
            onValueChange={(v) => updateFilters({ action: v === "__all__" ? "" : v })}
          >
            <SelectTrigger className="w-full h-9 border-border bg-card text-xs">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Actions</SelectItem>
              {ACTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date From */}
        <div className="space-y-1.5 min-w-[130px]">
          <label className="text-[11px] font-semibold block text-muted-foreground">
            Start Date
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => updateFilters({ dateFrom: e.target.value })}
            className="w-full h-9 rounded-md border border-border px-3 text-xs outline-none bg-card text-foreground"
          />
        </div>

        {/* Date To */}
        <div className="space-y-1.5 min-w-[130px]">
          <label className="text-[11px] font-semibold block text-muted-foreground">
            End Date
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => updateFilters({ dateTo: e.target.value })}
            className="w-full h-9 rounded-md border border-border px-3 text-xs outline-none bg-card text-foreground"
          />
        </div>

        {/* Reset button */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="gap-1 text-xs shrink-0 h-9"
          >
            <FilterX className="size-3.5" />
            Reset
          </Button>
        )}
      </div>

      {/* ── Table Container ───────────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={logs}
        loading={isLoading || (isFetching && logs.length === 0)}
        pageSize={limit}
        emptyMessage="No task audit logs matching your selected filters."
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
        maxHeight="calc(100vh - 250px)"
      />
    </div>
  )
}

