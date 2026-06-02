"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  FolderOpen,
  Plus,
  Building2,
  CalendarDays,
  MoreHorizontal,
  Pencil,
  Loader2,
  X,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/admin/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

type Project = {
  id: string
  name: string
  description?: string | null
  departmentId?: string | null
  departmentName?: string | null
  isActive: boolean
  taskCount: number
  sprintCount: number
  createdByName?: string | null
  createdAt: string
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Data Fetchers & Helpers                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

async function fetchProjects(): Promise<Project[]> {
  const res = await fetch("/api/admin/employees/tasks/projects", { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch projects")
  const json = await res.json()
  return json.data ?? []
}

async function fetchDepartments() {
  const res = await fetch("/api/admin/employees/tasks/departments", { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch departments")
  const json = await res.json()
  return json.data ?? []
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Project Create / Edit Modal                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */

type ProjectModalProps = {
  project?: Project | null
  onClose: () => void
  onSuccess: () => void
}

function ProjectModal({ project, onClose, onSuccess }: ProjectModalProps) {
  const [name, setName] = useState(project?.name ?? "")
  const [description, setDescription] = useState(project?.description ?? "")
  const [departmentId, setDepartmentId] = useState(project?.departmentId ?? "all")

  const { data: departments = [], isLoading: loadingDepts } = useQuery({
    queryKey: ["departments"],
    queryFn: fetchDepartments,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = project
        ? `/api/admin/employees/tasks/projects/${project.id}`
        : "/api/admin/employees/tasks/projects"
      const method = project ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          departmentId: departmentId === "all" ? null : (departmentId || null),
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed")
      return json.data
    },
    onSuccess: () => {
      toast.success(project ? "Project updated successfully" : "Project created successfully")
      onSuccess()
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-lg border shadow-xl animate-in zoom-in-95 duration-150"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--border-muted)" }}
        >
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {project ? "Edit Project" : "New Project"}
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 transition-colors hover:bg-subtle"
            style={{ color: "var(--text-muted)" }}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Project Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Website Redesign"
              autoFocus
            />
          </div>

          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={3}
            />
          </div>

          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Department (optional)
            </label>
            {loadingDepts ? (
              <div className="h-9 rounded border flex items-center px-3 text-xs" style={{ borderColor: "var(--border-default)", color: "var(--text-muted)" }}>
                <Loader2 className="size-3.5 animate-spin mr-2" /> Loading departments...
              </div>
            ) : (
              <Select
                value={departmentId}
                onValueChange={setDepartmentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Cross-department (All)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Cross-department (All)</SelectItem>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div
          className="flex items-center justify-end gap-2 px-5 py-4 border-t"
          style={{ borderColor: "var(--border-muted)" }}
        >
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            disabled={!name.trim() || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            className="gap-2"
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Pencil className="size-3.5" />
            )}
            Save Project
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Main Component                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */

type ProjectsListProps = {
  canManage: boolean
}

export function ProjectsList({ canManage }: ProjectsListProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [modalState, setModalState] = useState<{ open: boolean; project?: Project | null }>({ open: false, project: null })

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["task-projects"],
    queryFn: fetchProjects,
    staleTime: 60_000,
  })

  const disableMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const res = await fetch(`/api/admin/employees/tasks/projects/${projectId}`, {
        method: "DELETE",
        credentials: "include",
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to disable project")
      return json
    },
    onSuccess: () => {
      toast.success("Project disabled successfully")
      queryClient.invalidateQueries({ queryKey: ["task-projects"] })
      router.refresh()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleDisable = (id: string) => {
    if (confirm("Are you sure you want to disable this project? This will archive it from active views.")) {
      disableMutation.mutate(id)
    }
  }

  const columns: ColumnDef<Project>[] = [
    {
      accessorKey: "name",
      header: "Project Name",
      cell: ({ row }) => (
        <div>
          <Link
            href={`/admin/tasks/projects/${row.original.id}`}
            className="font-bold hover:underline"
            style={{ color: "var(--green-700)" }}
          >
            {row.original.name}
          </Link>
          {row.original.description && (
            <p className="text-[11px] text-muted-foreground truncate max-w-[280px]" style={{ color: "var(--text-muted)" }}>
              {row.original.description}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "departmentName",
      header: "Department",
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.departmentName ? (
            <span className="inline-flex items-center gap-1">
              <Building2 className="size-3 text-muted-foreground" />
              {row.original.departmentName}
            </span>
          ) : (
            <span className="text-muted-foreground italic" style={{ color: "var(--text-muted)" }}>Cross-department</span>
          )}
        </span>
      ),
    },
    {
      accessorKey: "sprintCount",
      header: "Sprints",
      size: 100,
      cell: ({ row }) => (
        <span className="text-xs font-semibold">
          {row.original.sprintCount ?? 0}
        </span>
      ),
    },
    {
      accessorKey: "taskCount",
      header: "Active Tasks",
      size: 110,
      cell: ({ row }) => (
        <span className="text-xs font-semibold">
          {row.original.taskCount ?? 0}
        </span>
      ),
    },
    {
      accessorKey: "createdByName",
      header: "Created By",
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.createdByName ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {fmtDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      size: 64,
      enableSorting: false,
      cell: ({ row }) => {
        const p = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-7 w-7 items-center justify-center rounded-md border border-default bg-white text-secondary hover:border-primary hover:text-primary transition-colors">
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px] rounded-md border border-default bg-white shadow-lg">
              <DropdownMenuItem asChild>
                <Link
                  href={`/admin/tasks/projects/${p.id}`}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer"
                >
                  <FolderOpen className="size-3.5" /> View Sprints
                </Link>
              </DropdownMenuItem>
              {canManage && (
                <DropdownMenuItem
                  onClick={() => setModalState({ open: true, project: p })}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer"
                >
                  <Pencil className="size-3.5" /> Edit Project
                </DropdownMenuItem>
              )}
              {canManage && (
                <DropdownMenuItem
                  onClick={() => handleDisable(p.id)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" /> Disable
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        data={projects}
        loading={isLoading}
        searchable
        searchPlaceholder="Search projects…"
        emptyMessage="No projects found."
        emptyIcon={FolderOpen}
        actions={
          canManage ? (
            <Button
              size="sm"
              className="gap-1.5 cursor-pointer"
              onClick={() => setModalState({ open: true, project: null })}
            >
              <Plus className="size-4" /> New Project
            </Button>
          ) : undefined
        }
      />

      {modalState.open && (
        <ProjectModal
          project={modalState.project}
          onClose={() => setModalState({ open: false, project: null })}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["task-projects"] })}
        />
      )}
    </>
  )
}
