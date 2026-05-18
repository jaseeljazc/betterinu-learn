"use client"

import { useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ChevronLeft,
  Info,
  Lock,
  ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { AdminRoleRecord, PermissionModule, PermissionAction } from "@/types"
import RoboLoader from "@/components/loading/robo-loader"

const MODULES: PermissionModule[] = [
  "students",
  "courses",
  "curriculum",
  "tasks",
  "admins",
]
const ACTIONS: PermissionAction[] = ["view", "create", "edit", "delete"]

const ACTION_DESC: Record<PermissionAction, string> = {
  view: "Can read and list records",
  create: "Can create new records",
  edit: "Can update existing records",
  delete: "Can permanently remove records",
}

type PermSet = Set<string>

type RoleFormData = {
  name: string
  label: string
  description: string
  permissions: Array<{ module: PermissionModule; action: PermissionAction }>
}

type RoleFormProps = {
  /** Pre-populated when editing an existing role */
  initialData?: AdminRoleRecord
  onSubmit: (data: RoleFormData) => void
  loading: boolean
}

export function RoleForm({ initialData, onSubmit, loading }: RoleFormProps) {
  const isEdit = !!initialData
  const isSuperAdmin = initialData?.name === "super_admin"
  const isSystemRole = initialData?.isSystem === true

  // Seed permissions from initialData (or empty)
  const seedPerms = (): PermSet => {
    if (!initialData) return new Set()
    return new Set(
      initialData.permissions.map((p) => `${p.module}:${p.action}`)
    )
  }

  const [name, setName] = useState(initialData?.name ?? "")
  const [label, setLabel] = useState(initialData?.label ?? "")
  const [description, setDescription] = useState(initialData?.description ?? "")
  const [permissions, setPermissions] = useState<PermSet>(seedPerms)
  const [error, setError] = useState("")

  const metaDisabled = isEdit && isSystemRole  // name/label/desc locked for system roles

  function togglePermission(module: PermissionModule, action: PermissionAction) {
    if (isSuperAdmin) return
    const key = `${module}:${action}`
    setPermissions((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleModule(module: PermissionModule) {
    if (isSuperAdmin) return
    const allOn = ACTIONS.every((a) => permissions.has(`${module}:${a}`))
    setPermissions((prev) => {
      const next = new Set(prev)
      if (allOn) ACTIONS.forEach((a) => next.delete(`${module}:${a}`))
      else ACTIONS.forEach((a) => next.add(`${module}:${a}`))
      return next
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    if (!isSuperAdmin && !name.trim()) {
      setError("Role name is required.")
      return
    }
    if (!label.trim()) {
      setError("Label is required.")
      return
    }
    if (!description.trim() || description.trim().length < 10) {
      setError("Description must be at least 10 characters.")
      return
    }

    const permArray = isSuperAdmin
      ? MODULES.flatMap((m) => ACTIONS.map((a) => ({ module: m, action: a })))
      : Array.from(permissions).map((key) => {
          const [module, action] = key.split(":") as [PermissionModule, PermissionAction]
          return { module, action }
        })

    onSubmit({ name: name.trim(), label: label.trim(), description: description.trim(), permissions: permArray })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {/* Meta fields */}
      <div className="rounded-2xl border border-default bg-white p-6 shadow-sm space-y-5">
        <div>
          <label htmlFor="role-name" className="block text-sm font-semibold mb-1.5">
            Role Name {!isEdit && <span className="text-red-500">*</span>}
            {metaDisabled && <Lock className="ml-1 inline size-3 text-secondary" />}
          </label>
          <input
            id="role-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={metaDisabled}
            required={!isEdit}
            placeholder="e.g. content_manager"
            className={cn(
              "w-full rounded-lg border border-default bg-subtle px-3 py-2.5 text-sm outline-none transition-colors",
              "focus:border-primary focus:ring-2 focus:ring-primary/20",
              metaDisabled && "cursor-not-allowed opacity-60"
            )}
          />
          {!isEdit && (
            <p className="mt-1 text-xs text-secondary">
              Lowercase, no spaces. Use underscores or hyphens.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="role-label" className="block text-sm font-semibold mb-1.5">
            Display Label <span className="text-red-500">*</span>
            {metaDisabled && <Lock className="ml-1 inline size-3 text-secondary" />}
          </label>
          <input
            id="role-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={metaDisabled}
            required
            placeholder="e.g. Content Manager"
            className={cn(
              "w-full rounded-lg border border-default bg-subtle px-3 py-2.5 text-sm outline-none transition-colors",
              "focus:border-primary focus:ring-2 focus:ring-primary/20",
              metaDisabled && "cursor-not-allowed opacity-60"
            )}
          />
        </div>

        <div>
          <label htmlFor="role-description" className="block text-sm font-semibold mb-1.5">
            Description <span className="text-red-500">*</span>
            {metaDisabled && <Lock className="ml-1 inline size-3 text-secondary" />}
          </label>
          <textarea
            id="role-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={metaDisabled}
            required
            rows={3}
            placeholder="Explain what this role can do — shown in the Add Admin form."
            className={cn(
              "w-full resize-none rounded-lg border border-default bg-subtle px-3 py-2.5 text-sm outline-none transition-colors",
              "focus:border-primary focus:ring-2 focus:ring-primary/20",
              metaDisabled && "cursor-not-allowed opacity-60"
            )}
          />
        </div>
      </div>

      {/* Permissions */}
      <div className="rounded-2xl border border-default bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-base font-bold text-foreground">Permissions</h2>
          <Info className="size-3.5 text-secondary" />
        </div>

        {isSuperAdmin ? (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-default bg-subtle p-4">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">Unrestricted access</p>
              <p className="text-xs text-secondary mt-0.5">
                Super Admin has unrestricted access to everything. Permissions cannot be
                configured for this role.
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs text-secondary mb-5">
              Select which actions this role can perform per module.
            </p>
            <div className="space-y-4">
              {MODULES.map((module) => {
                const allOn = ACTIONS.every((a) => permissions.has(`${module}:${a}`))
                return (
                  <div key={module} className="overflow-hidden rounded-xl border border-default">
                    {/* Module header */}
                    <div className="flex items-center justify-between bg-subtle px-4 py-3">
                      <span className="text-sm font-bold capitalize text-foreground">{module}</span>
                      <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-secondary">
                        <span>All</span>
                        <input
                          type="checkbox"
                          checked={allOn}
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
                            title={ACTION_DESC[action]}
                            className="flex flex-1 cursor-pointer flex-col items-center gap-1.5 py-3 transition-colors hover:bg-subtle/50"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePermission(module, action)}
                              className="size-4 rounded border-default text-primary focus:ring-primary"
                            />
                            <span className="text-xs capitalize text-secondary">
                              {action}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle className="size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3 pb-6">
        <button
          type="submit"
          disabled={loading || isSuperAdmin}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 transition-all min-w-[150px]"
        >
          {loading ? "Saving…" : "Save Role"}
        </button>
        <Link href="/admin/roles" className="text-sm text-secondary hover:text-foreground">
          Cancel
        </Link>
      </div>
    </form>
  )
}

type RoleFormPageProps = {
  pageTitle: string
  pageSubtitle: string
  initialData?: AdminRoleRecord
  onSubmit: (data: RoleFormData) => void
  loading: boolean
}

export function RoleFormPage({
  pageTitle,
  pageSubtitle,
  initialData,
  onSubmit,
  loading,
}: RoleFormPageProps) {
  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin/roles"
          className="rounded-lg border border-default p-2 hover:bg-subtle transition-colors"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{pageTitle}</h1>
          <p className="text-sm text-secondary">{pageSubtitle}</p>
        </div>
      </div>
      <RoleForm initialData={initialData} onSubmit={onSubmit} loading={loading} />
    </div>
  )
}
