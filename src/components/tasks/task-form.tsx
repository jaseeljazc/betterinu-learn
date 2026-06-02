"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Loader2,
  CheckSquare,
  Bug,
  Zap,
  ShieldAlert,
  AlertTriangle,
  ArrowDown,
  Minus,
  ArrowUp,
  Paperclip,
  X,
  Search,
  CheckCircle2,
  Clock,
  Folder,
  Users,
  Calendar,
  FileText,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError as ShadcnFieldError,
} from "@/components/ui/field"
import { DatePickerField } from "@/components/admin/employees/employee-form/date-picker-field"
import { useAdminPermissions } from "@/lib/hooks/useAdminPermissions"

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Style tokens (match rest of admin forms)                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
const labelCls = "block text-sm font-semibold text-foreground mb-1.5"
const errorCls = "mt-1 text-xs text-destructive"
const sectionCls = "rounded-md border border-default bg-white p-6 space-y-5"

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Constants                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
const TASK_TYPES = [
  { value: "task",    label: "Task",    icon: CheckSquare },
  { value: "bug",     label: "Bug",     icon: Bug         },
  { value: "feature", label: "Feature", icon: Zap         },
] as const

const PRIORITY_OPTIONS = [
  {
    value: "low",
    label: "Low",
    icon: ArrowDown,
    color: "var(--success-500)",
    bg: "var(--success-50)",
  },
  {
    value: "medium",
    label: "Medium",
    icon: Minus,
    color: "var(--info-500)",
    bg: "var(--info-50)",
  },
  {
    value: "high",
    label: "High",
    icon: ArrowUp,
    color: "var(--terra-500)",
    bg: "var(--terra-50)",
  },
  {
    value: "critical",
    label: "Critical",
    icon: ShieldAlert,
    color: "var(--danger-500)",
    bg: "var(--danger-50)",
  },
] as const

const STATUS_OPTIONS = [
  { value: "todo",      label: "Todo",      icon: Clock,        color: "var(--text-muted)" },
  { value: "doing",     label: "Doing",     icon: AlertTriangle, color: "var(--amber-500)" },
  { value: "completed", label: "Completed", icon: CheckCircle2, color: "var(--success-500)" },
] as const

const VISIBILITY_OPTIONS = [
  { value: "public",       label: "Public",       description: "Visible to all employees in the same department" },
  { value: "private",      label: "Private",       description: "Only assignee, creator, reviewer" },
  { value: "confidential", label: "Confidential", description: "Managers and above only" },
] as const

const MAX_FILE_BYTES = 25 * 1024 * 1024 // 25 MB
const ACCEPTED_MIME = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
]

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Data-fetch helpers                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */
type SelectOption = { id: string; name: string }
type EmployeeOption = { id: string; fullName: string; departmentId?: string | null }
type TaskOption = { id: string; taskId: string; title: string }
type SprintOption = { id: string; name: string }
type ProjectOption = { id: string; name: string; departmentId: string | null }

async function fetchDepartments(): Promise<SelectOption[]> {
  const res = await fetch("/api/admin/employees/tasks/departments", { credentials: "include" })
  if (!res.ok) throw new Error("Failed to load departments")
  const json = await res.json()
  return json.data ?? []
}

async function fetchProjects(): Promise<ProjectOption[]> {
  const res = await fetch("/api/admin/employees/tasks/projects", { credentials: "include" })
  if (!res.ok) throw new Error("Failed to load projects")
  const data = await res.json()
  return (data.data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    departmentId: p.departmentId ?? null,
  }))
}

async function fetchSprints(projectId: string): Promise<SprintOption[]> {
  if (!projectId) return []
  const res = await fetch(
    `/api/admin/employees/tasks/projects/${projectId}/sprints`,
    { credentials: "include" }
  )
  if (!res.ok) throw new Error("Failed to load sprints")
  const data = await res.json()
  return (data.data ?? []).map((s: any) => ({ id: s.id, name: s.name }))
}

async function fetchEmployees(): Promise<EmployeeOption[]> {
  const res = await fetch("/api/admin/employees/tasks/assignees", { credentials: "include" })
  if (!res.ok) throw new Error("Failed to load employees")
  const json = await res.json()
  return (json.data ?? []).map((e: any) => ({
    id: e.id,
    fullName: e.fullName,
    departmentId: e.departmentId ?? null,
  }))
}

async function searchTasks(q: string): Promise<TaskOption[]> {
  if (!q || q.length < 2) return []
  const res = await fetch(
    `/api/admin/employees/tasks/search?q=${encodeURIComponent(q)}&limit=20`,
    { credentials: "include" }
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.data ?? []).map((t: any) => ({
    id: t.id,
    taskId: t.taskId,
    title: t.title,
  }))
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Attachment state                                                            */
/* ─────────────────────────────────────────────────────────────────────────── */
type AttachFile = {
  id: string
  file: File
  status: "pending" | "uploading" | "done" | "error"
  error?: string
  s3Key?: string
  attachmentId?: string
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Shared UI primitives                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */
function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2.5 pb-2 border-b border-default">
      <Icon className="size-4 text-primary" />
      <h3 className="font-bold text-base text-foreground">{title}</h3>
    </div>
  )
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <ShadcnFieldError>
      {msg}
    </ShadcnFieldError>
  )
}

function OptionalTag() {
  return (
    <span className="text-xs font-normal text-muted-foreground ml-1">
      (optional)
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  FocusInput — shadcn Input with custom focus style                          */
/* ─────────────────────────────────────────────────────────────────────────── */
function FocusInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return (
    <Input
      className={cn(
        "h-10 border-default bg-white text-foreground focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

function FocusTextarea({ className, ...props }: React.ComponentProps<typeof Textarea>) {
  return (
    <Textarea
      className={cn(
        "border-default bg-white text-foreground focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary resize-none min-h-[80px] disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  SearchableTaskSelect — async combobox for parent_task_id                   */
/* ─────────────────────────────────────────────────────────────────────────── */
type SearchableTaskSelectProps = {
  value: TaskOption | null
  onChange: (t: TaskOption | null) => void
  excludeId?: string
}

function SearchableTaskSelect({ value, onChange, excludeId }: SearchableTaskSelectProps) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<TaskOption[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(async () => {
      if (!query || query.length < 2) { setResults([]); return }
      setLoading(true)
      try {
        const data = await searchTasks(query)
        setResults(data.filter((t) => t.id !== excludeId))
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, open, excludeId])

  return (
    <div className="relative">
      <div
        className={cn(
          "flex h-10 items-center rounded-md border border-default bg-white px-3 gap-2 cursor-text transition-colors",
          focused && "ring-2 ring-primary/20 border-primary"
        )}
        onClick={() => { setOpen(true); inputRef.current?.focus() }}
      >
        <Search className="size-3.5 shrink-0 text-muted-foreground" />
        {value && !open ? (
          <span className="flex-1 truncate text-sm text-foreground">
            {value.taskId}: {value.title}
          </span>
        ) : (
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
            placeholder={value ? `${value.taskId}: ${value.title}` : "Search tasks…"}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => { setFocused(true); setOpen(true) }}
            onBlur={() => { setFocused(false); setTimeout(() => setOpen(false), 150) }}
          />
        )}
        {value && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(null); setQuery("") }}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-default bg-white shadow-md py-1 max-h-60 overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Searching…
            </div>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {query.length < 2 ? "Type at least 2 characters" : "No tasks found"}
            </p>
          ) : (
            results.map((t) => (
              <button
                key={t.id}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-subtle transition-colors cursor-pointer"
                onMouseDown={() => {
                  onChange(t)
                  setQuery("")
                  setOpen(false)
                }}
              >
                <span className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold bg-subtle text-muted-foreground">
                  {t.taskId}
                </span>
                <span className="truncate">{t.title}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  AttachmentUploader                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */
type AttachmentUploaderProps = {
  taskId: string | null // null = deferred (new task, uploads happen after create)
  files: AttachFile[]
  onChange: (files: AttachFile[]) => void
}

function AttachmentUploader({ taskId, files, onChange }: AttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function addFiles(incoming: FileList | null) {
    if (!incoming) return
    const newEntries: AttachFile[] = Array.from(incoming).map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      status: "pending" as const,
    }))
    onChange([...files, ...newEntries])
  }

  function remove(id: string) {
    onChange(files.filter((f) => f.id !== id))
  }

  function formatBytes(b: number) {
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / (1024 * 1024)).toFixed(1)} MB`
  }

  const hasError = files.some((f) => f.file.size > MAX_FILE_BYTES)

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-dashed border-default bg-subtle px-4 py-5 text-sm text-secondary hover:border-primary hover:text-primary transition-colors cursor-pointer"
      >
        <Paperclip className="size-4 shrink-0" />
        Click to attach files
        <span className="text-xs text-muted-foreground">— max 25 MB each</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        accept={ACCEPTED_MIME.join(",")}
        onChange={(e) => addFiles(e.target.files)}
      />

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((af) => {
            const tooBig = af.file.size > MAX_FILE_BYTES
            return (
              <li
                key={af.id}
                className={cn(
                  "flex items-center gap-3 rounded-md border border-default bg-white px-3 py-2",
                  (tooBig || af.status === "error") && "border-destructive/30 bg-destructive/5"
                )}
              >
                <Paperclip
                  className="size-4 shrink-0 text-muted-foreground"
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {af.file.name}
                  </p>
                  <p className={cn("text-xs", tooBig ? "text-destructive" : "text-muted-foreground")}>
                    {tooBig ? "Exceeds 5 MB limit" : af.status === "error" ? af.error : formatBytes(af.file.size)}
                  </p>
                </div>
                {af.status === "uploading" ? (
                  <Loader2 className="size-4 animate-spin shrink-0 text-primary" />
                ) : af.status === "done" ? (
                  <CheckCircle2 className="size-4 shrink-0 text-success-600" />
                ) : (
                  <button
                    type="button"
                    onClick={() => remove(af.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {hasError && (
        <p className="text-xs text-destructive">
          Remove files that exceed the 25 MB limit before submitting.
        </p>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */
export type TaskFormTask = {
  id: string
  title: string
  description?: string | null
  note?: string | null
  type: string
  priority: string
  status: string
  visibility: string
  departmentId?: string | null
  projectId?: string | null
  sprintId?: string | null
  parentTaskId?: string | null
  parentTask?: TaskOption | null
  assignedTo?: string | null
  assignedBy?: string | null
  reviewerId?: string | null
  dueDate?: string | null
  estimatedHours?: number | null
  existingAttachments?: { id: string; fileName: string; fileSizeBytes?: number | null }[]
}

type TaskFormProps = {
  task?: TaskFormTask
  /** current logged-in admin account id (passed from server page) */
  currentUserId: string
  /** current logged-in admin full name */
  currentUserName: string
  /** id to exclude from parent task search (prevents circular) */
  parentExcludeId?: string
  /** optional parent task info to prefill when creating subtasks */
  initialParentTask?: TaskOption | null
  /** default department ID for new task creation */
  defaultDepartmentId?: string | null
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Main Component                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */
export function TaskForm({
  task,
  currentUserId,
  currentUserName,
  parentExcludeId,
  initialParentTask,
  defaultDepartmentId,
}: TaskFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isEdit = !!task
  const { can, isSuperAdmin, role } = useAdminPermissions()

  /* Permission flags */
  const canEditAny  = can("tasks_mgmt", "edit_any")
  const isManager   = isSuperAdmin || role === "task_manager" || canEditAny
  const canSetVis   = isManager || can("tasks_mgmt", "manage_projects")

  /* ── Form state ─────────────────────────────────────────────────────────── */
  const [title,          setTitle]         = useState(task?.title ?? "")
  const [type,           setType]          = useState(task?.type ?? "task")
  const [priority,       setPriority]      = useState(task?.priority ?? "medium")
  const [status,         setStatus]        = useState(task?.status ?? "todo")
  const [visibility,     setVisibility]    = useState(task?.visibility ?? "public")
  const [departmentId,   setDepartmentId]  = useState(task?.departmentId ?? defaultDepartmentId ?? "")
  const [projectId,      setProjectId]     = useState(task?.projectId ?? "")
  const [sprintId,       setSprintId]      = useState(task?.sprintId ?? "")
  const [parentTask,     setParentTask]    = useState<TaskOption | null>(
    task?.parentTask ?? (task?.parentTaskId ? { id: task.parentTaskId, taskId: "", title: "…" } : initialParentTask ?? null)
  )
  const [assignedTo,     setAssignedTo]    = useState(
    task?.assignedTo ?? ""
  )
  const [assignedBy,     setAssignedBy]    = useState(
    task?.assignedBy ?? currentUserId
  )
  const [reviewerId,     setReviewerId]    = useState(task?.reviewerId ?? "")
  const [dueDate,        setDueDate]       = useState(
    task?.dueDate ? task.dueDate.split("T")[0] : ""
  )
  const [estimatedHours, setEstimatedHours] = useState(
    task?.estimatedHours != null ? String(task.estimatedHours) : ""
  )
  const [description,   setDescription]   = useState(task?.description ?? "")
  const [note,          setNote]           = useState(task?.note ?? "")
  const [attachFiles,   setAttachFiles]    = useState<AttachFile[]>([])

  /* ── Validation errors ──────────────────────────────────────────────────── */
  const [errors, setErrors] = useState<Record<string, string>>({})

  /* ── Data queries ───────────────────────────────────────────────────────── */
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: fetchDepartments,
  })

  const { data: projects = [] } = useQuery({
    queryKey: ["task-projects"],
    queryFn: fetchProjects,
  })

  const { data: sprints = [] } = useQuery({
    queryKey: ["task-sprints", projectId],
    queryFn: () => fetchSprints(projectId),
    enabled: !!projectId,
  })

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-list"],
    queryFn: fetchEmployees,
  })

  /* Derived filtered lists */
  const filteredProjects = departmentId
    ? projects.filter((p) => !p.departmentId || p.departmentId === departmentId)
    : projects

  const filteredEmployees = departmentId
    ? employees.filter((e) => !e.departmentId || e.departmentId === departmentId)
    : employees

  /* When departmentId changes, reset project/sprint/assignee if no longer valid */
  useEffect(() => {
    if (projects.length === 0) return
    if (departmentId && projectId) {
      const valid = filteredProjects.some((p) => p.id === projectId)
      if (!valid) {
        setProjectId("")
        setSprintId("")
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentId, projects])

  /* When projectId changes, reset sprint */
  const initialMountProjectRef = useRef(true)
  useEffect(() => {
    if (initialMountProjectRef.current) {
      initialMountProjectRef.current = false
      return
    }
    setSprintId("")
  }, [projectId])

  /* ── Upload helper — runs after the task ID is known ─────────────────────*/
  const uploadPendingAttachments = useCallback(
    async (taskId: string, files: AttachFile[]) => {
      const pending = files.filter((f) => f.status === "pending" && f.file.size <= MAX_FILE_BYTES)
      if (!pending.length) return

      setAttachFiles((prev) =>
        prev.map((af) =>
          pending.find((p) => p.id === af.id) ? { ...af, status: "uploading" } : af
        )
      )

      for (const af of pending) {
        try {
          /* Step 1 — get pre-signed URL */
          const presignRes = await fetch(
            `/api/admin/employees/tasks/${taskId}/attachments/upload-url`,
            {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileName: af.file.name,
                mimeType: af.file.type || "application/octet-stream",
                fileSize: af.file.size,
              }),
            }
          )
          if (!presignRes.ok) throw new Error("Failed to get upload URL")
          const { data: presign } = await presignRes.json()

          /* Step 2 — PUT directly to S3 */
          const putRes = await fetch(presign.presignedUrl, {
            method: "PUT",
            body: af.file,
            headers: { "Content-Type": af.file.type || "application/octet-stream" },
          })
          if (!putRes.ok) throw new Error("S3 upload failed")

          /* Step 3 — confirm in DB */
          const confirmRes = await fetch(
            `/api/admin/employees/tasks/${taskId}/attachments/confirm`,
            {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                s3Key: presign.s3Key,
                fileName: af.file.name,
                mimeType: af.file.type || "application/octet-stream",
                fileSizeBytes: af.file.size,
              }),
            }
          )
          if (!confirmRes.ok) throw new Error("Failed to confirm attachment")
          const { data: confirmed } = await confirmRes.json()

          setAttachFiles((prev) =>
            prev.map((f) =>
              f.id === af.id
                ? { ...f, status: "done", s3Key: presign.s3Key, attachmentId: confirmed.attachmentId }
                : f
            )
          )
        } catch (err: any) {
          setAttachFiles((prev) =>
            prev.map((f) =>
              f.id === af.id
                ? { ...f, status: "error", error: err.message ?? "Upload failed" }
                : f
            )
          )
          toast.error(`Failed to upload ${af.file.name}`)
        }
      }
    },
    []
  )

  /* ── Submit mutation ─────────────────────────────────────────────────────── */
  const mutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const url = isEdit
        ? `/api/admin/employees/tasks/${task!.id}`
        : "/api/admin/employees/tasks"
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? "Request failed")
      return json.data
    },
    onSuccess: async (data) => {
      const taskId: string = isEdit ? task!.id : data.id
      /* Upload any pending attachments */
      if (attachFiles.some((f) => f.status === "pending")) {
        await uploadPendingAttachments(taskId, attachFiles)
      }
      /* Invalidate relevant query caches */
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
      queryClient.invalidateQueries({ queryKey: ["task", taskId] })
      queryClient.invalidateQueries({ queryKey: ["task-dashboard"] })
      toast.success(isEdit ? "Task updated." : "Task created.")
      router.push(`/admin/tasks/${taskId}`)
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  /* ── Validation ─────────────────────────────────────────────────────────── */
  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!title.trim()) errs.title = "Title is required."
    if (!departmentId) errs.departmentId = "Department is required."
    if (estimatedHours && isNaN(Number(estimatedHours))) errs.estimatedHours = "Must be a number."
    if (estimatedHours && Number(estimatedHours) < 0) errs.estimatedHours = "Cannot be negative."
    if (attachFiles.some((f) => f.file.size > MAX_FILE_BYTES)) errs.attachments = "Remove files exceeding 25 MB."
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  /* ── Submit handler ─────────────────────────────────────────────────────── */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    if (attachFiles.some((f) => f.status === "uploading")) {
      toast.error("Please wait for uploads to finish.")
      return
    }

    const payload: Record<string, unknown> = {
      title: title.trim(),
      type,
      priority,
      status,
      visibility,
      description: description.trim() || null,
      note:        note.trim() || null,
      departmentId: departmentId || null,
      projectId:   projectId   || null,
      sprintId:    sprintId    || null,
      parentTaskId: parentTask?.id ?? null,
      assignedTo:  assignedTo  || null,
      reviewerId:  reviewerId  || null,
      dueDate:     dueDate     || null,
      estimatedHours: estimatedHours ? Number(estimatedHours) : null,
    }

    /* Only send assignedBy if the user has permission to change it */
    if (isManager) {
      payload.assignedBy = assignedBy || currentUserId
    }

    mutation.mutate(payload)
  }

  const isBusy = mutation.isPending

  /* ─────────────────────────────────────────────────────────────────────── */
  /*  Render                                                                  */
  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <form onSubmit={handleSubmit} className="space-y-8 mx-auto max-w-7xl">

      {/* ── Section 1: Core ────────────────────────────────────────────────── */}
      <section className={sectionCls}>
        <SectionHeader icon={CheckSquare} title="Task Details" />

        {/* Title */}
        <Field data-invalid={!!errors.title}>
          <FieldLabel>
            Title <span className="text-destructive">*</span>
          </FieldLabel>
          <FocusInput
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
          />
          <FieldError msg={errors.title} />
        </Field>

        {/* Type — segmented control */}
        <Field>
          <FieldLabel>Type</FieldLabel>
          <div className="flex items-center gap-1 rounded-md p-1 w-fit bg-subtle border border-default">
            {TASK_TYPES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                className={cn(
                  "flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-all cursor-pointer",
                  type === value
                    ? "bg-white text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </Field>

        {/* Priority + Status + Visibility row */}
        <div className={cn("grid grid-cols-1 gap-5", canSetVis ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
          {/* Priority */}
          <Field>
            <FieldLabel>Priority</FieldLabel>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-full h-10 border-default bg-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map(({ value, label, icon: Icon, color, bg }) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <span
                        className="flex items-center justify-center rounded p-0.5"
                        style={{ background: bg }}
                      >
                        <Icon className="size-3.5" style={{ color }} />
                      </span>
                      {label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Status */}
          <Field>
            <FieldLabel>Status</FieldLabel>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full h-10 border-default bg-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(({ value, label, icon: Icon, color }) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <Icon className="size-3.5" style={{ color }} />
                      {label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Visibility — only show if permission allows */}
          {canSetVis && (
            <Field>
              <FieldLabel>Visibility</FieldLabel>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger className="w-full h-10 border-default bg-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIBILITY_OPTIONS.map(({ value, label, description }) => (
                    <SelectItem key={value} value={value}>
                      <div>
                        <span className="font-medium">{label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          — {description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </div>
      </section>

      {/* ── Section 2: Organisation ────────────────────────────────────────── */}
      <section className={sectionCls}>
        <SectionHeader icon={Folder} title="Organisation" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Department */}
          <Field data-invalid={!!errors.departmentId}>
            <FieldLabel>
              Department <span className="text-destructive">*</span>
            </FieldLabel>
            <Select
              value={departmentId || "__none__"}
              onValueChange={(v) => setDepartmentId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger className="w-full h-10 border-default bg-white text-sm">
                <SelectValue placeholder="— Any department —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="text-muted-foreground">— Any department —</span>
                </SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError msg={errors.departmentId} />
          </Field>

          {/* Project */}
          <Field>
            <FieldLabel>
              Project <OptionalTag />
            </FieldLabel>
            <Select
              value={projectId || "__none__"}
              onValueChange={(v) => setProjectId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger className="w-full h-10 border-default bg-white text-sm">
                <SelectValue placeholder="— No project —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="text-muted-foreground">— No project —</span>
                </SelectItem>
                {filteredProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Sprint (only when project is selected) */}
          {projectId && (
            <Field>
              <FieldLabel>
                Sprint <OptionalTag />
              </FieldLabel>
              <Select
                value={sprintId || "__none__"}
                onValueChange={(v) => setSprintId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger className="w-full h-10 border-default bg-white text-sm">
                  <SelectValue placeholder="— No sprint —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    <span className="text-muted-foreground">— No sprint —</span>
                  </SelectItem>
                  {sprints.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {/* Parent Task */}
          <Field className={projectId ? "" : "sm:col-span-2"}>
            <FieldLabel>
              Parent Task <OptionalTag />
            </FieldLabel>
            <SearchableTaskSelect
              value={parentTask}
              onChange={setParentTask}
              excludeId={parentExcludeId}
            />
          </Field>
        </div>
      </section>

      {/* ── Section 3: People ──────────────────────────────────────────────── */}
      <section className={sectionCls}>
        <SectionHeader icon={Users} title="People" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Assigned To */}
          <Field>
            <FieldLabel>
              Assigned To <OptionalTag />
            </FieldLabel>
            <Select
              value={assignedTo || "__none__"}
              onValueChange={(v) => setAssignedTo(v === "__none__" ? "" : v)}
            >
              <SelectTrigger className="w-full h-10 border-default bg-white text-sm">
                <SelectValue placeholder="— Unassigned —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="text-muted-foreground">— Unassigned —</span>
                </SelectItem>
                {filteredEmployees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Assigned By — managers and above only */}
          {isManager && (
            <Field>
              <FieldLabel>
                Assigned By <OptionalTag />
              </FieldLabel>
              <Select
                value={assignedBy || currentUserId}
                onValueChange={setAssignedBy}
              >
                <SelectTrigger className="w-full h-10 border-default bg-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filteredEmployees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.fullName}
                      {e.id === currentUserId && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {/* Reviewer */}
          {/* <Field>
            <FieldLabel>
              Reviewer <OptionalTag />
            </FieldLabel>
            <Select
              value={reviewerId || "__none__"}
              onValueChange={(v) => setReviewerId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger className="w-full h-10 border-default bg-white text-sm">
                <SelectValue placeholder="— No reviewer —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="text-muted-foreground">— No reviewer —</span>
                </SelectItem>
                {filteredEmployees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field> */}
        </div>
      </section>

      {/* ── Section 4: Scheduling ──────────────────────────────────────────── */}
      <section className={sectionCls}>
        <SectionHeader icon={Calendar} title="Scheduling" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Due Date */}
          <Field>
            <FieldLabel>
              Due Date <OptionalTag />
            </FieldLabel>
            <DatePickerField
              value={dueDate}
              onChange={setDueDate}
              placeholder="Pick due date"
            />
          </Field>

          {/* Estimated Hours */}
          <Field data-invalid={!!errors.estimatedHours}>
            <FieldLabel>
              Estimated Hours <OptionalTag />
            </FieldLabel>
            <FocusInput
              type="number"
              min="0"
              step="0.5"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="e.g. 4"
            />
            <FieldError msg={errors.estimatedHours} />
          </Field>
        </div>
      </section>

      {/* ── Section 5: Description & Notes ────────────────────────────────── */}
      <section className={sectionCls}>
        <SectionHeader icon={FileText} title="Description & Notes" />

        <Field>
          <FieldLabel>
            Description <OptionalTag />
          </FieldLabel>
          <FocusTextarea
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of the task, acceptance criteria, links…"
          />
        </Field>

        <Field>
          <FieldLabel>
            Internal Note{" "}
            <span className="text-xs font-normal text-muted-foreground">
              (private, smaller context)
            </span>
          </FieldLabel>
          <FocusTextarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Quick notes, reminders, or internal context…"
          />
        </Field>
      </section>

      {/* ── Section 6: Attachments ─────────────────────────────────────────── */}
      <section className={sectionCls}>
        <SectionHeader icon={Paperclip} title="Attachments" />
        <p className="text-xs text-muted-foreground">
          {isEdit
            ? "New files will be uploaded immediately to this task."
            : "Files will be attached after the task is created."}
        </p>
        
        {/* Render existing attachments */}
        {task?.existingAttachments && task.existingAttachments.length > 0 && (
          <div className="mb-4 space-y-2">
            <p className="text-xs font-medium text-foreground">Existing Attachments</p>
            <ul className="space-y-2">
              {task.existingAttachments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-3 rounded-md border border-default bg-subtle px-3 py-2 opacity-80"
                >
                  <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {a.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.fileSizeBytes ? `${(a.fileSizeBytes / 1024).toFixed(1)} KB` : "Unknown size"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <AttachmentUploader
          taskId={isEdit ? task!.id : null}
          files={attachFiles}
          onChange={setAttachFiles}
        />
        <FieldError msg={errors.attachments} />
      </section>

      {/* ── Sticky footer ─────────────────────────────────────────────────── */}
      <div className="sticky bottom-4 z-30 flex flex-wrap items-center justify-end gap-3 rounded-md border border-default bg-white/80 p-2 backdrop-blur-md shadow-sm">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isBusy}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isBusy}
          className="min-w-[120px]"
        >
          {isBusy ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              {isEdit ? "Saving…" : "Creating…"}
            </span>
          ) : isEdit ? (
            "Save Changes"
          ) : (
            "Create Task"
          )}
        </Button>
      </div>
    </form>
  )
}
