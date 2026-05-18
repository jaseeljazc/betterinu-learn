"use client"

import { useState } from "react"
import Link from "next/link"
import {
  MoreHorizontal,
  Pencil,
  ShieldOff,
  ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { AdminRoleRecord } from "@/types"

type RoleRow = AdminRoleRecord & { adminCount: number }

type RolesTableProps = {
  roles: RoleRow[]
}

export function RolesTable({ roles }: RolesTableProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeleting(id)
    setError(null)
    try {
      const res = await fetch(`/api/admin/roles/${id}`, { method: "DELETE" })
      if (res.ok) {
        window.location.reload()
      } else {
        const data = await res.json()
        setError(data.error ?? "Failed to delete role.")
      }
    } finally {
      setDeleting(null)
      setConfirmId(null)
      setOpenMenu(null)
    }
  }

  const systemRoles = roles.filter((r) => r.isSystem)
  const customRoles = roles.filter((r) => !r.isSystem)
  const sorted = [...systemRoles, ...customRoles]

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Confirm dialog (lightweight — no modal dependency) */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-default bg-white p-6 shadow-xl">
            <ShieldOff className="mb-3 size-10 text-destructive" />
            <h2 className="text-base font-bold text-foreground">Delete this role?</h2>
            <p className="mt-1 text-sm text-secondary">
              This action cannot be undone. Any admins currently using this role must be
              reassigned first.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => handleDelete(confirmId)}
                disabled={!!deleting}
                className="flex-1 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 rounded-lg border border-default px-4 py-2 text-sm font-semibold text-foreground hover:bg-subtle"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-default bg-white shadow-sm">
        <table className="w-full text-sm [border-collapse:separate] [border-spacing:0]">
          <thead className="border-b border-default bg-subtle">
            <tr>
              {["Role Name", "Description", "Permissions", "Admins Using", "Actions"].map((h, i, arr) => (
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
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center rounded-b-2xl">
                  <ShieldCheck className="mx-auto mb-2 size-8 text-secondary" />
                  <p className="text-sm text-secondary">No roles found.</p>
                </td>
              </tr>
            ) : (
              sorted.map((role, rowIndex) => {
                const isSuperAdmin = role.name === "super_admin"
                const canDelete = !role.isSystem && role.adminCount === 0
                const deleteTooltip = role.isSystem
                  ? "System roles cannot be deleted"
                  : role.adminCount > 0
                    ? `${role.adminCount} admin(s) use this role — reassign first`
                    : undefined
                const isLastRow = rowIndex === sorted.length - 1

                // Permission summary
                const permCount = role.permissions.length
                const modules = [...new Set(role.permissions.map((p) => p.module))]
                const permSummary = isSuperAdmin
                  ? "Full access"
                  : permCount === 0
                    ? "No permissions"
                    : `${permCount} permission${permCount !== 1 ? "s" : ""}`

                return (
                  <tr key={role.id} className="hover:bg-subtle/50 transition-colors">
                    {/* Role Name */}
                    <td className={cn("px-5 py-3", isLastRow && "rounded-bl-2xl")}>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{role.label}</span>
                        {role.isSystem && (
                          <span className="rounded-full bg-subtle px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary">
                            System
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-secondary mt-0.5 font-mono">{role.name}</p>
                    </td>

                    {/* Description */}
                    <td className="px-5 py-3 max-w-xs">
                      <p className="text-xs text-secondary line-clamp-2">
                        {role.description}
                      </p>
                    </td>

                    {/* Permissions */}
                    <td className="px-5 py-3">
                      <div
                        className="group relative inline-flex cursor-default items-center gap-1"
                        title={
                          modules.length
                            ? `Modules: ${modules.join(", ")}`
                            : "No permissions assigned"
                        }
                      >
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            isSuperAdmin
                              ? "bg-primary/10 text-primary"
                              : permCount === 0
                                ? "bg-subtle text-secondary"
                                : "bg-subtle text-foreground"
                          )}
                        >
                          {permSummary}
                        </span>
                      </div>
                    </td>

                    {/* Admin Count */}
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "inline-flex size-7 items-center justify-center rounded-full text-xs font-bold",
                          role.adminCount > 0
                            ? "bg-primary/10 text-primary"
                            : "bg-subtle text-secondary"
                        )}
                      >
                        {role.adminCount}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className={cn("px-5 py-3", isLastRow && "rounded-br-2xl")}>
                      <div className="relative inline-block">
                        <button
                          onClick={() => setOpenMenu(openMenu === role.id ? null : role.id)}
                          className="rounded-lg border border-default bg-white p-1.5 text-secondary transition-colors hover:border-primary hover:text-primary"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>

                        {openMenu === role.id && (
                          <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-default bg-white shadow-lg">
                            <Link
                              href={`/admin/roles/${role.id}`}
                              onClick={() => setOpenMenu(null)}
                              className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-subtle transition-colors"
                            >
                              <Pencil className="size-3.5" />
                              Edit
                            </Link>
                            <button
                              onClick={() => {
                                if (!canDelete) return
                                setOpenMenu(null)
                                setConfirmId(role.id)
                              }}
                              disabled={!canDelete}
                              title={deleteTooltip}
                              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ShieldOff className="size-3.5" />
                              Delete
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
