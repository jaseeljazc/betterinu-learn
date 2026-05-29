"use client"

import { Pencil, UserX, MoreHorizontal, UserCheck, UsersRound, Plus } from "lucide-react"
import { useState, useEffect } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import type { AdminRole } from "@/types"
import { DataTable } from "./data-table"
import { Badge } from "@/components/ui/badge"
import { Dialog } from "@/components/ui/dialog"
import { AdminForm } from "./admin-form"
import type { AdminFormRole, AdminFormData, AdminFormInitialData } from "./admin-form"
import RoboLoader from "@/components/loading/robo-loader"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/* ------------------------------------------------------------------ */
/*  Types & constants                                                    */
/* ------------------------------------------------------------------ */

type AdminRow = {
  id: string
  fullName: string
  email: string
  status: "active" | "inactive" | "pending"
  roleName: AdminRole
  roleLabel: string
  roleId: string
  createdByName: string | null
  createdAt: string
  lastLogin: string | null
  tempPassword: string | null
}

type AdminsTableProps = {
  admins: AdminRow[]
  currentAdminId: string
}

const ROLE_BADGE: Record<AdminRole, string> = {
  super_admin: "bg-primary/10 text-primary border-primary/20",
  admin: "bg-blue-50 text-blue-700 border-blue-200",
  instructor: "bg-purple-50 text-purple-700 border-purple-200",
  support: "bg-gray-50 text-gray-600 border-gray-200",
  account_manager: "bg-amber-50 text-amber-700 border-amber-200",
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  inactive: "bg-gray-50 text-gray-600 border-gray-200",
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/* ------------------------------------------------------------------ */
/*  Component                                                            */
/* ------------------------------------------------------------------ */

export function AdminsTable({ admins, currentAdminId }: AdminsTableProps) {
  const [deactivating, setDeactivating] = useState<string | null>(null)
  const [activating, setActivating] = useState<string | null>(null)

  /* ── Roles (fetched once for both modals) ── */
  const [roles, setRoles] = useState<AdminFormRole[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)

  /* ── Create modal ── */
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)

  /* ── Edit modal ── */
  const [editingAdmin, setEditingAdmin] = useState<AdminRow | null>(null)
  const [editLoading, setEditLoading] = useState(false)

  /* ── Fetch roles on first open ── */
  useEffect(() => {
    if (!isCreateOpen && !editingAdmin) return
    if (roles.length > 0) return

    setRolesLoading(true)
    fetch("/api/admin/roles")
      .then((r) => r.json())
      .then((d) => {
        const list: AdminFormRole[] = (d.roles ?? []).filter(
          (r: AdminFormRole) => r.name !== "super_admin"
        )
        setRoles(list)
      })
      .catch(() => toast.error("Failed to load roles"))
      .finally(() => setRolesLoading(false))
  }, [isCreateOpen, editingAdmin, roles.length])

  /* ── Handlers ── */
  async function handleCreateAdmin(data: AdminFormData) {
    setCreateLoading(true)
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? "Failed to create admin.")
        return
      }
      toast.success("Admin account created. Login credentials have been sent.")
      setIsCreateOpen(false)
      window.location.reload()
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleEditAdmin(data: AdminFormData) {
    if (!editingAdmin) return
    setEditLoading(true)
    try {
      const res = await fetch(`/api/admin/admins/${editingAdmin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: data.fullName,
          roleId: data.roleId,
          status: data.status,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? "Failed to update admin.")
        return
      }
      toast.success("Admin updated successfully.")
      setEditingAdmin(null)
      window.location.reload()
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setEditLoading(false)
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this admin? They will lose access immediately.")) return
    setDeactivating(id)
    try {
      const res = await fetch(`/api/admin/admins/${id}`, { method: "DELETE" })
      if (res.ok) window.location.reload()
      else {
        const data = await res.json()
        toast.error(data.error ?? "Failed to deactivate.")
      }
    } finally {
      setDeactivating(null)
    }
  }

  async function handleActivate(id: string) {
    if (!confirm("Activate this admin? They will regain access immediately.")) return
    setActivating(id)
    try {
      const res = await fetch(`/api/admin/admins/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      })
      if (res.ok) window.location.reload()
      else {
        const data = await res.json()
        toast.error(data.error ?? "Failed to activate.")
      }
    } finally {
      setActivating(null)
    }
  }

  /* ── Table columns ── */
  const columns: ColumnDef<AdminRow>[] = [
    {
      accessorKey: "fullName",
      header: "Name",
      size: 200,
      cell: ({ row }) => {
        const isMe = row.original.id === currentAdminId
        return (
          <span className="font-semibold text-foreground">
            {row.getValue("fullName")}
            {isMe && (
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                You
              </span>
            )}
          </span>
        )
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      size: 220,
      cell: ({ getValue }) => (
        <span className="text-secondary text-xs">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: "tempPassword",
      header: "Temp Password",
      size: 130,
      cell: ({ getValue }) => {
        const val = getValue() as string | null
        return val ? (
          <code className="rounded px-1.5 py-0.5 font-mono text-xs font-semibold text-muted dark:text-white">
            {val}
          </code>
        ) : (
          <span className="text-secondary text-xs">—</span>
        )
      },
    },
    {
      accessorKey: "roleName",
      header: "Role",
      size: 140,
      filterFn: "equals",
      cell: ({ row }) => (
        <Badge variant="outline" className={ROLE_BADGE[row.original.roleName]}>
          {row.original.roleLabel}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      size: 110,
      filterFn: "equals",
      cell: ({ getValue }) => {
        const v = getValue() as string
        return (
          <Badge variant="outline" className={STATUS_BADGE[v]}>
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </Badge>
        )
      },
    },
    {
      accessorKey: "createdByName",
      header: "Created By",
      size: 140,
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="text-secondary">{(getValue() as string | null) ?? "System"}</span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      size: 120,
      cell: ({ getValue }) => (
        <span className="text-secondary">{fmtDate(getValue() as string)}</span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      size: 64,
      enableSorting: false,
      cell: ({ row }) => {
        const admin = row.original
        const isMe = admin.id === currentAdminId
        const isSuperAdmin = admin.roleName === "super_admin"
        const actionsDisabled = isMe || isSuperAdmin
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                disabled={actionsDisabled}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-default bg-white text-secondary transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-50 min-w-[160px] overflow-hidden rounded-xl border border-default bg-white shadow-lg">
              <DropdownMenuItem
                onClick={() => setEditingAdmin(admin)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-subtle transition-colors cursor-pointer"
              >
                <Pencil className="size-3.5" /> Edit
              </DropdownMenuItem>
              {admin.status === "inactive" ? (
                <DropdownMenuItem
                  onClick={() => handleActivate(admin.id)}
                  disabled={!!activating}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <UserCheck className="size-3.5" />
                  {activating === admin.id ? "Activating…" : "Activate"}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => handleDeactivate(admin.id)}
                  disabled={!!deactivating}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <UserX className="size-3.5" />
                  {deactivating === admin.id ? "Deactivating…" : "Deactivate"}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  /* ── Derive AdminFormInitialData from the editing row ── */
  const editInitialData: AdminFormInitialData | undefined = editingAdmin
    ? {
      id: editingAdmin.id,
      fullName: editingAdmin.fullName,
      email: editingAdmin.email,
      status: editingAdmin.status,
      roleName: editingAdmin.roleName,
      roleId: editingAdmin.roleId,
    }
    : undefined

  return (
    <div className="w-full min-h-screen bg-subtle px-6 lg:px-10 py-10">
      {/* ── Page Header ── */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <UsersRound className="size-6 text-primary" />
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Admins
            </h1>
          </div>
          <p className="text-sm text-secondary">
            Manage admin accounts and permissions.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 hover:shadow-md cursor-pointer"
        >
          <Plus className="size-4" />
          Add New Admin
        </button>
      </div>

      {/* ── Table ── */}
      <DataTable
        columns={columns}
        data={admins}
        searchable
        searchPlaceholder="Search name or email…"
        searchColumn="fullName"
        filters={[
          {
            column: "roleName",
            label: "Role",
            options: [
              { value: "super_admin", label: "Super Admin" },
              { value: "admin", label: "Admin" },
              { value: "instructor", label: "Instructor" },
              { value: "support", label: "Support" },
              { value: "account_manager", label: "Account Manager" },
            ],
          },
          {
            column: "status",
            label: "Status",
            options: [
              { value: "active", label: "Active" },
              { value: "pending", label: "Pending" },
              { value: "inactive", label: "Inactive" },
            ],
          },
        ]}
        emptyMessage="No admins match your filters."
        emptyIcon={UserX}
      />

      {/* ── Add Admin Modal ── */}
      {isCreateOpen && (
        <Dialog
          open={isCreateOpen}
          title="Add New Admin"
          onClose={() => setIsCreateOpen(false)}
          size="3xl"
          scrollable={false}
        >
          {rolesLoading ? (
            <div className="flex items-center justify-center py-16">
              <RoboLoader caption="Loading roles…" />
            </div>
          ) : (
            <AdminForm
              roles={roles}
              onSubmit={handleCreateAdmin}
              onCancel={() => setIsCreateOpen(false)}
              loading={createLoading}
            />
          )}
        </Dialog>
      )}

      {/* ── Edit Admin Modal ── */}
      {editingAdmin && (
        <Dialog
          open={!!editingAdmin}
          title="Edit Admin"
          onClose={() => setEditingAdmin(null)}
          size="3xl"
          scrollable={false}
        >
          {rolesLoading ? (
            <div className="flex items-center justify-center py-16">
              <RoboLoader caption="Loading roles…" />
            </div>
          ) : (
            <AdminForm
              initialData={editInitialData}
              roles={
                editingAdmin.roleName === "super_admin"
                  ? []
                  : roles
              }
              onSubmit={handleEditAdmin}
              onCancel={() => setEditingAdmin(null)}
              loading={editLoading}
            />
          )}
        </Dialog>
      )}
    </div>
  )
}
