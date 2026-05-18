"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, AlertCircle, CheckCircle2 } from "lucide-react"
import { getDefaultPermissions } from "@/lib/permissions"
import type { AdminRole, PermissionModule, PermissionAction } from "@/types"
import RoboLoader from "@/components/loading/robo-loader"

type Role = { id: string; name: AdminRole; label: string; description: string }
type PermPair = { module: PermissionModule; action: PermissionAction }

const MODULES: PermissionModule[] = ["students", "courses", "curriculum", "tasks"]
const ACTIONS: PermissionAction[] = ["view", "create", "edit", "delete"]

type Props = { params: Promise<{ id: string }> }

export default function EditAdminPage({ params }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [adminId, setAdminId] = useState("")
  const [roles, setRoles] = useState<Role[]>([])
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [selectedRoleId, setSelectedRoleId] = useState("")
  const [selectedRoleName, setSelectedRoleName] = useState<AdminRole | "">("")
  const [status, setStatus] = useState("pending")
  const [permissions, setPermissions] = useState<Set<string>>(new Set())
  const [lastLogin, setLastLogin] = useState<string | null>(null)
  const [isTargetSuperAdmin, setIsTargetSuperAdmin] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { id } = await params
      setAdminId(id)

      const [adminRes, rolesRes] = await Promise.all([
        fetch(`/api/admin/admins/${id}`),
        fetch("/api/admin/admins/roles"),
      ])

      const adminData = await adminRes.json()
      const rolesData = await rolesRes.json()

      const admin = adminData.admin
      const filteredRoles = (rolesData.roles as Role[]).filter(
        (r) => r.name !== "super_admin"
      )

      setRoles(filteredRoles)
      setFullName(admin.fullName)
      setEmail(admin.email)
      setSelectedRoleId(admin.role.id)
      setSelectedRoleName(admin.role.name)
      setStatus(admin.status)
      setLastLogin(admin.lastLogin)
      setIsTargetSuperAdmin(admin.role.name === "super_admin")

      const permSet = new Set<string>(
        (admin.role.permissions as PermPair[]).map(
          (p) => `${p.module}:${p.action}`
        )
      )
      setPermissions(permSet)
      setLoading(false)
    }
    load().catch(console.error)
  }, [params])

  function onRoleChange(roleId: string) {
    const role = roles.find((r) => r.id === roleId)
    if (!role) return
    setSelectedRoleId(roleId)
    setSelectedRoleName(role.name)
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
      if (allSelected) ACTIONS.forEach((a) => next.delete(`${module}:${a}`))
      else ACTIONS.forEach((a) => next.add(`${module}:${a}`))
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/admins/${adminId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName, roleId: selectedRoleId, status }),
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

  if (loading) {
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
          <h2 className="text-lg font-bold text-green-900">Changes saved!</h2>
          <p className="mt-2 text-sm text-secondary">Redirecting…</p>
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Edit Admin</h1>
          <p className="text-sm text-secondary">Update role, status, or name.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="rounded-2xl border border-default bg-white p-6 space-y-5 shadow-sm">
          {/* Read-only last login */}
          {lastLogin && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary mb-1">
                Last Login
              </p>
              <p className="text-sm text-foreground">
                {new Date(lastLogin).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="fullName" className="block text-sm font-semibold mb-1.5">
                Full Name
              </label>
              <input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                minLength={2}
                className="w-full rounded-lg border border-default bg-subtle px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5">Email</label>
              <input
                value={email}
                readOnly
                className="w-full rounded-lg border border-default bg-muted px-3 py-2.5 text-sm text-secondary cursor-not-allowed"
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-semibold mb-1.5">
                Role
              </label>
              <select
                id="role"
                value={selectedRoleId}
                onChange={(e) => onRoleChange(e.target.value)}
                disabled={isTargetSuperAdmin}
                className="w-full rounded-lg border border-default bg-subtle px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted"
              >
                {isTargetSuperAdmin && <option value={selectedRoleId}>Super Admin</option>}
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-semibold mb-1.5">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isTargetSuperAdmin}
                className="w-full rounded-lg border border-default bg-subtle px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Permissions (read-only in edit — driven by role) */}
        {!isTargetSuperAdmin && (
          <div className="rounded-2xl border border-default bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-foreground mb-4">Permissions</h2>
            <div className="space-y-4">
              {MODULES.map((module) => (
                <div key={module} className="rounded-xl border border-default overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-subtle">
                    <span className="text-sm font-bold capitalize text-foreground">{module}</span>
                    <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer select-none">
                      <span>Select all</span>
                      <input
                        type="checkbox"
                        checked={ACTIONS.every((a) => permissions.has(`${module}:${a}`))}
                        onChange={() => toggleModule(module)}
                        className="size-4 rounded border-default text-primary focus:ring-primary"
                      />
                    </label>
                  </div>
                  <div className="flex divide-x divide-default">
                    {ACTIONS.map((action) => {
                      const key = `${module}:${action}`
                      return (
                        <label
                          key={action}
                          className="flex flex-1 flex-col items-center gap-1.5 py-3 cursor-pointer hover:bg-subtle/50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={permissions.has(key)}
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
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle className="size-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending || isTargetSuperAdmin}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition-all min-w-[150px]"
          >
            {isPending ? "Saving…" : "Save Changes"}
          </button>
          <Link href="/admin/admins" className="text-sm text-secondary hover:text-foreground">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
