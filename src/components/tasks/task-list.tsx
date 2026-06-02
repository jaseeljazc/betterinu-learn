"use client"

import * as React from "react"
import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { ColumnDef } from "@tanstack/react-table"
import {
  Search,
  Bug,
  Zap,
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowDown,
  Minus,
  ArrowUp,
  ShieldAlert,
  CalendarDays,
  MoreHorizontal,
  Pencil,
  Trash2,
  ClipboardList,
  RefreshCw,
  Eye,
  Plus,
  HandshakeIcon,
  Filter,
  ChevronDown,
} from "lucide-react"

import { useAdminPermissions } from "@/lib/hooks/useAdminPermissions"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DataTable } from "@/components/admin/data-table"
import { cn } from "@/lib/utils"

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

import {
  useInfiniteTasksQuery,
  useTaskProjects,
  useTaskDepartments,
  useTaskEmployees,
  useDisableTask,
  useClaimTask,
  useUpdateTaskStatus,
  type Task,
  type TaskFilters as Filters,
} from "@/lib/hooks/useTasks"

type TaskListProps = {
  initialData?: undefined
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Config maps                                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */

const TYPE_CFG = {
  task:    { label: "Task",    Icon: CheckSquare, color: "var(--green-700)",  bg: "var(--green-50)"  },
  bug:     { label: "Bug",     Icon: Bug,         color: "var(--danger-500)", bg: "var(--danger-50)" },
  feature: { label: "Feature", Icon: Zap,         color: "var(--amber-600)",  bg: "var(--amber-50)"  },
} as const

const STATUS_CFG = {
  todo:      { label: "Todo",      Icon: Clock,         color: "var(--text-muted)",    bg: "var(--bg-subtle)"  },
  doing:     { label: "Doing",     Icon: AlertTriangle, color: "var(--amber-600)",     bg: "var(--amber-50)"   },
  completed: { label: "Completed", Icon: CheckCircle2,  color: "var(--success-500)",   bg: "var(--success-50)" },
} as const

const PRIORITY_CFG = {
  low:      { label: "Low",      Icon: ArrowDown,   color: "var(--success-500)" },
  medium:   { label: "Medium",   Icon: Minus,       color: "var(--info-500)"    },
  high:     { label: "High",     Icon: ArrowUp,     color: "var(--terra-500)"   },
  critical: { label: "Critical", Icon: ShieldAlert, color: "var(--danger-500)"  },
} as const

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

function formatDueDate(d?: string | null) {
  if (!d) return null
  const date = new Date(d)
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const label = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  const overdue = diffDays < 0
  const soon = diffDays >= 0 && diffDays <= 2
  return { label, overdue, soon }
}



/* ─────────────────────────────────────────────────────────────────────────── */
/*  Main Component                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */

export function TaskList({ initialData }: TaskListProps) {
  const { can, isSuperAdmin, role, adminId } = useAdminPermissions()
  const queryClient = useQueryClient()

  const canCreate = can("tasks_mgmt", "create")
  const canEdit   = can("tasks_mgmt", "edit_any") || can("tasks_mgmt", "edit_own") || isSuperAdmin
  const canDelete = can("tasks_mgmt", "delete") || isSuperAdmin
  /** task_managers also have view_disabled; creators can see their own disabled tasks via toggle */
  const canViewDisabled = can("tasks_mgmt", "view_disabled") || isSuperAdmin || role === "task_manager"
  const canSelfAssign = can("tasks_mgmt", "self_assign") || isSuperAdmin
  /** Only admins and task managers can filter the list by assignee */
  const canFilterByAssignee = isSuperAdmin || role === "task_manager"

  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: "",
    priority: "",
    type: "",
    assignee: "",
    project_id: "",
    department_id: "",
    due_after: "",
    due_before: "",
    is_active: "true",
  })

  const [searchInput, setSearchInput] = useState("")

  /** Pending confirm action — null means dialog is closed */
  const [pendingAction, setPendingAction] = useState<
    | { type: "disable"; taskId: string; taskLabel: string }
    | { type: "claim"; taskId: string; taskLabel: string }
    | null
  >(null)

  /* Debounce search input */
  const applySearch = useCallback((v: string) => {
    setFilters((f) => ({ ...f, search: v }))
  }, [])

  /* Reset dependent fields when department changes */
  useEffect(() => {
    if (filters.department_id) {
      queryClient.refetchQueries({ queryKey: ["task-projects-list"] })
    }
  }, [filters.department_id, queryClient])

  /* React Query fetches */
  const {
    data: infiniteData,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteTasksQuery(filters)
  const { data: projects = [] } = useTaskProjects()
  const { data: departments = [] } = useTaskDepartments()
  const { data: employees = [] } = useTaskEmployees()

  /* Disable task mutation */
  const disableMutation = useDisableTask()

  /* Claim task mutation */
  const claimMutation = useClaimTask()

  /* Update status mutation */
  const updateStatusMutation = useUpdateTaskStatus()

  /* Optimistic status overrides: taskId -> status */
  const [optimisticStatuses, setOptimisticStatuses] = useState<Record<string, string>>({})

  const tasks = infiniteData?.pages.flatMap((p) => p.data) ?? []
  const lastMeta = infiniteData?.pages[infiniteData.pages.length - 1]?.meta

  function setFilter(key: keyof Filters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }))
  }

  const hasActiveFilters = Object.entries(filters).some(([k, v]) =>
    k !== "is_active" ? !!v : v !== "true"
  )

  const activeFiltersCount = Object.entries(filters).filter(([k, v]) => {
    if (k === "is_active" || k === "status" || k === "search") return false
    return !!v
  }).length

  const filteredProjects = filters.department_id
    ? projects.filter((p) => !p.departmentId || p.departmentId === filters.department_id)
    : projects

  const filteredEmployees = filters.department_id
    ? employees.filter((e) => !e.departmentId || e.departmentId === filters.department_id)
    : employees

  /* Columns definitions for DataTable */
  const columns = React.useMemo<ColumnDef<Task>[]>(() => [
    {
      accessorKey: "taskId",
      header: "Task ID",
      size: 90,
      cell: ({ row }) => (
        <div className={cn("w-full", !row.original.isActive && "opacity-60")}>
          <Link
            href={`/admin/tasks/${row.original.id}`}
            className="font-mono text-xs px-1.5 py-0.5 rounded border border-default bg-subtle hover:underline font-bold text-foreground"
          >
            {row.original.taskId}
          </Link>
        </div>
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
      size: 200,
      cell: ({ row }) => {
        const title = row.original.title
        const disabled = !row.original.isActive
        return (
          <div className={cn("w-full", disabled && "opacity-60")}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    "block truncate text-sm max-w-[200px] font-normal text-foreground cursor-default",
                    disabled && "line-through text-muted-foreground"
                  )}
                >
                  {title}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs break-words">
                {title}
              </TooltipContent>
            </Tooltip>
          </div>
        )
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      size: 100,
      cell: ({ row }) => {
        const type = row.original.type
        const cfg = TYPE_CFG[type as keyof typeof TYPE_CFG] ?? TYPE_CFG.task
        return (
          <div className={cn("w-full", !row.original.isActive && "opacity-60")}>
            <Badge
              variant="outline"
              className="capitalize"
              style={{ color: cfg.color, borderColor: cfg.color, background: cfg.bg }}
            >
              <cfg.Icon className="size-3 mr-1 inline-block" />
              {cfg.label}
            </Badge>
          </div>
        )
      },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      size: 100,
      cell: ({ row }) => {
        const priority = row.original.priority
        const cfg = PRIORITY_CFG[priority as keyof typeof PRIORITY_CFG] ?? PRIORITY_CFG.medium
        const priorityStyles: Record<string, string> = {
          low: "bg-green-50 text-green-700 border-green-200",
          medium: "bg-blue-50 text-blue-700 border-blue-200",
          high: "bg-orange-50 text-orange-700 border-orange-200",
          critical: "bg-red-50 text-red-700 border-red-200",
        }
        return (
          <div className={cn("w-full", !row.original.isActive && "opacity-60")}>
            <Badge variant="outline" className={cn("capitalize", priorityStyles[priority])}>
              <cfg.Icon className="size-3 mr-1 inline-block" />
              {cfg.label}
            </Badge>
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      size: 140,
      cell: ({ row }) => {
        const task = row.original
        const effectiveStatus = optimisticStatuses[task.id] ?? task.status
        const cfg = STATUS_CFG[effectiveStatus as keyof typeof STATUS_CFG] ?? STATUS_CFG.todo
        const isPending = updateStatusMutation.isPending && updateStatusMutation.variables?.id === task.id
        return (
          <div className={cn("w-full", !task.isActive && "opacity-60")}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  disabled={!task.isActive || isPending}
                  className="inline-flex w-28 cursor-pointer items-center justify-between gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors hover:opacity-80 disabled:cursor-default"
                  style={{ color: cfg.color, borderColor: cfg.color, background: cfg.bg }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {isPending ? (
                      <RefreshCw className="size-3 animate-spin" />
                    ) : (
                      <cfg.Icon className="size-3" />
                    )}
                    <span>{cfg.label}</span>
                  </span>
                  <ChevronDown className="size-3 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="z-50 min-w-[140px] bg-white rounded-md border border-default p-1 shadow-md">
                {(["todo", "doing", "completed"] as const).map((s) => {
                  const scfg = STATUS_CFG[s]
                  const isSelected = effectiveStatus === s
                  return (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => {
                        if (s === effectiveStatus) return
                        setOptimisticStatuses((prev) => ({ ...prev, [task.id]: s }))
                        updateStatusMutation.mutate(
                          { id: task.id, status: s },
                          {
                            onError: () => {
                              setOptimisticStatuses((prev) => {
                                const next = { ...prev }
                                delete next[task.id]
                                return next
                              })
                            },
                            onSuccess: () => {
                              setOptimisticStatuses((prev) => {
                                const next = { ...prev }
                                delete next[task.id]
                                return next
                              })
                            },
                          }
                        )
                      }}
                      className="flex items-center gap-2 px-2 py-1.5 text-xs cursor-pointer rounded transition-colors"
                      style={isSelected ? { background: scfg.bg, color: scfg.color } : {}}
                    >
                      <scfg.Icon className="size-3.5" style={{ color: scfg.color }} />
                      <span className="font-semibold" style={{ color: scfg.color }}>{scfg.label}</span>
                      {isSelected && <CheckCircle2 className="size-3 ml-auto" style={{ color: scfg.color }} />}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
    {
      accessorKey: "assignedTo",
      header: "Assigned To",
      size: 150,
      cell: ({ row }) => {
        const assignee = row.original.assignedTo
        if (!assignee) return <span className="text-muted-foreground text-xs italic">—</span>
        const name = assignee.fullName
        const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
        return (
          <div className={cn("flex items-center gap-2", !row.original.isActive && "opacity-60")}>
            <Avatar size="sm">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="text-xs truncate font-medium text-foreground">{name}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      size: 130,
      cell: ({ row }) => {
        const dateVal = row.original.dueDate
        if (!dateVal) return <span className="text-muted-foreground text-xs">—</span>
        const dueInfo = formatDueDate(dateVal)
        const isOverdue = dueInfo ? dueInfo.overdue && row.original.status !== "completed" : false
        return (
          <div className={cn("w-full", !row.original.isActive && "opacity-60")}>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs",
                isOverdue ? "text-red-600 font-bold" : "text-muted-foreground"
              )}
            >
              {isOverdue && <AlertTriangle className="size-3 text-red-600" />}
              {dueInfo?.label}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      size: 120,
      cell: ({ row }) => {
        const d = row.original.createdAt
        if (!d) return <span className="text-muted-foreground text-xs">—</span>
        const dateObj = new Date(d)
        const dateLabel = dateObj.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
        const timeLabel = dateObj.toLocaleTimeString("en-IN", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
        return (
          <div className={cn("flex flex-col", !row.original.isActive && "opacity-60")}>
            <span className="text-xs font-medium text-foreground">{dateLabel}</span>
            <span className="text-[10px] text-muted-foreground uppercase">{timeLabel}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "project",
      header: "Project",
      size: 140,
      cell: ({ row }) => {
        const project = row.original.project
        return (
          <span className={cn("text-xs truncate text-foreground block max-w-[130px]", !row.original.isActive && "opacity-60")}>
            {project?.name ?? "—"}
          </span>
        )
      },
    },
    {
      accessorKey: "department",
      header: "Department",
      size: 140,
      cell: ({ row }) => {
        const dept = row.original.department
        return (
          <span className={cn("text-xs truncate text-foreground block max-w-[130px]", !row.original.isActive && "opacity-60")}>
            {dept?.name ?? "—"}
          </span>
        )
      },
    },
    {
      id: "actions",
      header: "Actions",
      size: 70,
      cell: ({ row }) => {
        const task = row.original
        const isClaimable = canSelfAssign && !task.assignedTo && task.isActive
        /** Creator can disable their own task; task_managers and super_admin can disable any */
        const canDisableThis =
          task.isActive &&
          (canDelete || role === "task_manager" || (adminId && task.createdBy?.id === adminId))
        return (
          <div className="flex items-center justify-end gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-default bg-white text-secondary transition-colors hover:border-primary hover:text-primary cursor-pointer"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-50 min-w-[140px] bg-white rounded-md border border-default p-1 shadow-md">
                <DropdownMenuItem
                  asChild
                  className="flex items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-subtle transition-colors cursor-pointer rounded"
                >
                  <Link href={`/admin/tasks/${task.id}`}>
                    <Eye className="size-3.5" /> View Detail
                  </Link>
                </DropdownMenuItem>
                {isClaimable && (
                  <DropdownMenuItem
                    onClick={() =>
                      setPendingAction({
                        type: "claim",
                        taskId: task.id,
                        taskLabel: task.taskId,
                      })
                    }
                    disabled={claimMutation.isPending}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer rounded font-medium"
                  >
                    <HandshakeIcon className="size-3.5" /> Claim Task
                  </DropdownMenuItem>
                )}
                {canEdit && (
                  <DropdownMenuItem
                    asChild
                    className="flex items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-subtle transition-colors cursor-pointer rounded"
                  >
                    <Link href={`/admin/tasks/${task.id}?edit=1`}>
                      <Pencil className="size-3.5" /> Edit Task
                    </Link>
                  </DropdownMenuItem>
                )}
                {canDisableThis && (
                  <DropdownMenuItem
                    onClick={() =>
                      setPendingAction({
                        type: "disable",
                        taskId: task.id,
                        taskLabel: task.taskId,
                      })
                    }
                    className="flex items-center gap-2 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors cursor-pointer rounded"
                  >
                    <Trash2 className="size-3.5" /> Disable Task
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ], [canEdit, canDelete, canSelfAssign, role, adminId, disableMutation, claimMutation, updateStatusMutation, optimisticStatuses])

  return (
    <div
      className="rounded-lg  overflow-hidden"
      style={{
        // background: "var(--bg-surface)",
        // borderColor: "var(--border-default)",
      }}
    >
      {/* ── Toolbar & Filters ─────────────────────────────────────────────────── */}
      <div
        className="flex flex-col gap-4 py-4 border-b"
        // style={{ borderColor: "var(--border-muted)" }}
      >
        {/* Search & Actions Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-sm min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search by ID, title, description..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value)
                  const v = e.target.value
                  const timer = setTimeout(() => applySearch(v), 350)
                  return () => clearTimeout(timer)
                }}
                className="h-10 w-full rounded-md border pl-9 pr-3 text-sm outline-none transition-all focus:border-green-700"
                style={{
                  borderColor: "var(--border-default)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {/* Status Filter (Quick Access Tabs) */}
            <div
              className="flex items-center gap-1 rounded-lg p-1 h-10"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
              }}
            >
              {[
                { value: "", label: "All" },
                { value: "todo", label: "Todo" },
                { value: "doing", label: "Doing" },
                { value: "completed", label: "Completed" },
              ].map((tab) => {
                const isActive = (filters.status || "") === tab.value
                return (
                  <button
                    key={tab.value}
                    onClick={() => setFilter("status", tab.value)}
                    className="flex items-center justify-center rounded-md px-3 py-1 text-xs font-semibold transition-colors cursor-pointer select-none h-8"
                    style={
                      isActive
                        ? {
                            background: "var(--primary)",
                            color: "white",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                          }
                        : {
                            color: "var(--text-muted)",
                          }
                    }
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Parent Popover named Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 text-xs gap-1.5 border-default bg-surface font-semibold text-secondary cursor-pointer">
                  <Filter className="size-3.5 text-muted-foreground" />
                  Filter
                  {activeFiltersCount > 0 && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-green-700 text-[10px] font-bold text-white">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 bg-white border border-default shadow-lg rounded-md space-y-4" align="start">
                <div className="flex items-center justify-between pb-2 border-b border-default">
                  <span className="font-semibold text-sm text-foreground">Filters</span>
                </div>

                <div className="space-y-3.5">
                  {/* Priority */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Priority</label>
                    <Select value={filters.priority || "__all__"} onValueChange={(v) => setFilter("priority", v === "__all__" ? "" : v)}>
                      <SelectTrigger className="h-9 text-xs border-default bg-surface">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All Priority</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Type */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Type</label>
                    <Select value={filters.type || "__all__"} onValueChange={(v) => setFilter("type", v === "__all__" ? "" : v)}>
                      <SelectTrigger className="h-9 text-xs border-default bg-surface">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All Types</SelectItem>
                        <SelectItem value="task">Task</SelectItem>
                        <SelectItem value="bug">Bug</SelectItem>
                        <SelectItem value="feature">Feature</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Department */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Department</label>
                    <Select value={filters.department_id || "__all__"} onValueChange={(v) => setFilter("department_id", v === "__all__" ? "" : v)}>
                      <SelectTrigger className="h-9 text-xs border-default bg-surface">
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All Departments</SelectItem>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Assignee — only visible to super_admin and task_manager */}
                  {canFilterByAssignee && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assignee</label>
                      <Select value={filters.assignee || "__all__"} onValueChange={(v) => setFilter("assignee", v === "__all__" ? "" : v)}>
                        <SelectTrigger className="h-9 text-xs border-default bg-surface">
                          <SelectValue placeholder="Assignee" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">All Assignees</SelectItem>
                          {filteredEmployees.map((e) => (
                            <SelectItem key={e.id} value={e.id}>{e.fullName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Date Range Row */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Due From */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Due From</label>
                      <input
                        type="date"
                        value={filters.due_after}
                        onChange={(e) => setFilter("due_after", e.target.value)}
                        className="h-9 w-full rounded-md border border-default bg-surface px-2.5 text-xs outline-none focus:border-green-700 transition-colors"
                        style={{ color: "var(--text-primary)" }}
                      />
                    </div>

                    {/* Due To */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Due To</label>
                      <input
                        type="date"
                        value={filters.due_before}
                        onChange={(e) => setFilter("due_before", e.target.value)}
                        className="h-9 w-full rounded-md border border-default bg-surface px-2.5 text-xs outline-none focus:border-green-700 transition-colors"
                        style={{ color: "var(--text-primary)" }}
                      />
                    </div>
                  </div>

                  {/* Clear All Filters Button inside Dropdown */}
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFilters({
                          search: "",
                          status: "",
                          priority: "",
                          type: "",
                          assignee: "",
                          project_id: "",
                          department_id: "",
                          due_after: "",
                          due_before: "",
                          is_active: "true",
                        })
                        setSearchInput("")
                      }}
                      className="w-full text-xs font-semibold border-destructive/20 hover:bg-destructive/5 text-destructive cursor-pointer h-9 mt-4"
                    >
                      Clear all filters
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Show Disabled Tasks Toggle */}
            {canViewDisabled && (
              <div className="flex items-center gap-2 px-3 h-10 rounded-md border border-default bg-surface">
                <input
                  id="show-disabled-toggle"
                  type="checkbox"
                  checked={filters.is_active === "false"}
                  onChange={(e) => setFilter("is_active", e.target.checked ? "false" : "true")}
                  className="rounded border-default text-green-700 focus:ring-green-700 size-4 cursor-pointer"
                />
                <label htmlFor="show-disabled-toggle" className="text-xs font-semibold text-secondary cursor-pointer select-none">
                  Show disabled tasks
                </label>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh"
              className="flex items-center justify-center h-10 w-10 rounded-md border transition-colors hover:bg-subtle cursor-pointer"
              style={{ borderColor: "var(--border-default)", color: "var(--text-muted)" }}
            >
              <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>

            {canCreate && (
              <Link href="/admin/tasks/new">
                <Button size="sm" className="cursor-pointer">
                  <Plus className="size-4 mr-1.5" />
                  New Task  
                </Button>
              </Link>
            )}
          </div>
        </div>

      </div>

      {/* ── List Body / DataTable / Empty State ───────────────────────────────── */}
      {tasks.length === 0 && !isLoading && !isFetching ? (
        <div
          className="flex flex-col items-center justify-center py-20 p-8 text-center"
          style={{ background: "var(--bg-surface)" }}
        >
          <ClipboardList className="size-12 mb-4 text-muted-foreground" style={{ color: "var(--text-disabled)" }} />
          <h3 className="text-base font-semibold text-foreground mb-1">No tasks found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            There are no tasks matching your filters, or no tasks have been created yet.
          </p>
          {canCreate && (
            <Link href="/admin/tasks/new">
              <Button size="sm" className="cursor-pointer">
                + New Task
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={tasks}
            loading={isLoading || (isFetching && tasks.length === 0)}
            pageSize={20}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={() => fetchNextPage()}
            maxHeight="calc(100vh - 200px)"
          />
        </>
      )}

      {/* ── Confirm Dialog ─────────────────────────────────────────────────────── */}
      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => { if (!open) setPendingAction(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            {pendingAction?.type === "disable" ? (
              <>
                <AlertDialogTitle>Disable task {pendingAction.taskLabel}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This task will be marked as inactive and hidden from regular views. You can
                  re-enable it later from the disabled tasks list.
                </AlertDialogDescription>
              </>
            ) : (
              <>
                <AlertDialogTitle>Claim task {pendingAction?.taskLabel}?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will be assigned to this task and a 48-hour self-assign confirmation
                  window will begin. Make sure you can commit before claiming.
                </AlertDialogDescription>
              </>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="bg-popover border-none">
            <AlertDialogCancel size="sm" onClick={() => setPendingAction(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              size="sm"
              variant={pendingAction?.type === "disable" ? "destructive" : "default"}
              onClick={() => {
                if (!pendingAction) return
                if (pendingAction.type === "disable") {
                  disableMutation.mutate(pendingAction.taskId)
                } else {
                  claimMutation.mutate(pendingAction.taskId)
                }
                setPendingAction(null)
              }}
            >
              {pendingAction?.type === "disable" ? "Yes, disable" : "Yes, claim task"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
