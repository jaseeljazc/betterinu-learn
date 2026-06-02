"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2, Plus, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const inputCls =
  "w-full h-10 rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700"
const inputStyle = {
  borderColor: "var(--border-default)",
  background: "var(--bg-surface)",
  color: "var(--text-primary)",
}
const labelCls = "block text-sm font-semibold mb-1.5"

async function fetchDepartments() {
  const res = await fetch("/api/admin/employees/tasks/departments", { credentials: "include" })
  if (!res.ok) throw new Error("Failed to load departments")
  const data = await res.json()
  return data.data ?? []
}

export function ProjectForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [departmentId, setDepartmentId] = useState("")

  const { data: departments = [], isLoading: loadingDepts } = useQuery({
    queryKey: ["departments"],
    queryFn: fetchDepartments,
  })

  const mutation = useMutation({
    mutationFn: async (payload: { name: string; description?: string | null; departmentId?: string | null }) => {
      const res = await fetch("/api/admin/employees/tasks/projects", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to create project")
      return json.data
    },
    onSuccess: () => {
      toast.success("Project created successfully")
      router.push("/admin/tasks/projects")
      router.refresh()
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Project name is required")
      return
    }
    mutation.mutate({
      name: name.trim(),
      description: description.trim() || null,
      departmentId: departmentId || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/tasks/projects"
          className="text-xs font-semibold inline-flex items-center gap-1.5 transition-colors hover:underline"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft className="size-3" />
          Back to Projects
        </Link>
      </div>

      <div
        className="rounded-md border p-6 space-y-5"
        style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)" }}
      >
        <div className="pb-2 border-b text-sm font-bold uppercase tracking-wider" style={{ borderColor: "var(--border-muted)", color: "var(--text-muted)" }}>
          Project Details
        </div>

        <div>
          <label className={labelCls} style={{ color: "var(--text-primary)" }}>
            Project Name <span style={{ color: "var(--danger-500)" }}>*</span>
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Q4 Website Redesign"
            className={inputCls}
            style={inputStyle}
          />
        </div>

        <div>
          <label className={labelCls} style={{ color: "var(--text-primary)" }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this project about?"
            rows={3}
            className="w-full rounded-md border px-3 py-2 text-sm resize-none outline-none transition-colors focus:ring-2 focus:ring-green-700/20 focus:border-green-700"
            style={{
              ...inputStyle,
              height: 100,
            }}
          />
        </div>

        <div>
          <label className={labelCls} style={{ color: "var(--text-primary)" }}>
            Department <span className="text-xs font-normal opacity-70">(optional)</span>
          </label>
          {loadingDepts ? (
            <div className="h-10 rounded border flex items-center px-3 text-sm" style={{ borderColor: "var(--border-default)", color: "var(--text-muted)" }}>
              <Loader2 className="size-4 animate-spin mr-2" /> Loading departments...
            </div>
          ) : (
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full h-10 rounded-md border px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-green-700/20 focus:border-green-700"
              style={inputStyle}
            >
              <option value="">Cross-department (All)</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Link href="/admin/tasks/projects">
          <Button variant="outline" type="button" disabled={mutation.isPending}>
            Cancel
          </Button>
        </Link>
        <Button type="submit" disabled={!name.trim() || mutation.isPending} className="gap-2">
          {mutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Create Project
        </Button>
      </div>
    </form>
  )
}
