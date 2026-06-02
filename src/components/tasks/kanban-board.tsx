"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Bug,
  Zap,
  CheckSquare,
  ArrowDown,
  Minus,
  ArrowUp,
  ShieldAlert,
  CalendarDays,
  MoreHorizontal,
  Pencil,
  ClipboardList,
  RefreshCw,
  MessageSquare,
  Paperclip,
  Plus,
  Eye,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

import {
  useTaskSprints,
  useAllTasks,
  useTaskProjects,
  useUpdateTaskStatus,
  useClaimTask,
  type Task
} from "@/lib/hooks/useTasks"

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Config                                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */

const COLUMNS = [
  {
    key: "todo",
    label: "Todo",
    Icon: Clock,
    color: "var(--text-secondary)",
    bg: "var(--bg-subtle)",
    border: "var(--border-muted)",
  },
  {
    key: "doing",
    label: "Doing",
    Icon: AlertTriangle,
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
  },
  {
    key: "completed",
    label: "Completed",
    Icon: CheckCircle2,
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
  },
]

const TYPE_CFG = {
  task:    { label: "Task",    Icon: CheckSquare, color: "var(--green-700)",  bg: "var(--green-50)"  },
  bug:     { label: "Bug",     Icon: Bug,         color: "var(--danger-500)", bg: "var(--danger-50)" },
  feature: { label: "Feature", Icon: Zap,         color: "var(--amber-600)",  bg: "var(--amber-50)"  },
} as const

const PRIORITY_CFG = {
  low:      { label: "Low",      Icon: ArrowDown,   color: "var(--info-500)"    },
  medium:   { label: "Medium",   Icon: Minus,       color: "#ca8a04"            },
  high:     { label: "High",     Icon: ArrowUp,     color: "var(--terra-500)"   },
  critical: { label: "Critical", Icon: ShieldAlert, color: "var(--danger-500)"  },
} as const

const PRIORITY_BORDERS: Record<string, string> = {
  low: "border-l-4 border-l-blue-400",
  medium: "border-l-4 border-l-yellow-400",
  high: "border-l-4 border-l-orange-500",
  critical: "border-l-4 border-l-red-600",
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Data fetch helpers                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */

// Data helpers moved to useTasks

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Date helpers                                                                */
/* ─────────────────────────────────────────────────────────────────────────── */

function checkIsOverdue(dueDate?: string | null) {
  if (!dueDate) return false
  const date = new Date(dueDate)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  return date < now
}

function formatDateLabel(d?: string | null) {
  if (!d) return ""
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Task Card Component                                                         */
/* ─────────────────────────────────────────────────────────────────────────── */

type TaskCardProps = {
  task: Task
  onStatusChange: (id: string, newStatus: string) => void
  onClaim: (id: string) => void
  canEdit: boolean
  canSelfAssign: boolean
}

function TaskCard({ task, onStatusChange, onClaim, canEdit, canSelfAssign }: TaskCardProps) {
  const typeCfg = TYPE_CFG[task.type as keyof typeof TYPE_CFG] ?? TYPE_CFG.task
  const priorityCfg = PRIORITY_CFG[task.priority as keyof typeof PRIORITY_CFG] ?? PRIORITY_CFG.medium
  const isOverdue = checkIsOverdue(task.dueDate) && task.status !== "completed"

  return (
    <div
      className={cn(
        "group relative rounded-md border bg-white p-3 shadow-sm hover:shadow-md transition-all cursor-default",
        PRIORITY_BORDERS[task.priority] ?? "border-l-4 border-l-slate-200"
      )}
      style={{ borderColor: "var(--border-default)" }}
    >
      {/* Type badge + priority dot row */}
      <div className="flex items-center justify-between mb-2">
        <Link
          href={`/admin/tasks/${task.id}`}
          className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-default bg-subtle hover:underline font-bold text-foreground"
        >
          {task.taskId}
        </Link>
        <span title={`Priority: ${task.priority}`}>
          <priorityCfg.Icon className="size-3.5" style={{ color: priorityCfg.color }} />
        </span>
      </div>

      {/* Title */}
      <Link
        href={`/admin/tasks/${task.id}`}
        className="block text-sm font-semibold leading-snug mb-2 hover:underline text-foreground"
      >
        {task.title}
      </Link>

      {/* Type & project details */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <Badge
          variant="outline"
          className="capitalize text-[9px] py-0 px-1.5"
          style={{ color: typeCfg.color, borderColor: typeCfg.color, background: typeCfg.bg }}
        >
          {task.type}
        </Badge>
        {task.project && (
          <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">
            {task.project.name}
          </span>
        )}
      </div>

      {/* Bottom info: Avatar, due date, counts */}
      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t" style={{ borderColor: "var(--border-muted)" }}>
        <div className="flex flex-col gap-1.5">
          {task.dueDate && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-medium rounded px-1.5 py-0.5",
                isOverdue
                  ? "bg-red-50 text-red-600 border border-red-200 font-semibold"
                  : "bg-subtle text-muted-foreground border border-default"
              )}
            >
              <CalendarDays className="size-3" />
              {formatDateLabel(task.dueDate)}
            </span>
          )}

          {task.assignedTo ? (
            <div className="flex items-center gap-1.5">
              <Avatar size="sm" className="size-5 text-[9px]">
                <AvatarFallback>
                  {task.assignedTo.fullName.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] text-muted-foreground truncate max-w-[110px] font-medium">
                {task.assignedTo.fullName}
              </span>
              {task.selfAssignStatus === "pending" && (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-[9px] py-0 px-1 font-bold">
                  Pending
                </Badge>
              )}
            </div>
          ) : (
            canSelfAssign && (
              <Button
                size="xs"
                onClick={() => onClaim(task.id)}
                style={{ background: "var(--green-700)", color: "#fff" }}
                className="text-[10px] font-semibold py-0.5 px-2 h-6 cursor-pointer"
              >
                Claim Task
              </Button>
            )
          )}
        </div>

        {/* Attachment & comments metrics */}
        <div className="flex items-center gap-1.5 shrink-0 self-end">
          {task.attachmentCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground" title="Has attachments">
              <Paperclip className="size-3" />
              {task.attachmentCount}
            </span>
          )}
          {task.commentCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground" title="Comments">
              <MessageSquare className="size-3" />
              {task.commentCount}
            </span>
          )}
          {task.subtaskCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground" title="Sub-tasks">
              <ClipboardList className="size-3" />
              {task.subtaskCount}
            </span>
          )}
        </div>
      </div>

      {/* Dropdown Menu (Three-dot options icon) */}
      <div className="absolute top-2 right-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-6 w-6 items-center justify-center rounded-md border border-default bg-white text-secondary transition-colors hover:border-primary hover:text-primary cursor-pointer"
            >
              <MoreHorizontal className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-50 min-w-[150px] bg-white rounded-md border border-default p-1 shadow-md">
            <DropdownMenuItem
              disabled={task.status === "todo"}
              onClick={() => onStatusChange(task.id, "todo")}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-subtle transition-colors cursor-pointer rounded disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Clock className="size-3.5" /> Move to Todo
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={task.status === "doing"}
              onClick={() => onStatusChange(task.id, "doing")}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-subtle transition-colors cursor-pointer rounded disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <AlertTriangle className="size-3.5" /> Move to Doing
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={task.status === "completed"}
              onClick={() => onStatusChange(task.id, "completed")}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-subtle transition-colors cursor-pointer rounded disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="size-3.5" /> Move to Completed
            </DropdownMenuItem>
            <DropdownMenuItem
              asChild
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-subtle transition-colors cursor-pointer rounded border-t mt-1 pt-2"
            >
              <Link href={`/admin/tasks/${task.id}`}>
                <Eye className="size-3.5" /> View Details
              </Link>
            </DropdownMenuItem>
            {canEdit && (
              <DropdownMenuItem
                asChild
                className="flex items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-subtle transition-colors cursor-pointer rounded"
              >
                <Link href={`/admin/tasks/${task.id}?edit=1`}>
                  <Pencil className="size-3.5" /> Edit
                </Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Kanban Column Component                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

type KanbanColumnProps = {
  col: (typeof COLUMNS)[0]
  tasks: Task[]
  onStatusChange: (id: string, status: string) => void
  onClaim: (id: string) => void
  canEdit: boolean
  canCreate: boolean
  canSelfAssign: boolean
}

function KanbanColumn({
  col,
  tasks,
  onStatusChange,
  onClaim,
  canEdit,
  canCreate,
  canSelfAssign,
}: KanbanColumnProps) {
  return (
    <div className="flex flex-col min-w-[280px] max-w-[340px] flex-1">
      {/* Column Header */}
      <div
        className="flex items-center justify-between rounded-t-md px-3 py-2.5 border-l-2"
        style={{
          background: col.bg,
          borderLeftColor: col.color,
          borderTop: `1px solid ${col.border}`,
          borderRight: `1px solid ${col.border}`,
          borderBottom: `1px solid ${col.border}`,
        }}
      >
        <div className="flex items-center gap-2">
          <col.Icon className="size-4" style={{ color: col.color }} />
          <span className="text-sm font-bold text-foreground">{col.label}</span>
          <span
            className="rounded-full px-2 py-0.5 text-xs font-bold"
            style={{ background: col.color, color: "#fff", opacity: 0.85 }}
          >
            {tasks.length}
          </span>
        </div>
        {canCreate && col.key === "todo" && (
          <Link
            href="/admin/tasks/new"
            className="rounded p-1 transition-colors hover:bg-white text-foreground"
            title="New task"
          >
            <Plus className="size-4" />
          </Link>
        )}
      </div>

      {/* Cards Area */}
      <div
        className="flex-1 overflow-y-auto p-2 space-y-2 rounded-b-md border-l border-r border-b"
        style={{ borderColor: col.border, minHeight: 250, maxHeight: "calc(100vh - 280px)" }}
      >
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <col.Icon className="size-8" style={{ color: col.color, opacity: 0.2 }} />
            <p className="text-xs text-muted-foreground">No tasks</p>
          </div>
        ) : (
          tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              onStatusChange={onStatusChange}
              onClaim={onClaim}
              canEdit={canEdit}
              canSelfAssign={canSelfAssign}
            />
          ))
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Main Board Component                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */

type KanbanBoardProps = {
  canEdit: boolean
  canCreate: boolean
}

export function KanbanBoard({ canEdit, canCreate }: KanbanBoardProps) {
  const { can, isSuperAdmin } = useAdminPermissions()

  const [projectId, setProjectId] = useState("")
  const [sprintId, setSprintId] = useState("")

  const canSelfAssign = can("tasks_mgmt", "self_assign") || isSuperAdmin

  /* Load Sprints list when a project is selected */
  const { data: sprints = [] } = useTaskSprints(projectId)

  /* Reset sprintId if projectId changes */
  useEffect(() => {
    setSprintId("")
  }, [projectId])

  /* Main query */
  const { data: tasks = [], isLoading, refetch, isFetching } = useAllTasks(projectId, sprintId)

  const { data: projects = [] } = useTaskProjects()

  /* Status change mutation */
  const statusMutation = useUpdateTaskStatus()

  /* Task claim mutation */
  const claimMutation = useClaimTask()

  // Group active tasks by status
  const boardColumns = COLUMNS.map((col) => ({
    ...col,
    tasks: tasks.filter((t) => t.status === col.key && t.isActive),
  }))

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Project Select */}
        {projects.length > 0 && (
          <div className="flex flex-col gap-1 w-full sm:w-44">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Project</label>
            <Select value={projectId || "__all__"} onValueChange={(v) => setProjectId(v === "__all__" ? "" : v)}>
              <SelectTrigger className="h-9 text-xs border-default bg-surface">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Sprint Select (shown only when a project is selected) */}
        {projectId && sprints.length > 0 && (
          <div className="flex flex-col gap-1 w-full sm:w-44">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sprint</label>
            <Select value={sprintId || "__all__"} onValueChange={(v) => setSprintId(v === "__all__" ? "" : v)}>
              <SelectTrigger className="h-9 text-xs border-default bg-surface">
                <SelectValue placeholder="No Sprint" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Sprints</SelectItem>
                {sprints.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-end gap-2 pt-5">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 h-9 px-3 rounded-md border text-xs transition-colors hover:bg-subtle cursor-pointer"
            style={{ borderColor: "var(--border-default)", color: "var(--text-muted)" }}
          >
            <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <span className="ml-auto text-xs self-end pb-2" style={{ color: "var(--text-muted)" }}>
          {tasks.filter((t) => t.isActive).length} active tasks
        </span>
      </div>

      {/* Board columns layout */}
      {isLoading ? (
        <div className="flex gap-4">
          {COLUMNS.map((col) => (
            <div key={col.key} className="flex-1 min-w-[280px] space-y-2">
              <div className="h-10 rounded-md" style={{ background: col.bg }} />
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-md border" style={{ borderColor: "var(--border-muted)", background: "var(--bg-subtle)" }} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {boardColumns.map((col) => (
            <KanbanColumn
              key={col.key}
              col={col}
              tasks={col.tasks}
              onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
              onClaim={(id) => claimMutation.mutate(id)}
              canEdit={canEdit}
              canCreate={canCreate}
              canSelfAssign={canSelfAssign}
            />
          ))}
        </div>
      )}
    </div>
  )
}
