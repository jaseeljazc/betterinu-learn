"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, Building2, Users, Pencil, Ban, MoreHorizontal } from "lucide-react"
import { DataTable } from "@/components/admin/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import type { Department } from "@/types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/* ------------------------------------------------------------------ */
/*  Department form dialog                                              */
/* ------------------------------------------------------------------ */

type DeptFormProps = {
  initial?: Partial<Department>
  employees: { id: string; fullName: string }[]
  onSave: (data: { name: string; description?: string; headEmployeeId?: string }) => Promise<void>
  onCancel: () => void
}

function DepartmentFormDialog({ initial, employees, onSave, onCancel }: DeptFormProps) {
  const [name, setName] = useState(initial?.name ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [headId, setHeadId] = useState(initial?.headEmployee?.id ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError("Name is required"); return }
    setSaving(true)
    try {
      await onSave({ name: name.trim(), description: description || undefined, headEmployeeId: headId || undefined })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-x p-4 animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="w-full max-w-md rounded-md bg-white border border-default shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-default">
          <Building2 className="size-4 text-primary" />
          <h2 className="font-bold text-base">{initial?.id ? "Edit Department" : "New Department"}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-default bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="e.g. Engineering"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-default bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder="Optional description"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold">Department Head</label>
            <select
              value={headId}
              onChange={(e) => setHeadId(e.target.value)}
              className="w-full rounded-md border border-default bg-surface px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">— None —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.fullName}</option>
              ))}
            </select>
          </div>
          {error && (
            <p className="rounded-md bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-md border border-default px-4 py-2.5 text-sm font-semibold text-secondary hover:bg-subtle"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type DepartmentsTableProps = {
  canEdit: boolean
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function DepartmentsTable({ canEdit }: DepartmentsTableProps) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees]     = useState<{ id: string; fullName: string }[]>([])
  const [loading, setLoading]         = useState(true)
  const [dialog, setDialog]           = useState<{ open: boolean; dept?: Department }>({ open: false })

  const fetchData = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch("/api/admin/employees/departments?all=1", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/admin/employees", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([deptData, empData]) => {
        setDepartments(deptData.departments ?? [])
        setEmployees((empData.employees ?? []).map((e: { id: string; fullName: string }) => ({ id: e.id, fullName: e.fullName })))
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleSave(data: { name: string; description?: string; headEmployeeId?: string }) {
    const deptId = dialog.dept?.id
    const url = deptId
      ? `/api/admin/employees/departments/${deptId}`
      : "/api/admin/employees/departments"
    const method = deptId ? "PATCH" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const d = await res.json()
      throw new Error(d.error ?? "Failed to save department")
    }

    setDialog({ open: false })
    fetchData()
  }

  async function handleDeactivate(id: string) {
    await fetch(`/api/admin/employees/departments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isActive: false }),
    })
    fetchData()
  }

  async function handleActivate(id: string) {
    await fetch(`/api/admin/employees/departments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isActive: true }),
    })
    fetchData()
  }

  const columns: ColumnDef<Department>[] = [
    {
      accessorKey: "name",
      header: "Department",
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-foreground text-sm">{row.original.name}</p>
          {row.original.description && (
            <p className="text-[11px] text-muted truncate max-w-[200px]">{row.original.description}</p>
          )}
        </div>
      ),
    },
    {
      id: "headEmployee",
      header: "Head",
      cell: ({ row }) => (
        <span className="text-sm text-secondary">
          {row.original.headEmployee?.fullName ?? <span className="text-muted italic text-xs">—</span>}
        </span>
      ),
    },
    {
      accessorKey: "employeeCount",
      header: "Employees",
      size: 100,
      cell: ({ getValue }) => (
        <div className="flex items-center gap-1.5">
          <Users className="size-3.5 text-muted" />
          <span className="text-sm font-medium">{(getValue() as number) ?? 0}</span>
        </div>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      size: 100,
      cell: ({ getValue }) => {
        const active = getValue() as boolean
        return (
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
            {active ? "Active" : "Inactive"}
          </span>
        )
      },
    },
    {
      id: "actions",
      header: "Actions",
      size: 64,
      enableSorting: false,
      cell: ({ row }) => {
        const dept = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-7 w-7 items-center justify-center rounded-md border border-default bg-white text-secondary hover:border-primary hover:text-primary transition-colors">
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px] rounded-md border border-default bg-white shadow-lg">
              {canEdit && (
                <DropdownMenuItem
                  onClick={() => setDialog({ open: true, dept })}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer"
                >
                  <Pencil className="size-3.5" /> Edit
                </DropdownMenuItem>
              )}
              {canEdit && (
                <DropdownMenuItem
                  onClick={() => dept.isActive ? handleDeactivate(dept.id) : handleActivate(dept.id)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer text-red-600 hover:bg-red-50"
                >
                  <Ban className="size-3.5" />
                  {dept.isActive ? "Deactivate" : "Activate"}
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
        data={departments}
        loading={loading}
        searchable
        searchPlaceholder="Search departments…"
        emptyMessage="No departments found."
        emptyIcon={Building2}
        actions={
          canEdit ? (
            <button
              onClick={() => setDialog({ open: true })}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 whitespace-nowrap"
            >
              <Plus className="size-4" /> Add Department
            </button>
          ) : undefined
        }
      />

      {dialog.open && (
        <DepartmentFormDialog
          initial={dialog.dept}
          employees={employees}
          onSave={handleSave}
          onCancel={() => setDialog({ open: false })}
        />
      )}
    </>
  )
}
