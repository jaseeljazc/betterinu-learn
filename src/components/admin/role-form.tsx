"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ChevronLeft,
  Info,
  Lock,
  ShieldCheck,
  Users,
  BookOpen,
  LayoutGrid,
  CheckSquare,
  ShieldAlert,
  Wallet,
  UserCog,
  Receipt,
  CalendarCheck,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import type { AdminRoleRecord, PermissionModule, PermissionAction } from "@/types"

const MODULES: { key: PermissionModule; label: string; icon: React.ElementType }[] = [
  { key: "students",   label: "Students",   icon: Users },
  { key: "courses",    label: "Courses",    icon: BookOpen },
  { key: "curriculum", label: "Curriculum", icon: LayoutGrid },
  { key: "tasks",      label: "Tasks",      icon: CheckSquare },
  { key: "admins",     label: "Admins",     icon: ShieldAlert },
  { key: "accounts",   label: "Accounts",   icon: Wallet },
  { key: "employees",  label: "Employees",  icon: UserCog },
  { key: "payroll",    label: "Payroll",    icon: Receipt },
  { key: "attendance", label: "Attendance", icon: CalendarCheck },
]

const ACTIONS: PermissionAction[] = ["view", "create", "edit", "delete"]

const ACTION_DESC: Record<PermissionAction, string> = {
  view:   "Can read and list records",
  create: "Can create new records",
  edit:   "Can update existing records",
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
  initialData?: AdminRoleRecord
  onSubmit: (data: RoleFormData) => void
  onCancel?: () => void
  loading: boolean
}

export function RoleForm({ initialData, onSubmit, onCancel, loading }: RoleFormProps) {
  const isEdit        = !!initialData
  const isSuperAdmin  = initialData?.name === "super_admin"

  const seedPerms = (): PermSet => {
    if (!initialData) return new Set()
    return new Set(initialData.permissions.map((p) => `${p.module}:${p.action}`))
  }

  const [name,        setName]        = useState(initialData?.name        ?? "")
  const [label,       setLabel]       = useState(initialData?.label       ?? "")
  const [description, setDescription] = useState(initialData?.description ?? "")
  const [permissions, setPermissions] = useState<PermSet>(seedPerms)
  const [error,       setError]       = useState("")

  const initialName = initialData?.name ?? ""
  const initialLabel = initialData?.label ?? ""
  const initialDescription = initialData?.description ?? ""
  const initialPermsSorted = useMemo(() => {
    if (!initialData) return ""
    const unique = Array.from(new Set(initialData.permissions.map((p) => `${p.module}:${p.action}`)))
    return unique.sort().join(",")
  }, [initialData])

  const currentPermsSorted = useMemo(() => {
    return Array.from(permissions).sort().join(",")
  }, [permissions])

  const hasChanges =
    !isEdit ||
    name !== initialName ||
    label !== initialLabel ||
    description !== initialDescription ||
    currentPermsSorted !== initialPermsSorted



  const metaDisabled  = isSuperAdmin
  const totalPerms    = MODULES.length * ACTIONS.length
  const selectedCount = isSuperAdmin ? totalPerms : permissions.size

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
      else       ACTIONS.forEach((a) => next.add(`${module}:${a}`))
      return next
    })
  }

  function toggleAction(action: PermissionAction) {
    if (isSuperAdmin) return
    const allOn = MODULES.every((m) => permissions.has(`${m.key}:${action}`))
    setPermissions((prev) => {
      const next = new Set(prev)
      if (allOn) MODULES.forEach((m) => next.delete(`${m.key}:${action}`))
      else       MODULES.forEach((m) => next.add(`${m.key}:${action}`))
      return next
    })
  }

  function toggleAll() {
    if (isSuperAdmin) return
    const allOn = permissions.size === totalPerms
    setPermissions(() => {
      if (allOn) return new Set()
      const next = new Set<string>()
      MODULES.forEach((m) => ACTIONS.forEach((a) => next.add(`${m.key}:${a}`)))
      return next
    })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    if (!isSuperAdmin && !name.trim())                    { setError("Role name is required.");                        return }
    if (!label.trim())                                    { setError("Label is required.");                            return }
    if (!description.trim() || description.trim().length < 10) { setError("Description must be at least 10 characters."); return }

    const permArray = isSuperAdmin
      ? MODULES.flatMap((m) => ACTIONS.map((a) => ({ module: m.key, action: a })))
      : Array.from(permissions).map((key) => {
          const [module, action] = key.split(":") as [PermissionModule, PermissionAction]
          return { module, action }
        })

    onSubmit({ name: name.trim(), label: label.trim(), description: description.trim(), permissions: permArray })
  }

  const moduleSelectedCount = (module: PermissionModule) =>
    isSuperAdmin ? 4 : ACTIONS.filter((a) => permissions.has(`${module}:${a}`)).length

  const getModuleBadgeVariant = (module: PermissionModule) => {
    const count = moduleSelectedCount(module)
    if (count === 4) return "default"
    if (count === 0) return "outline"
    return "outline"
  }

  const slugPreview = name.toLowerCase().replace(/[^a-z0-9_-]/g, "_").replace(/_+/g, "_")

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1.5 pb-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-foreground/10 hover:[&::-webkit-scrollbar-thumb]:bg-foreground/20 [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.1)_transparent]">

          {/* ── Top: Metadata ── */}
          <div className="w-full">
            <Card className="overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Role Details</CardTitle>
                <CardDescription className="text-xs">
                  Define the identity of this role.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Role Name */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="role-name" className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                      Role Name {!isEdit && <span className="text-destructive">*</span>}
                      {(isEdit || metaDisabled) && <Lock className="size-3 text-muted-foreground" />}
                    </Label>
                    {!isEdit && name && (
                      <Badge variant="outline" className="font-mono text-[9px] py-0 px-1.5 h-4">
                        {slugPreview}
                      </Badge>
                    )}
                  </div>
                  <Input
                    id="role-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isEdit || metaDisabled}
                    placeholder="e.g. content_manager"
                    className="text-sm"
                  />
                  {!isEdit && (
                    <p className="text-[11px] text-muted-foreground">
                      Lowercase, no spaces. Use underscores or hyphens.
                    </p>
                  )}
                </div>

                {/* Display Label */}
                <div className="space-y-1.5">
                  <Label htmlFor="role-label" className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    Display Label <span className="text-destructive">*</span>
                    {metaDisabled && <Lock className="size-3 text-muted-foreground" />}
                  </Label>
                  <Input
                    id="role-label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    disabled={metaDisabled}
                    placeholder="e.g. Content Manager"
                    className="text-sm"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="role-description" className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    Description <span className="text-destructive">*</span>
                    {metaDisabled && <Lock className="size-3 text-muted-foreground" />}
                  </Label>
                  <Textarea
                    id="role-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={metaDisabled}
                    rows={3}
                    placeholder="Explain what this role can do — shown in the Add Admin form."
                    className="text-sm resize-none"
                  />
                </div>



                {/* Error */}
                {error && (
                  <Alert variant="destructive" className="py-3">
                    <AlertCircle className="size-4" />
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Bottom: Permissions Table ── */}
          <div className="w-full">
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Permissions</CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="size-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-56 text-xs">
                      Select which actions this role can perform per module. Changes take effect immediately after saving.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <CardDescription className="text-xs">
                  Select which actions this role can perform per module.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-0">
                {isSuperAdmin ? (
                  <div className="m-4 flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
                    <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-semibold">Unrestricted access</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Super Admin has unrestricted access to everything. Permissions cannot be configured for this role.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b bg-subtle">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-[180px] border-r border-border">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={permissions.size === totalPerms}
                                onCheckedChange={toggleAll}
                                className="size-3.5"
                              />
                              <span>Module</span>
                            </div>
                          </th>
                          {ACTIONS.map((action) => {
                            const allOn = MODULES.every((m) => permissions.has(`${m.key}:${action}`))
                            return (
                              <th key={action} className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground border-r border-border">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="flex flex-col items-center gap-1.5 cursor-pointer select-none group"
                                      onClick={() => toggleAction(action)}
                                    >
                                      <Checkbox
                                        checked={allOn}
                                        onCheckedChange={() => toggleAction(action)}
                                        className={cn(
                                          "size-3.5 pointer-events-none",
                                          action === "delete" && "data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                                        )}
                                      />
                                      <span className={cn(
                                        "capitalize group-hover:text-foreground transition-colors",
                                        action === "delete" && "text-destructive/70"
                                      )}>
                                        {action}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">{ACTION_DESC[action]}</TooltipContent>
                                </Tooltip>
                              </th>
                            )
                          })}
                          <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground w-16">
                            Selected
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {MODULES.map(({ key: module, label: moduleLabel, icon: Icon }, idx) => {
                          const allOn = ACTIONS.every((a) => permissions.has(`${module}:${a}`))
                          const count = moduleSelectedCount(module)
                          return (
                            <tr
                              key={module}
                              className={cn(
                                "group transition-colors hover:bg-muted/30",
                                idx % 2 === 0 ? "bg-background" : "bg-muted/10"
                              )}
                            >
                              <td className="px-4 py-3 border-r border-border">
                                <div className="flex items-center gap-2.5">
                                  <Checkbox
                                    checked={allOn}
                                    onCheckedChange={() => toggleModule(module)}
                                    className="size-3.5 shrink-0"
                                  />
                                  <Icon className="size-3.5 text-muted-foreground shrink-0" />
                                  <span className="font-medium text-sm capitalize">{moduleLabel}</span>
                                </div>
                              </td>
                              {ACTIONS.map((action) => {
                                const key     = `${module}:${action}`
                                const checked = permissions.has(key)
                                return (
                                  <td key={action} className="text-center px-3 py-3 border-r border-border">
                                    <div className="flex justify-center">
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={() => togglePermission(module, action)}
                                        className={cn(
                                          "size-4",
                                          action === "delete" && checked && "data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                                        )}
                                      />
                                    </div>
                                  </td>
                                )
                              })}
                              <td className="text-center px-3 py-3">
                                <div className="flex justify-center">
                                  <Badge
                                    variant={getModuleBadgeVariant(module)}
                                    className="text-[10px] tabular-nums px-1.5  py-0.5 min-w-[28px] justify-center"
                                  >
                                    {count}/4
                                  </Badge>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>

        {/* Unified Sticky/Fixed Action Footer */}
        <div className="border-t pt-4 mt-4 gap-3 bg-elevated flex flex-col sm:flex-row sm:items-center sm:justify-between shrink-0">
          <p className="text-xs text-muted-foreground font-medium">
            {selectedCount} of {totalPerms} permissions selected across {MODULES.length} modules.
          </p>
          <div className="flex gap-3 w-full sm:w-auto">
            {onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1 sm:flex-initial sm:w-28 cursor-pointer">
                Cancel
              </Button>
            ) : (
              <Button variant="outline" asChild className="flex-1 sm:flex-initial sm:w-28 cursor-pointer">
                <Link href="/admin/roles">Cancel</Link>
              </Button>
            )}
            <Button
              type="submit"
              disabled={loading || isSuperAdmin || !hasChanges}
              className="flex-1 sm:flex-initial sm:w-36 cursor-pointer"
            >
              {loading ? "Saving…" : isEdit ? "Save Changes" : "Create Role"}
            </Button>
          </div>
        </div>
      </form>
    </TooltipProvider>
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
    <div className="min-h-screen bg-subtle px-6 lg:px-10 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/roles">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{pageTitle}</h1>
            <p className="text-sm text-secondary">{pageSubtitle}</p>
          </div>
        </div>
        <RoleForm initialData={initialData} onSubmit={onSubmit} loading={loading} />
      </div>
    </div>
  )
}
