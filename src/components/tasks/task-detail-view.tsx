"use client"

import { useState, useRef, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/admin/data-table"
import {
  ArrowLeft, Pencil, X, Bug, Zap, CheckSquare, Clock,
  AlertTriangle, CheckCircle2, ArrowDown, Minus, ArrowUp,
  ShieldAlert, CalendarDays, User, FolderOpen, MessageSquare,
  Eye, EyeOff, Lock, Loader2, Building2, History, FileText,
  Download, Copy, Check, Trash2, Plus, GitBranch, Calendar,
  Send, HandshakeIcon, Paperclip, LayoutList, RefreshCw,
  Edit2,
} from "lucide-react"
import { useAdminPermissions } from "@/lib/hooks/useAdminPermissions"
import { useClaimTask } from "@/lib/hooks/useTasks"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  useTaskComments, useTaskAudit, useUpdateTaskStatus,
  useAddTaskComment, useEditTaskComment, useDeleteTaskComment,
  useToggleTaskActive,
  type Comment, type AuditEntry,
} from "@/lib/hooks/useTaskDetail"

/* ─────────────────────────────────────────────────────────── */
/*  Types                                                       */
/* ─────────────────────────────────────────────────────────── */

type TaskDetail = {
  id: string; taskId: string; title: string
  description?: string | null; note?: string | null
  type: string; status: string; priority: string
  visibility: string; isActive: boolean
  dueDate?: string | null; estimatedHours?: number | null
  loggedHours?: number | null
  createdAt: string; updatedAt: string; completedAt?: string | null
  project?: { id: string; name: string } | null
  sprint?: { id: string; name: string } | null
  department?: { id: string; name: string } | null
  createdBy?: { id: string; fullName: string } | null
  assignedTo?: { id: string; fullName: string } | null
  assignedBy?: { id: string; fullName: string } | null
  reviewer?: { id: string; fullName: string } | null
  parentTask?: { id: string; taskId: string; title: string } | null
  subtasks?: {
    id: string; taskId: string; title: string; status: string
    assignedTo?: { id: string; fullName: string } | null
  }[]
  attachments?: Attachment[]
  commentCount: number; subtaskCount: number; attachmentCount: number
}

type Attachment = {
  id: string; fileName: string; fileSizeBytes?: number | null
  mimeType?: string | null; uploadedAt: string
  uploadedBy?: { id: string; fullName: string } | null
  presignedUrl?: string | null
  downloadUrl?: string | null
}

/* ─────────────────────────────────────────────────────────── */
/*  Config                                                      */
/* ─────────────────────────────────────────────────────────── */

const TYPE_CFG = {
  task:    { label: "Task",    Icon: CheckSquare, cls: "bg-green-50 text-green-700 border-green-200" },
  bug:     { label: "Bug",     Icon: Bug,         cls: "bg-red-50 text-red-600 border-red-200" },
  feature: { label: "Feature", Icon: Zap,         cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
} as const

const STATUS_CFG = {
  todo:      { label: "To Do",       Icon: Clock,        cls: "bg-gray-100 text-gray-600 border-gray-200",   color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1", step: 0 },
  doing:     { label: "In Progress", Icon: RefreshCw,    cls: "bg-blue-50 text-blue-700 border-blue-200",    color: "#2563eb", bg: "#eff6ff", border: "#93c5fd", step: 1 },
  completed: { label: "Done",        Icon: CheckCircle2, cls: "bg-green-50 text-green-700 border-green-200", color: "#16a34a", bg: "#f0fdf4", border: "#86efac", step: 2 },
} as const

const PRIORITY_CFG = {
  low:      { label: "Low",      Icon: ArrowDown,   cls: "bg-blue-50 text-blue-600 border-blue-200" },
  medium:   { label: "Medium",   Icon: Minus,       cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  high:     { label: "High",     Icon: ArrowUp,     cls: "bg-orange-50 text-orange-600 border-orange-200" },
  critical: { label: "Critical", Icon: ShieldAlert, cls: "bg-red-50 text-red-600 border-red-200" },
} as const

const VISIBILITY_CFG = {
  public:       { label: "Public",       Icon: Eye },
  private:      { label: "Private",      Icon: EyeOff },
  confidential: { label: "Confidential", Icon: Lock },
} as const

/* ─────────────────────────────────────────────────────────── */
/*  Helpers                                                     */
/* ─────────────────────────────────────────────────────────── */

function fmtDate(d?: string | null) {
  if (!d) return undefined
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function fmtDateTime(d?: string | null) {
  if (!d) return undefined
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function fmtRelTime(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return fmtDate(d) ?? d
}

function fmtBytes(b?: number | null) {
  if (!b) return ""
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

/* ─────────────────────────────────────────────────────────── */
/*  Shared UI primitives (matching employee-detail style)       */
/* ─────────────────────────────────────────────────────────── */

function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
  const sizeMap  = { sm: "size-7 text-[10px]", md: "size-8 text-xs", lg: "size-10 text-sm" }
  return (
    <div className={cn(sizeMap[size], "rounded-md bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 select-none")}>
      {initials}
    </div>
  )
}

function SectionCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-md border border-default bg-white p-5", className)}>
      <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">{title}</p>
      {children}
    </div>
  )
}

function InfoRow({
  icon: Icon, label, value, children,
}: {
  icon: React.ElementType; label: string; value?: string | null; children?: React.ReactNode
}) {
  const display = children ?? (value ?? "-")
  return (
    <div className="flex items-start gap-3 py-3 border-b border-default last:border-0">
      <div className="mt-0.5 size-8 rounded-md bg-subtle flex items-center justify-center shrink-0">
        <Icon className="size-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted font-medium mb-0.5">{label}</p>
        {children
          ? <div className="text-sm font-semibold text-foreground">{children}</div>
          : <p className="text-sm font-semibold text-foreground">{display as string}</p>
        }
      </div>
    </div>
  )
}

function InfoCell({
  icon: Icon, label, value, children,
}: {
  icon: React.ElementType; label: string; value?: string | null; children?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-default">
      <div className="mt-0.5 size-8 rounded-md bg-subtle flex items-center justify-center shrink-0">
        <Icon className="size-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted font-medium mb-0.5">{label}</p>
        {children
          ? <div className="text-sm font-semibold text-foreground">{children}</div>
          : <p className="text-sm font-semibold text-foreground">{value ?? "-"}</p>
        }
      </div>
    </div>
  )
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold h-[22px] leading-none", className)}>
      {children}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────── */
/*  Props                                                       */
/* ─────────────────────────────────────────────────────────── */

type TaskDetailViewProps = {
  task: TaskDetail
  canEdit: boolean
  canDelete: boolean
  canManageAttachments: boolean
  canViewAudit: boolean
  canSelfAssign: boolean
  currentUserName: string
  currentUserId: string
}

/* ─────────────────────────────────────────────────────────── */
/*  Main Component                                              */
/* ─────────────────────────────────────────────────────────── */

export function TaskDetailView({
  task, canEdit, canDelete, canManageAttachments, canViewAudit, canSelfAssign, currentUserName, currentUserId,
}: TaskDetailViewProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [copied, setCopied]                       = useState(false)
  const [uploadingFile, setUploadingFile]         = useState(false)
  const [editingCommentId, setEditingCommentId]   = useState<string | null>(null)
  const [editingBody, setEditingBody]             = useState("")
  const [commentBody, setCommentBody]             = useState("")
  const [activeTab, setActiveTab]                 = useState<"comments" | "audit">("comments")
  const [optimisticStatus, setOptimisticStatus]   = useState<string | null>(null)

  const effectiveStatus = optimisticStatus ?? task.status

  const typeCfg     = TYPE_CFG[task.type as keyof typeof TYPE_CFG]             ?? TYPE_CFG.task
  const statusCfg   = STATUS_CFG[effectiveStatus as keyof typeof STATUS_CFG]   ?? STATUS_CFG.todo
  const priorityCfg = PRIORITY_CFG[task.priority as keyof typeof PRIORITY_CFG] ?? PRIORITY_CFG.medium
  const visCfg      = VISIBILITY_CFG[task.visibility as keyof typeof VISIBILITY_CFG]

  const isOverdue = !!task.dueDate && new Date(task.dueDate) < new Date() && effectiveStatus !== "completed"

  const hoursProgress = task.estimatedHours && task.estimatedHours > 0
    ? Math.min(100, Math.round(((task.loggedHours ?? 0) / task.estimatedHours) * 100))
    : null

  const handleCopy = () => {
    navigator.clipboard.writeText(task.taskId)
    setCopied(true)
    toast.success("Task ID copied")
    setTimeout(() => setCopied(false), 2000)
  }

  /* ── Mutations ─────────────────────────────────────────── */

  const updateStatusMutation  = useUpdateTaskStatus(task.id, setOptimisticStatus)
  const claimMutation         = useClaimTask()
  const toggleActiveMutation  = useToggleTaskActive(task.id)
  const addCommentMutation    = useAddTaskComment(task.id, currentUserId, currentUserName, () => setCommentBody(""))
  const editCommentMutation   = useEditTaskComment(task.id, () => setEditingCommentId(null))
  const deleteCommentMutation = useDeleteTaskComment(task.id)

  const { data: comments     = [], isLoading: isLoadingComments } = useTaskComments(task.id)
  const { data: auditEntries = [], isLoading: isLoadingAudit    } = useTaskAudit(task.id, canViewAudit)

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = commentBody.trim()
    if (!trimmed) return
    addCommentMutation.mutate(trimmed)
  }

  /* ── Attachments ──────────────────────────────────────── */

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const file = files[0]
    if (file.size > 25 * 1024 * 1024) { toast.error("File exceeds 25 MB limit"); return }
    setUploadingFile(true)
    try {
      const res = await fetch(`/api/admin/employees/tasks/${task.id}/attachments/upload-url`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, mimeType: file.type || "application/octet-stream", fileSize: file.size }),
      })
      if (!res.ok) throw new Error("Failed to get upload URL")
      const { data: presign } = await res.json()
      const s3Res = await fetch(presign.presignedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type || "application/octet-stream" } })
      if (!s3Res.ok) throw new Error("Upload failed")
      const confirmRes = await fetch(`/api/admin/employees/tasks/${task.id}/attachments/confirm`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ s3Key: presign.s3Key, fileName: file.name, mimeType: file.type || "application/octet-stream", fileSizeBytes: file.size }),
      })
      if (!confirmRes.ok) throw new Error("Failed to confirm attachment")
      toast.success("File uploaded")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Upload failed")
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleAttachmentDelete = async (attachmentId: string) => {
    if (!confirm("Delete this attachment?")) return
    try {
      const res  = await fetch(`/api/admin/employees/tasks/${task.id}/attachments/${attachmentId}`, { method: "DELETE", credentials: "include" })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed")
      toast.success("Attachment deleted")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Delete failed")
    }
  }

  /* ── Audit columns ────────────────────────────────────── */

  const auditColumns = useMemo<ColumnDef<AuditEntry>[]>(() => [
    {
      accessorKey: "changedAt",
      header: "Time",
      cell: ({ row }) => (
        <span className="font-mono text-[11px] text-muted">{fmtDateTime(row.original.changedAt)}</span>
      ),
    },
    {
      accessorKey: "changedBy",
      header: "User",
      cell: ({ row }) => (
        <span className="text-sm font-semibold text-foreground">{row.original.changedBy?.fullName ?? "System"}</span>
      ),
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <span className="inline-block px-2 py-0.5 rounded-md bg-subtle text-muted font-mono text-[10px] font-bold uppercase border border-default">
          {row.original.action}
        </span>
      ),
    },
    {
      accessorKey: "fieldName",
      header: "Field",
      cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.fieldName}</span>,
    },
    {
      accessorKey: "oldValue",
      header: "Old",
      cell: ({ row }) => (
        <span className="max-w-[160px] truncate block text-xs text-muted line-through" title={row.original.oldValue ?? ""}>
          {row.original.oldValue ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "newValue",
      header: "New",
      cell: ({ row }) => (
        <span className="max-w-[160px] truncate block text-xs font-semibold text-foreground" title={row.original.newValue ?? ""}>
          {row.original.newValue ?? "—"}
        </span>
      ),
    },
  ], [])

  /* ─────────────────────────────────────────────────────── */
  /*  Render                                                  */
  /* ─────────────────────────────────────────────────────── */

  return (
    <div className="w-full">

      {/* Back link & parent task link */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-6 text-sm text-secondary font-medium">
        <Link
          href="/admin/tasks/list"
          className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Tasks
        </Link>
        {task.parentTask && (
          <>
            <span className="text-slate-300 select-none">/</span>
            <span className="text-muted-foreground">Sub-task of</span>
            <Link
              href={`/admin/tasks/${task.parentTask.id}`}
              className="inline-flex items-center gap-1.5 text-foreground hover:text-primary transition-colors font-semibold underline decoration-dotted underline-offset-4"
            >
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-subtle border border-default text-muted">
                {task.parentTask.taskId}
              </span>
              {task.parentTask.title}
            </Link>
          </>
        )}
      </div>

      {/* ── Disabled banner ───────────────────────────────── */}
      {!task.isActive && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
          <ShieldAlert className="size-4 shrink-0" />
          <span className="flex-1 font-medium">This task is disabled and not visible to assignees.</span>
          {canDelete && (
            <button
              onClick={() => toggleActiveMutation.mutate(true)}
              disabled={toggleActiveMutation.isPending}
              className="text-xs font-bold underline hover:no-underline"
            >
              {toggleActiveMutation.isPending ? "Re-enabling…" : "Re-enable"}
            </button>
          )}
        </div>
      )}

      {/* ── Page header ───────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap rounded-md border border-default bg-white p-5">
        <div className="flex items-start gap-5">

          {/* Type icon block */}
          <div className={cn("size-14 rounded-md border flex items-center justify-center shrink-0", typeCfg.cls)}>
            <typeCfg.Icon className="size-6" />
          </div>

          <div>
            {/* Title + status */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground leading-tight">
                {task.title}
              </h1>
              <Badge className={statusCfg.cls}>
                <statusCfg.Icon className="size-3" />
                {statusCfg.label}
              </Badge>
            </div>

            {/* Subtitle row */}
            <p className="text-sm text-secondary mt-1">
              {task.project?.name ?? "No project"} {task.sprint ? `· ${task.sprint.name}` : ""}
            </p>

            {/* Meta chips */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold bg-subtle border border-default text-muted px-2.5 rounded-md hover:bg-white hover:text-foreground transition-colors cursor-pointer h-[22px] leading-none"
                title="Click to copy"
              >
                {copied ? <Check className="size-3 text-green-600" /> : <Copy className="size-3" />}
                {task.taskId}
              </button>
              <Badge className={typeCfg.cls}>
                <typeCfg.Icon className="size-3" />
                {typeCfg.label}
              </Badge>
              <Badge className={priorityCfg.cls}>
                <priorityCfg.Icon className="size-3" />
                {priorityCfg.label}
              </Badge>
              {visCfg && (
                <Badge className="bg-subtle text-secondary border-default">
                  <visCfg.Icon className="size-3" />
                  {visCfg.label}
                </Badge>
              )}
              {isOverdue && (
                <Badge className="bg-red-50 text-red-600 border-red-200">
                  <AlertTriangle className="size-3" />
                  Overdue
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {canSelfAssign && !task.assignedTo && task.isActive && (
            <button
              onClick={() => {
                if (confirm(`Claim "${task.taskId}"? A 48-hour confirmation window will begin.`))
                  claimMutation.mutate(task.id)
              }}
              disabled={claimMutation.isPending}
              className="inline-flex items-center gap-2 rounded-md border border-default bg-primary px-5 py-1.5 text-sm font-bold text-background hover:bg-subtle transition-colors"
            >
              <HandshakeIcon className="size-4" />
              Claim Task
            </button>
          )}
          {task.isActive && canDelete && (
            <button
              onClick={() => { if (confirm("Disable this task?")) toggleActiveMutation.mutate(false) }}
              disabled={toggleActiveMutation.isPending}
              className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-4 py-1.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
            >
              Disable
            </button>
          )}
          {canEdit && (
            <Link href={`/admin/tasks/${task.id}?edit=1`}>
              <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-1.5 text-sm font-bold text-white hover:opacity-90 transition-opacity shadow-sm">
                <Pencil className="size-4" />
                Edit Task
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Status stepper ────────────────────────────────── */}
      <div className="mb-6 rounded-md border border-default bg-white px-6 py-5">
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs font-bold text-muted uppercase tracking-wider">Status Timeline</p>
          <span className="text-[11px] text-muted-foreground bg-subtle px-2.5 py-1 rounded-md border border-default flex items-center gap-2">
            Click node to change status
          </span>
        </div>
        <div className="flex items-center px-6">
          {(["todo", "doing", "completed"] as const).map((s, idx, arr) => {
            const cfg       = STATUS_CFG[s]
            const isActive  = effectiveStatus === s
            const isDone    = STATUS_CFG[effectiveStatus as keyof typeof STATUS_CFG]?.step > cfg.step
            const isPending = updateStatusMutation.isPending && optimisticStatus === s
            const isLast    = idx === arr.length - 1
            return (
              <div key={s} className={cn("flex items-center", !isLast ? "flex-1" : "flex-none")}>
                {/* Step node + label */}
                <button
                  onClick={() => { if (s !== effectiveStatus) updateStatusMutation.mutate(s) }}
                  disabled={updateStatusMutation.isPending}
                  className={cn(
                    "flex flex-col items-center gap-1.5 group flex-shrink-0 transition-opacity",
                    s === effectiveStatus ? "cursor-default" : "cursor-pointer",
                    updateStatusMutation.isPending ? "opacity-60 cursor-not-allowed" : ""
                  )}
                >
                  {/* Circle */}
                  <div
                    className={cn(
                      "size-10 rounded-full flex items-center justify-center border-2 transition-all duration-200",
                      isActive
                        ? "border-transparent shadow-md scale-110"
                        : isDone
                        ? "border-transparent group-hover:scale-105 group-hover:shadow-sm"
                        : "border-slate-200 bg-white group-hover:border-primary/40 group-hover:scale-105 group-hover:shadow-sm",
                    )}
                    style={
                      isActive
                        ? { backgroundColor: cfg.color, color: "#fff" }
                        : isDone
                        ? { backgroundColor: "#16a34a", color: "#fff" }
                        : {}
                    }
                  >
                    {isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : isDone && !isActive ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <cfg.Icon
                        className={cn("size-4", isActive ? "" : "text-slate-400 group-hover:text-slate-500")}
                      />
                    )}
                  </div>
                  {/* Label */}
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "text-[11px] font-bold tracking-wide transition-colors",
                        isActive ? "text-foreground" : isDone ? "text-green-600" : "text-slate-400",
                      )}
                    >
                      {cfg.label}
                    </span>
                    {isActive && (
                      <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 mt-0.5">
                        Current
                      </span>
                    )}
                    {isDone && !isActive && (
                      <span className="text-[9px] font-semibold uppercase tracking-widest text-green-500/70 mt-0.5">
                        Done
                      </span>
                    )}
                  </div>
                </button>

                {/* Connecting bar (skip after last) */}
                {!isLast && (
                  <div className="flex-1 mx-3 h-[3px] rounded-full bg-slate-100 relative overflow-hidden -mt-5">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                      style={{
                        width: isDone || isActive ? "100%" : "0%",
                        backgroundColor: isDone ? "#16a34a" : cfg.color,
                        opacity: isDone ? 1 : 0.5,
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Main grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Left 2/3 */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Description */}
          {task.description && (
            <SectionCard title="Description">
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {task.description}
              </p>
            </SectionCard>
          )}

          {/* Internal note */}
          {task.note && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50/50 p-5">
              <p className="text-xs font-bold text-yellow-700 uppercase tracking-wider mb-2">Internal Note</p>
              <p className="text-sm leading-relaxed text-yellow-900 whitespace-pre-wrap">{task.note}</p>
            </div>
          )}

          {/* Task meta grid */}
          <SectionCard title="Task Details">
            <div className="grid grid-cols-1 sm:grid-cols-2">
              <InfoCell icon={CalendarDays} label="Due Date">
                {task.dueDate
                  ? <span className={cn("font-semibold", isOverdue ? "text-red-600" : "text-foreground")}>
                      {fmtDate(task.dueDate)}
                      {isOverdue && <AlertTriangle className="inline size-3 ml-1 text-red-500" />}
                    </span>
                  : <span className="text-muted">Not set</span>
                }
              </InfoCell>
              <InfoCell icon={FolderOpen} label="Project">
                {task.project
                  ? <Link href={`/admin/tasks/list?projectId=${task.project.id}`} className="font-semibold text-primary hover:underline">{task.project.name}</Link>
                  : <span className="text-muted">—</span>
                }
              </InfoCell>
              <InfoCell icon={Building2} label="Department">
                {task.department
                  ? <span className="font-semibold text-foreground">{task.department.name}</span>
                  : <span className="text-muted">—</span>
                }
              </InfoCell>
              <InfoCell icon={Zap} label="Sprint">
                {task.sprint
                  ? <span className="font-semibold text-foreground">{task.sprint.name}</span>
                  : <span className="text-muted">—</span>
                }
              </InfoCell>
              <InfoCell icon={GitBranch} label="Parent Task">
                {task.parentTask
                  ? <Link href={`/admin/tasks/${task.parentTask.id}`} className="font-mono text-xs font-bold text-primary hover:underline">{task.parentTask.taskId}</Link>
                  : <span className="text-muted">—</span>
                }
              </InfoCell>
              <InfoCell icon={Calendar} label="Created">
                <span className="font-semibold text-foreground">{fmtDateTime(task.createdAt) ?? "—"}</span>
              </InfoCell>
              <InfoCell icon={Clock} label="Last Updated">
                <span className="font-semibold text-foreground">{fmtDateTime(task.updatedAt) ?? "—"}</span>
              </InfoCell>
              {task.completedAt && (
                <InfoCell icon={CheckCircle2} label="Completed At">
                  <span className="font-semibold text-green-700">{fmtDateTime(task.completedAt)}</span>
                </InfoCell>
              )}
              {task.estimatedHours != null && (
                <InfoCell icon={Clock} label="Estimated Hours">
                  <span className="font-semibold text-foreground">{task.estimatedHours}h</span>
                </InfoCell>
              )}
              {/* {task.loggedHours != null && (
                <InfoCell icon={Clock} label="Logged Hours">
                  <span className="font-semibold text-foreground">{task.loggedHours}h</span>
                </InfoCell>
              )} */}
            </div>

            {/* Time tracking bar */}
            {hoursProgress !== null && (
              <div className="mt-3 pt-3 border-t border-default">
                <div className="flex items-center justify-between text-xs text-muted mb-1.5">
                  <span className="font-semibold">Time Progress</span>
                  <span>{task.loggedHours ?? 0}h / {task.estimatedHours}h ({hoursProgress}%)</span>
                </div>
                <div className="h-1.5 rounded-full bg-subtle overflow-hidden border border-default">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${hoursProgress}%`,
                      background: hoursProgress > 100 ? "#dc2626" : hoursProgress > 75 ? "#f59e0b" : "var(--primary)",
                    }}
                  />
                </div>
              </div>
            )}
          </SectionCard>

          {/* Sub-tasks */}
          <div className="rounded-md border border-default bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-default">
              <p className="text-xs font-bold text-muted uppercase tracking-wider">
                Sub-tasks
                {(task.subtasks?.length ?? 0) > 0 && (
                  <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-subtle border border-default text-muted">
                    {task.subtasks!.length}
                  </span>
                )}
              </p>
              <Link href={`/admin/tasks/new?parentTaskId=${task.id}`}>
                <button className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:text-primary px-3 py-1.5 rounded-md hover:bg-subtle transition-colors border border-default bg-white">
                  <Plus className="size-3.5" />
                  Add Sub-task
                </button>
              </Link>
            </div>
            {!task.subtasks?.length ? (
              <div className="flex flex-col items-center justify-center py-10 gap-1.5">
                <LayoutList className="size-7 text-muted opacity-30" />
                <p className="text-sm text-muted">No sub-tasks yet</p>
              </div>
            ) : (
              <div className="divide-y divide-default">
                {task.subtasks.map((s) => {
                  const sst = STATUS_CFG[s.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.todo
                  return (
                    <Link
                      key={s.id}
                      href={`/admin/tasks/${s.id}`}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-subtle transition-colors group"
                    >
                      <sst.Icon className="size-4 shrink-0" style={{ color: sst.color }} />
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-md font-bold bg-subtle border border-default text-muted shrink-0">
                        {s.taskId}
                      </span>
                      <span className="text-sm flex-1 truncate text-foreground group-hover:text-primary font-medium transition-colors">
                        {s.title}
                      </span>
                      <Badge className={sst.cls}>{sst.label}</Badge>
                      {s.assignedTo
                        ? <Avatar name={s.assignedTo.fullName} size="sm" />
                        : <div className="size-7 rounded-md border-2 border-dashed border-default flex items-center justify-center shrink-0">
                            <span className="text-[9px] text-muted">—</span>
                          </div>
                      }
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Attachments */}
          <div className="rounded-md border border-default bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-default">
              <p className="text-xs font-bold text-muted uppercase tracking-wider">
                Attachments
                {(task.attachments?.length ?? 0) > 0 && (
                  <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-subtle border border-default text-muted">
                    {task.attachments!.length}
                  </span>
                )}
              </p>
              {canManageAttachments && (
                <>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} disabled={uploadingFile} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:text-primary px-3 py-1.5 rounded-md hover:bg-subtle transition-colors border border-default bg-white disabled:opacity-40"
                  >
                    {uploadingFile
                      ? <><Loader2 className="size-3.5 animate-spin" />Uploading…</>
                      : <><Plus className="size-3.5" />Upload File</>
                    }
                  </button>
                </>
              )}
            </div>
            {!task.attachments?.length ? (
              <div className="flex flex-col items-center justify-center py-10 gap-1.5">
                <Paperclip className="size-7 text-muted opacity-30" />
                <p className="text-sm text-muted">No attachments yet</p>
              </div>
            ) : (
              <div className="divide-y divide-default p-3 space-y-2">
                {task.attachments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-md border border-default bg-elevated/40 hover:bg-elevated transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-10 rounded-md bg-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="size-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        {a.presignedUrl ? (
                          <a
                            href={a.presignedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-bold text-foreground hover:text-primary hover:underline truncate block"
                          >
                            {a.fileName}
                          </a>
                        ) : (
                          <p className="text-sm font-bold text-foreground truncate">{a.fileName}</p>
                        )}
                        <p className="text-xs text-muted truncate">
                          {[fmtBytes(a.fileSizeBytes), a.uploadedBy?.fullName, fmtRelTime(a.uploadedAt)].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {a.presignedUrl && (
                        <a
                          href={a.presignedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline px-3 py-2 rounded-md bg-white border border-default hover:bg-subtle transition-colors"
                        >
                          <Eye className="size-3.5" />
                          View
                        </a>
                      )}
                      {a.downloadUrl && (
                        <a
                          href={a.downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline px-3 py-2 rounded-md bg-white border border-default hover:bg-subtle transition-colors"
                        >
                          <Download className="size-3.5" />
                          Download
                        </a>
                      )}
                      {canManageAttachments && (
                        <button
                          onClick={() => handleAttachmentDelete(a.id)}
                          className="size-8 rounded-md flex items-center justify-center text-muted hover:text-red-600 hover:bg-red-50 border border-default transition-colors"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity: Comments + Audit */}
          <div className="rounded-md border border-default bg-white overflow-hidden">
            {/* Tabs */}
            <div className="flex items-center border-b border-default px-1">
              {(["comments", "audit"] as const)
                .filter((t) => t === "comments" || canViewAudit)
                .map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-4 text-xs font-bold border-b-2 transition-colors cursor-pointer",
                      activeTab === tab
                        ? "border-primary text-primary"
                        : "border-transparent text-muted hover:text-secondary"
                    )}
                  >
                    {tab === "comments" ? (
                      <>
                        <MessageSquare className="size-3.5" />
                        Comments
                        {comments.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-subtle border border-default text-muted">
                            {comments.length}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <History className="size-3.5" />
                        Audit Trail
                        {auditEntries.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-subtle border border-default text-muted">
                            {auditEntries.length}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                ))}
            </div>

            <div className="p-5">
              {/* Comments */}
              {activeTab === "comments" && (
                <div className="flex flex-col gap-5">
                  {isLoadingComments ? (
                    <div className="space-y-5">
                      {[1, 2].map((i) => (
                        <div key={i} className="flex gap-3 animate-pulse">
                          <div className="size-8 rounded-md bg-subtle shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 w-28 rounded bg-subtle" />
                            <div className="h-14 rounded-md bg-subtle" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="flex flex-col items-center gap-1.5 py-8 text-center">
                      <MessageSquare className="size-7 text-muted opacity-30" />
                      <p className="text-sm text-muted">No comments yet</p>
                      {/* <p className="text-xs text-muted opacity-60">Be the first to leave a comment</p> */}
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                      {comments.map((c) => (
                        <div key={c.id} className="flex gap-3 group">
                          <Avatar name={c.authorName ?? "?"} size="md" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="text-sm font-bold text-foreground">{c.authorName ?? "Unknown"}</span>
                              <span className="text-[11px] text-muted">{fmtRelTime(c.createdAt)}</span>
                              {!editingCommentId && c.authorId === currentUserId && (
                                <div className="flex items-center gap-2 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => { setEditingCommentId(c.id); setEditingBody(c.body) }}
                                    className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-primary font-semibold transition-colors"
                                  >
                                    <Edit2 className="size-3" />
                                    Edit
                                  </button>
                                  <span className="text-muted opacity-40">·</span>
                                  <button
                                    onClick={() => { if (confirm("Delete this comment?")) deleteCommentMutation.mutate(c.id) }}
                                    className="inline-flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 font-semibold transition-colors"
                                  >
                                    <Trash2 className="size-3" />
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                            {editingCommentId === c.id ? (
                              <div className="space-y-2.5">
                                <textarea
                                  value={editingBody}
                                  onChange={(e) => setEditingBody(e.target.value)}
                                  rows={3}
                                  autoFocus
                                  className="w-full rounded-md border border-default bg-white px-4 py-3 text-sm resize-none outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setEditingCommentId(null)}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-md border border-default bg-white text-secondary hover:bg-subtle transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    disabled={!editingBody.trim() || editCommentMutation.isPending}
                                    onClick={() => editCommentMutation.mutate({ commentId: c.id, body: editingBody })}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-md bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-40"
                                  >
                                    {editCommentMutation.isPending ? "Saving…" : "Save"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm leading-relaxed text-foreground bg-subtle rounded-md rounded-tl-none px-4 py-3 border border-default whitespace-pre-wrap">
                                {c.body}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Composer */}
                  <form onSubmit={handleAddComment} className="flex gap-3 pt-4 border-t border-default">
                    <Avatar name={currentUserName} size="md" />
                    <div className="flex-1 min-w-0 rounded-md border border-default bg-white overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                      <textarea
                        value={commentBody}
                        onChange={(e) => setCommentBody(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleAddComment(e)
                          }
                        }}
                        placeholder="Add a comment… (Enter to send, Shift+Enter for new line)"
                        rows={3}
                        className="w-full px-4 pt-3 pb-1 text-sm resize-none outline-none bg-transparent placeholder:text-muted"
                      />
                      <div className="flex items-center justify-end px-3 pb-2.5 gap-2">
                        <span className="text-[11px] text-muted">Shift+Enter for new line</span>
                        <button
                          type="submit"
                          disabled={!commentBody.trim() || addCommentMutation.isPending}
                          className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 rounded-md bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-40"
                        >
                          {addCommentMutation.isPending
                            ? <Loader2 className="size-3.5 animate-spin" />
                            : <Send className="size-3.5" />
                          }
                          Send
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Audit */}
              {canViewAudit && activeTab === "audit" && (
                <DataTable
                  columns={auditColumns}
                  data={auditEntries}
                  loading={isLoadingAudit}
                  pageSize={25}
                  emptyMessage="No audit history found."
                />
              )}
            </div>
          </div>
        </div>

        {/* Right 1/3 sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-6 lg:sticky lg:top-20">

          {/* People */}
          <SectionCard title="People">
            <InfoRow icon={User} label="Assignee">
              {task.assignedTo
                ? <div className="flex items-center gap-2"><Avatar name={task.assignedTo.fullName} size="sm" /><span className="font-semibold text-foreground">{task.assignedTo.fullName}</span></div>
                : <span className="text-muted text-sm">Unassigned</span>
              }
            </InfoRow>
            <InfoRow icon={User} label="Assigned By">
              {task.assignedBy
                ? <div className="flex items-center gap-2"><Avatar name={task.assignedBy.fullName} size="sm" /><span className="font-semibold text-foreground">{task.assignedBy.fullName}</span></div>
                : <span className="text-muted text-sm">—</span>
              }
            </InfoRow>
            {/* <InfoRow icon={User} label="Reviewer">
              {task.reviewer
                ? <div className="flex items-center gap-2"><Avatar name={task.reviewer.fullName} size="sm" /><span className="font-semibold text-foreground">{task.reviewer.fullName}</span></div>
                : <span className="text-muted text-sm">—</span>
              }
            </InfoRow> */}
            <InfoRow icon={User} label="Created By">
              {task.createdBy
                ? <div className="flex items-center gap-2"><Avatar name={task.createdBy.fullName} size="sm" /><span className="font-semibold text-foreground">{task.createdBy.fullName}</span></div>
                : <span className="text-muted text-sm">—</span>
              }
            </InfoRow>
          </SectionCard>

          {/* Quick stats */}
          <SectionCard title="Overview">
            <div className="grid grid-cols-3 gap-3 pt-1">
              {[
                { label: "Sub-tasks", value: task.subtaskCount,    Icon: LayoutList    },
                { label: "Comments",  value: task.commentCount,    Icon: MessageSquare },
                { label: "Files",     value: task.attachmentCount, Icon: Paperclip     },
              ].map(({ label, value, Icon }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 rounded-md border border-default bg-subtle p-3">
                  <Icon className="size-4 text-primary opacity-60" />
                  <span className="text-lg font-bold text-foreground leading-none">{value}</span>
                  <span className="text-[10px] text-muted font-semibold text-center leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Parent task */}
          {task.parentTask && (
            <SectionCard title="Parent Task">
              <Link href={`/admin/tasks/${task.parentTask.id}`} className="flex items-center gap-3 p-3 rounded-md border border-default bg-subtle hover:bg-white transition-colors group">
                <GitBranch className="size-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-mono text-[10px] text-muted mb-0.5">{task.parentTask.taskId}</p>
                  <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">{task.parentTask.title}</p>
                </div>
              </Link>
            </SectionCard>
          )}

        </div>
      </div>
    </div>
  )
}