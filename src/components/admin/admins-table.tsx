"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { MoreHorizontal, Pencil, UserX } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AdminRole } from "@/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type AdminRow = {
  id: string
  fullName: string
  email: string
  status: "active" | "inactive" | "pending"
  roleName: AdminRole
  roleLabel: string
  createdByName: string | null
  createdAt: string
  lastLogin: string | null
}

type AdminsTableProps = {
  admins: AdminRow[]
  currentAdminId: string
}

const ROLE_BADGE: Record<AdminRole, string> = {
  super_admin: "bg-primary/10 text-primary",
  admin: "bg-blue-100 text-blue-700",
  instructor: "bg-purple-100 text-purple-700",
  support: "bg-muted text-secondary",
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  inactive: "bg-muted text-secondary",
}

export function AdminsTable({ admins, currentAdminId }: AdminsTableProps) {
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [deactivating, setDeactivating] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const filtered = admins.filter((a) => {
    const matchSearch =
      !search ||
      a.fullName.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === "all" || a.roleName === roleFilter
    const matchStatus = statusFilter === "all" || a.status === statusFilter
    return matchSearch && matchRole && matchStatus
  })

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this admin? They will lose access immediately.")) return
    setDeactivating(id)
    try {
      const res = await fetch(`/api/admin/admins/${id}`, { method: "DELETE" })
      if (res.ok) {
        // Refresh the page to reflect the status change
        window.location.reload()
      } else {
        const data = await res.json()
        alert(data.error ?? "Failed to deactivate.")
      }
    } finally {
      setDeactivating(null)
      setOpenMenu(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-lg border border-default bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {mounted ? (
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px] bg-white h-[38px] rounded-lg border-default focus:ring-primary/20">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="super_admin">Super Admin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="instructor">Instructor</SelectItem>
              <SelectItem value="support">Support</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div className="w-[180px] h-[38px] rounded-lg border border-default bg-white" />
        )}

        {mounted ? (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-white h-[38px] rounded-lg border-default focus:ring-primary/20">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <div className="w-[180px] h-[38px] rounded-lg border border-default bg-white" />
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-default bg-white shadow-sm">
        <table className="w-full text-sm [border-collapse:separate] [border-spacing:0]">
          <thead className="border-b border-default bg-subtle">
            <tr>
              {["Name", "Email", "Role", "Status", "Created By", "Created At", "Actions"].map((h, i, arr) => (
                <th
                  key={h}
                  className={cn(
                    "px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-secondary border-b border-default",
                    i === 0 && "rounded-tl-2xl",
                    i === arr.length - 1 && "rounded-tr-2xl"
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-default">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-secondary font-medium rounded-b-2xl">
                  <UserX className="mx-auto mb-2 size-8 text-muted" />
                  No admins match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((admin, rowIndex) => {
                const isMe = admin.id === currentAdminId
                const isSuperAdmin = admin.roleName === "super_admin"
                const actionsDisabled = isMe || isSuperAdmin
                const isLastRow = rowIndex === filtered.length - 1

                return (
                  <tr key={admin.id} className="hover:bg-subtle/50 transition-colors">
                    {/* Name */}
                    <td className={cn("px-5 py-3 font-semibold text-foreground", isLastRow && "rounded-bl-2xl")}>
                      <span>{admin.fullName}</span>
                      {isMe && (
                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          You
                        </span>
                      )}
                    </td>

                    {/* Email */}
                    <td className="px-5 py-3 text-secondary">{admin.email}</td>

                    {/* Role */}
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          ROLE_BADGE[admin.roleName]
                        )}
                      >
                        {admin.roleLabel}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                          STATUS_BADGE[admin.status]
                        )}
                      >
                        {admin.status}
                      </span>
                    </td>

                    {/* Created By */}
                    <td className="px-5 py-3 text-secondary">
                      {admin.createdByName ?? "System"}
                    </td>

                    {/* Created At */}
                    <td className="px-5 py-3 text-secondary">
                      {new Date(admin.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    {/* Actions */}
                    <td className={cn("px-5 py-3", isLastRow && "rounded-br-2xl")}>
                      <div className="relative inline-block">
                        <button
                          onClick={() => setOpenMenu(openMenu === admin.id ? null : admin.id)}
                          disabled={actionsDisabled}
                          className="rounded-lg border border-default bg-white p-1.5 text-secondary transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>

                        {openMenu === admin.id && (
                          <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-default bg-white shadow-lg">
                            <Link
                              href={`/admin/admins/${admin.id}`}
                              onClick={() => setOpenMenu(null)}
                              className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-subtle transition-colors rounded-t-xl"
                            >
                              <Pencil className="size-3.5" />
                              Edit
                            </Link>
                            <button
                              onClick={() => handleDeactivate(admin.id)}
                              disabled={!!deactivating}
                              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors rounded-b-xl disabled:opacity-50"
                            >
                              <UserX className="size-3.5" />
                              {deactivating === admin.id ? "Deactivating…" : "Deactivate"}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
