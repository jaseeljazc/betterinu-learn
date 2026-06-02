"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  FolderOpen,
  Calendar,
  Building2,
  User,
  Plus,
  Loader2,
  X,
  RefreshCw,
  ClipboardList,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { DatePickerField } from "@/components/admin/employees/employee-form/date-picker-field"

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Types                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

type ProjectMetadata = {
  id: string
  name: string
  description?: string | null
  departmentName?: string | null
  createdByName?: string | null
  createdAt: string
}

type Sprint = {
  id: string
  project_id: string
  name: string
  start_date?: string | null
  end_date?: string | null
  is_active: boolean
  created_at: string
  total_tasks: number
  completed_tasks: number
  todo_tasks: number
  doing_tasks: number
}

type ProjectDetailViewProps = {
  project: ProjectMetadata
  canManageSprints: boolean
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

function fmtDate(d?: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Add Sprint Modal Component                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */

type AddSprintModalProps = {
  projectId: string
  onClose: () => void
  onSuccess: () => void
}

function AddSprintModal({ projectId, onClose, onSuccess }: AddSprintModalProps) {
  const [name, setName] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/employees/tasks/projects/${projectId}/sprints`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          startDate: startDate || null,
          endDate: endDate || null,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed")
      return json.data
    },
    onSuccess: () => {
      toast.success("Sprint added successfully")
      onSuccess()
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Sprint name is required")
      return
    }
    createMutation.mutate()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-md border shadow-xl animate-in zoom-in-95 duration-150"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--border-muted)" }}
        >
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            Add New Sprint
          </h3>
          <button
            type="button"
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
              Sprint Name *
            </label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sprint 1 - Core Backend"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Start Date
              </label>
              <DatePickerField
                value={startDate}
                onChange={setStartDate}
                placeholder="Pick start date"
              />
            </div>

            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                End Date
              </label>
              <DatePickerField
                value={endDate}
                onChange={setEndDate}
                placeholder="Pick end date"
              />
            </div>
          </div>
        </div>

        <div
          className="flex items-center justify-end gap-2 px-5 py-4 border-t"
          style={{ borderColor: "var(--border-muted)" }}
        >
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            type="submit"
            disabled={!name.trim() || createMutation.isPending}
            className="gap-2"
          >
            {createMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            Add Sprint
          </Button>
        </div>
      </form>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Main View Component                                                         */
/* ─────────────────────────────────────────────────────────────────────────── */

export function ProjectDetailView({
  project,
  canManageSprints,
}: ProjectDetailViewProps) {
  const queryClient = useQueryClient()
  const [showAddSprint, setShowAddSprint] = useState(false)

  const { data: sprints = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["project-sprints", project.id],
    queryFn: async (): Promise<Sprint[]> => {
      const res = await fetch(`/api/admin/employees/tasks/projects/${project.id}/sprints`, { credentials: "include" })
      if (!res.ok) throw new Error("Failed to fetch sprints")
      const json = await res.json()
      return json.data ?? []
    },
    staleTime: 30_000,
  })

  return (
    <div className="w-full space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/admin/tasks/projects"
          className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors hover:underline"
          style={{ color: "var(--text-muted)" }}
        >
          ← Back to projects
        </Link>
      </div>

      {/* Project Meta Card */}
      <div
        className="rounded-md border p-6 space-y-4"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <div
                className="size-9 rounded-md flex items-center justify-center shrink-0"
                style={{ background: "var(--green-50)" }}
              >
                <FolderOpen className="size-4.5" style={{ color: "var(--green-700)" }} />
              </div>
              <div>
                <h1 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                  {project.name}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Project Overview & Sprint Cycles
                </p>
              </div>
            </div>
          </div>
        </div>

        {project.description && (
          <div className="text-sm leading-relaxed whitespace-pre-wrap max-w-3xl" style={{ color: "var(--text-secondary)" }}>
            {project.description}
          </div>
        )}

        <Separator style={{ borderColor: "var(--border-muted)" }} />

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs" style={{ color: "var(--text-muted)" }}>
          <div className="flex items-center gap-1.5">
            <Building2 className="size-4" />
            <span className="font-semibold text-foreground">Department:</span>
            <span>{project.departmentName ?? "Cross-department (All)"}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <User className="size-4" />
            <span className="font-semibold text-foreground">Created by:</span>
            <span>{project.createdByName ?? "System"}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="size-4" />
            <span className="font-semibold text-foreground">Created at:</span>
            <span>{fmtDate(project.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Sprints Board List */}
      <div
        className="rounded-md border overflow-hidden"
        style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
      >
        <div
          className="px-4 py-3 border-b flex items-center justify-between gap-4"
          style={{ borderColor: "var(--border-muted)", background: "var(--bg-subtle)" }}
        >
          <div className="flex items-center gap-2">
            <ClipboardList className="size-4 text-muted-foreground" style={{ color: "var(--text-muted)" }} />
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Sprints ({sprints.length})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh sprints"
              className="flex items-center justify-center size-7 rounded-md border transition-colors bg-white hover:bg-subtle"
              style={{ borderColor: "var(--border-default)", color: "var(--text-muted)" }}
            >
              <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </button>
            {canManageSprints && (
              <Button size="xs" onClick={() => setShowAddSprint(true)} className="gap-1">
                <Plus className="size-3" />
                Add Sprint
              </Button>
            )}
          </div>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="space-y-2 py-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-10 rounded animate-pulse" style={{ background: "var(--bg-subtle)" }} />
              ))}
            </div>
          ) : sprints.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <ClipboardList className="size-8 mx-auto text-muted-foreground" style={{ color: "var(--text-disabled)" }} />
              <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                No sprints added to this project yet.
              </p>
              {canManageSprints && (
                <button
                  onClick={() => setShowAddSprint(true)}
                  className="text-xs font-bold hover:underline"
                  style={{ color: "var(--green-700)" }}
                >
                  Create a sprint cycle →
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--border-muted)" }}>
                    <th className="py-2.5 px-3 font-semibold text-muted-foreground" style={{ color: "var(--text-muted)" }}>Sprint Name</th>
                    <th className="py-2.5 px-3 font-semibold text-muted-foreground" style={{ color: "var(--text-muted)" }}>Start Date</th>
                    <th className="py-2.5 px-3 font-semibold text-muted-foreground" style={{ color: "var(--text-muted)" }}>End Date</th>
                    <th className="py-2.5 px-3 font-semibold text-muted-foreground" style={{ color: "var(--text-muted)" }}>Tasks Progress</th>
                    <th className="py-2.5 px-3 font-semibold text-muted-foreground" style={{ color: "var(--text-muted)" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sprints.map((s) => {
                    const completedTasks = s.completed_tasks ?? 0
                    const totalTasks = s.total_tasks ?? 0
                    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

                    return (
                      <tr
                        key={s.id}
                        className="border-b last:border-0 hover:bg-subtle/40 transition-colors"
                        style={{ borderColor: "var(--border-muted)" }}
                      >
                        <td className="py-3 px-3 font-bold" style={{ color: "var(--text-primary)" }}>
                          {s.name}
                        </td>
                        <td className="py-3 px-3" style={{ color: "var(--text-secondary)" }}>
                          {fmtDate(s.start_date)}
                        </td>
                        <td className="py-3 px-3" style={{ color: "var(--text-secondary)" }}>
                          {fmtDate(s.end_date)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2 max-w-[180px]">
                            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-subtle)" }}>
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${progressPercent}%`,
                                  background: "var(--green-600)",
                                }}
                              />
                            </div>
                            <span className="font-semibold shrink-0" style={{ color: "var(--text-primary)" }}>
                              {completedTasks}/{totalTasks} ({progressPercent}%)
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                              s.is_active
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-gray-50 text-gray-600 border-gray-200"
                            }`}
                          >
                            {s.is_active ? "Active" : "Closed"}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Sprint Modal */}
      {showAddSprint && (
        <AddSprintModal
          projectId={project.id}
          onClose={() => setShowAddSprint(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["project-sprints", project.id] })}
        />
      )}
    </div>
  )
}
