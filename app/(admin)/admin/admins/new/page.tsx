"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, AlertCircle, CheckCircle2, Info } from "lucide-react"
import { getDefaultPermissions } from "@/lib/permissions"
import type { AdminRole, PermissionModule, PermissionAction } from "@/types"
import RoboLoader from "@/components/loading/robo-loader"

type Role = { id: string; name: AdminRole; label: string; description: string }
type PermPair = { module: PermissionModule; action: PermissionAction }

const MODULES: PermissionModule[] = ["students", "courses", "curriculum", "tasks"]
const ACTIONS: PermissionAction[] = ["view", "create", "edit", "delete"]

const ROLE_COLORS: Record<string, string> = {
  admin: "text-blue-700",
  instructor: "text-purple-700",
  support: "text-secondary",
}

export default function NewAdminPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [roles, setRoles] = useState<Role[]>([])
  const [loadingRoles, setLoadingRoles] = useState(true)
  const [selectedRoleId, setSelectedRoleId] = useState("")
  const [selectedRoleName, setSelectedRoleName] = useState<AdminRole | "">("")
  const [permissions, setPermissions] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState("pending")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    fetch("/api/admin/roles")
      .then((r) => r.json())
      .then((d) => {
        // Filter out super_admin — cannot be assigned via this form
        const filtered = (d.roles as Role[]).filter((r) => r.name !== "super_admin")
        setRoles(filtered)
        setLoadingRoles(false)
      })
      .catch((e) => {
        console.error(e)
        setLoadingRoles(false)
      })
  }, [])

  function onRoleChange(roleId: string) {
    const role = roles.find((r) => r.id === roleId)
    if (!role) return
    setSelectedRoleId(roleId)
    setSelectedRoleName(role.name)

    // Auto-populate permissions from defaults
    const defaults = getDefaultPermissions(role.name)
    setPermissions(new Set(defaults.map((p) => `${p.module}:${p.action}`)))
  }

  function togglePermission(module: PermissionModule, action: PermissionAction) {
    const key = `${module}:${action}`
    setPermissions((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleModule(module: PermissionModule) {
    const allSelected = ACTIONS.every((a) => permissions.has(`${module}:${a}`))
    setPermissions((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        ACTIONS.forEach((a) => next.delete(`${module}:${a}`))
      } else {
        ACTIONS.forEach((a) => next.add(`${module}:${a}`))
      }
      return next
    })
  }

  function isModuleAllSelected(module: PermissionModule) {
    return ACTIONS.every((a) => permissions.has(`${module}:${a}`))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    const fd = new FormData(e.currentTarget)
    const fullName = fd.get("fullName")?.toString().trim() ?? ""
    const email = fd.get("email")?.toString().trim().toLowerCase() ?? ""

    if (!selectedRoleId) {
      setError("Please select a role.")
      return
    }

    const permArray: PermPair[] = Array.from(permissions).map((key) => {
      const [module, action] = key.split(":") as [PermissionModule, PermissionAction]
      return { module, action }
    })

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/admins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName, email, roleId: selectedRoleId, status, permissions: permArray }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error ?? "Something went wrong.")
          return
        }
        setSuccess(true)
        setTimeout(() => router.push("/admin/admins"), 1500)
      } catch {
        setError("Network error. Please try again.")
      }
    })
  }

  if (loadingRoles) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center">
        <RoboLoader />
      </div>
    )
  }

  if (success) {
    return (
      <div className="p-8 max-w-md">
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <CheckCircle2 className="mx-auto mb-3 size-10 text-green-600" />
          <h2 className="text-lg font-bold text-green-900">Admin account created!</h2>
          <p className="mt-2 text-sm text-secondary">
            Login credentials have been sent to their email. Redirecting…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/admins" className="rounded-lg border border-default p-2 hover:bg-subtle">
          <ChevronLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Add New Admin</h1>
          <p className="text-sm text-secondary">A temporary password will be emailed to the new admin.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Basic info */}
        <div className="rounded-2xl border border-default bg-white p-6 space-y-5 shadow-sm">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="fullName" className="block text-sm font-semibold mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                minLength={2}
                placeholder="e.g. Sara Ahmed"
                className="w-full rounded-lg border border-default bg-subtle px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="sara@betterinu.com"
                className="w-full rounded-lg border border-default bg-subtle px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-semibold mb-1.5">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                value={selectedRoleId}
                onChange={(e) => onRoleChange(e.target.value)}
                required
                className="w-full rounded-lg border border-default bg-subtle px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">-- Select role --</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
              </select>
              {selectedRoleName && (
                <p className={`mt-1.5 text-xs ${ROLE_COLORS[selectedRoleName] ?? "text-secondary"}`}>
                  {roles.find((r) => r.name === selectedRoleName)?.description}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-semibold mb-1.5">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-default bg-subtle px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
              </select>
            </div>
          </div>
        </div>

        {/* Permissions */}
        <div className="rounded-2xl border border-default bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-bold text-foreground">Permissions</h2>
            <Info className="size-3.5 text-secondary" />
          </div>
          <p className="text-xs text-secondary mb-5">
            Auto-populated from the selected role. You can override per-module below.
          </p>

          <div className="space-y-4">
            {MODULES.map((module) => (
              <div key={module} className="rounded-xl border border-default overflow-hidden">
                {/* Module header */}
                <div className="flex items-center justify-between px-4 py-3 bg-subtle">
                  <span className="text-sm font-bold capitalize text-foreground">{module}</span>
                  <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer select-none">
                    <span>Select all</span>
                    <input
                      type="checkbox"
                      checked={isModuleAllSelected(module)}
                      onChange={() => toggleModule(module)}
                      className="size-4 rounded border-default text-primary focus:ring-primary"
                    />
                  </label>
                </div>
                {/* Actions */}
                <div className="flex divide-x divide-default">
                  {ACTIONS.map((action) => {
                    const key = `${module}:${action}`
                    const checked = permissions.has(key)
                    return (
                      <label
                        key={action}
                        className="flex flex-1 flex-col items-center gap-1.5 py-3 cursor-pointer hover:bg-subtle/50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(module, action)}
                          className="size-4 rounded border-default text-primary focus:ring-primary"
                        />
                        <span className="text-xs capitalize text-secondary">{action}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle className="size-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition-all min-w-[180px]"
          >
            {isPending ? "Creating…" : "Create Admin Account"}
          </button>
          <Link href="/admin/admins" className="text-sm text-secondary hover:text-foreground">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
