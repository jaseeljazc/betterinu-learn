"use client"

import { useState, useMemo } from "react"
import {
  AlertCircle,
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
  User,
  Mail,
  Check,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AdminRole, PermissionModule, PermissionAction } from "@/types"

/* ------------------------------------------------------------------ */
/*  Constants                                                            */
/* ------------------------------------------------------------------ */

const MODULES: { key: PermissionModule; label: string; icon: React.ElementType }[] = [
  { key: "students",   label: "Students",   icon: Users },
  { key: "courses",    label: "Courses",    icon: BookOpen },
  { key: "curriculum", label: "Curriculum", icon: LayoutGrid },
  { key: "tasks",      label: "Tasks",      icon: CheckSquare },
  { key: "tasks_mgmt", label: "Task Mgmt",  icon: CheckSquare },
  { key: "admins",     label: "Admins",     icon: ShieldAlert },
  { key: "accounts",   label: "Accounts",   icon: Wallet },
  { key: "employees",  label: "Employees",  icon: UserCog },
  { key: "payroll",    label: "Payroll",    icon: Receipt },
  { key: "attendance", label: "Attendance", icon: CalendarCheck },
]

const ACTIONS: PermissionAction[] = ["view", "create", "edit", "delete"]

const ACTION_DESC: Partial<Record<PermissionAction, string>> = {
  view:   "Can read and list records",
  create: "Can create new records",
  edit:   "Can update existing records",
  delete: "Can permanently remove records",
}

const STATUS_OPTIONS_CREATE = [
  { value: "pending", label: "Pending" },
  { value: "active",  label: "Active" },
]

const STATUS_OPTIONS_EDIT = [
  { value: "active",   label: "Active" },
  { value: "pending",  label: "Pending" },
  { value: "inactive", label: "Inactive" },
]

/* ------------------------------------------------------------------ */
/*  Types                                                                */
/* ------------------------------------------------------------------ */

type PermSet = Set<string>

export type AdminFormRole = {
  id: string
  name: AdminRole
  label: string
  description: string
  permissions: Array<{ module: PermissionModule; action: PermissionAction }>
}

export type AdminFormData = {
  fullName: string
  email: string
  /** Array of role IDs to assign (multi-role). */
  roleIds: string[]
  status: string
}

/** Shape of an existing admin passed as initialData for edit mode. */
export type AdminFormInitialData = {
  id: string
  fullName: string
  email: string
  status: "active" | "inactive" | "pending"
  /** All role names currently held (for super_admin guard). */
  roleNames: AdminRole[]
  /** All role IDs currently held. */
  roleIds: string[]
}

type AdminFormProps = {
  /** Present in edit mode; absent for create. */
  initialData?: AdminFormInitialData
  /** Pre-loaded role list (excludes super_admin). */
  roles: AdminFormRole[]
  onSubmit: (data: AdminFormData) => void
  onCancel: () => void
  loading: boolean
}

/* ------------------------------------------------------------------ */
/*  Component                                                            */
/* ------------------------------------------------------------------ */

export function AdminForm({
  initialData,
  roles,
  onSubmit,
  onCancel,
  loading,
}: AdminFormProps) {
  const isEdit       = !!initialData
  const isSuperAdmin = initialData?.roleNames.includes("super_admin") ?? false

  /* ---------- form state ---------- */
  const [fullName,  setFullName]  = useState(initialData?.fullName ?? "")
  const [email,     setEmail]     = useState(initialData?.email    ?? "")
  const [selectedIds, setSelectedIds] = useState<string[]>(initialData?.roleIds ?? [])
  const [status,    setStatus]    = useState<string>(initialData?.status ?? "pending")
  const [error,     setError]     = useState("")

  /* ---------- toggle a role in/out ---------- */
  function toggleRole(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  /* ---------- selected role objects ---------- */
  const selectedRoles = useMemo(
    () => roles.filter((r) => selectedIds.includes(r.id)),
    [roles, selectedIds]
  )

  /* ---------- union of permissions from all selected roles ---------- */
  const rolePermissions = useMemo<PermSet>(() => {
    const s = new Set<string>()
    for (const role of selectedRoles) {
      for (const p of role.permissions) {
        s.add(`${p.module}:${p.action}`)
      }
    }
    return s
  }, [selectedRoles])

  /* ---------- hasChanges (disable Save if nothing changed in edit mode) ---------- */
  const initialRoleIds = initialData?.roleIds ?? []
  const initialStatus  = initialData?.status   ?? "pending"
  const initialName    = initialData?.fullName ?? ""

  const rolesChanged =
    selectedIds.length !== initialRoleIds.length ||
    [...selectedIds].sort().join(",") !== [...initialRoleIds].sort().join(",")

  const hasChanges =
    !isEdit ||
    fullName !== initialName ||
    rolesChanged ||
    status   !== initialStatus

  /* ---------- submit ---------- */
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError("Full name must be at least 2 characters.")
      return
    }
    if (!isEdit) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!email.trim() || !emailRegex.test(email.trim())) {
        setError("A valid email address is required.")
        return
      }
    }
    if (selectedIds.length === 0) {
      setError("Please select at least one role.")
      return
    }

    onSubmit({ fullName: fullName.trim(), email: email.trim().toLowerCase(), roleIds: selectedIds, status })
  }

  /* ---------- render ---------- */
  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1.5 pb-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-foreground/10 hover:[&::-webkit-scrollbar-thumb]:bg-foreground/20 [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.1)_transparent]">

          {/* ── Account Details ── */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Account Details</CardTitle>
              <CardDescription className="text-xs">
                {isEdit ? "Update this admin's name, roles, and status." : "Enter the new admin's information. A temporary password will be emailed to them."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Full Name */}
              <div className="space-y-1.5">
                <Label htmlFor="admin-full-name" className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <User className="size-3 text-muted-foreground" />
                  Full Name <span className="text-destructive">*</span>
                  {isSuperAdmin && <Lock className="size-3 text-muted-foreground" />}
                </Label>
                <Input
                  id="admin-full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isSuperAdmin}
                  placeholder="e.g. Sara Ahmed"
                  className="text-sm"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="admin-email" className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Mail className="size-3 text-muted-foreground" />
                  Email Address {!isEdit && <span className="text-destructive">*</span>}
                  {isEdit && <Lock className="size-3 text-muted-foreground" />}
                </Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isEdit || isSuperAdmin}
                  placeholder="sara@betterinu.com"
                  className="text-sm"
                />
                {isEdit && (
                  <p className="text-[11px] text-muted-foreground">Email cannot be changed after account creation.</p>
                )}
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label htmlFor="admin-status" className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  Status
                  {isSuperAdmin && <Lock className="size-3 text-muted-foreground" />}
                </Label>
                <Select value={status} onValueChange={setStatus} disabled={isSuperAdmin}>
                  <SelectTrigger id="admin-status" className="text-sm h-9 w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(isEdit ? STATUS_OPTIONS_EDIT : STATUS_OPTIONS_CREATE).map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

          {/* ── Role Assignment (multi-select) ── */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Roles</CardTitle>
                {isSuperAdmin && <Lock className="size-3.5 text-muted-foreground" />}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-56 text-xs">
                    You can assign multiple roles. The user will receive the combined permissions of all selected roles.
                  </TooltipContent>
                </Tooltip>
              </div>
              <CardDescription className="text-xs">
                {isSuperAdmin
                  ? "Super Admin has unrestricted access and cannot be changed."
                  : "Select one or more roles. Permissions are the union of all selected roles."}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isSuperAdmin ? (
                <div className="m-4 flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Unrestricted access</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Super Admin has unrestricted access to everything.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y">
                  {roles.map((role) => {
                    const isChecked = selectedIds.includes(role.id)
                    return (
                      <label
                        key={role.id}
                        htmlFor={`role-${role.id}`}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors",
                          isChecked ? "bg-primary/5" : "hover:bg-muted/40"
                        )}
                      >
                        <Checkbox
                          id={`role-${role.id}`}
                          checked={isChecked}
                          onCheckedChange={() => toggleRole(role.id)}
                          className="mt-0.5 size-4"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn("text-sm font-semibold", isChecked && "text-primary")}>
                              {role.label}
                            </span>
                            {isChecked && (
                              <Check className="size-3 text-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {role.description}
                          </p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Permissions (read-only — union of selected roles) ── */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Permissions</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-56 text-xs">
                    Permissions are the union of all selected roles and cannot be overridden per admin.
                  </TooltipContent>
                </Tooltip>
              </div>
              <CardDescription className="text-xs">
                {selectedRoles.length > 1
                  ? `Combined permissions from ${selectedRoles.length} selected roles.`
                  : "Permissions granted by the selected role. To change, edit the role directly."}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isSuperAdmin ? (
                <div className="m-4 flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Unrestricted access</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Super Admin has unrestricted access to everything.
                    </p>
                  </div>
                </div>
              ) : selectedIds.length === 0 ? (
                <div className="m-4 flex items-start gap-3 rounded-lg border border-dashed p-4">
                  <Info className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Select at least one role above to see permissions.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b bg-subtle">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-[180px] border-r border-border">
                          Module
                        </th>
                        {ACTIONS.map((action) => (
                          <th key={action} className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground border-r border-border">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={cn(
                                  "capitalize cursor-help",
                                  action === "delete" && "text-destructive/70"
                                )}>
                                  {action}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">{ACTION_DESC[action]}</TooltipContent>
                            </Tooltip>
                          </th>
                        ))}
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground border-r border-border">
                          Other
                        </th>
                        <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground w-16">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {MODULES.map(({ key: module, label: moduleLabel, icon: Icon }, idx) => {
                        const count = ACTIONS.filter((a) => rolePermissions.has(`${module}:${a}`)).length
                        const otherPerms = Array.from(rolePermissions)
                          .filter((p) => p.startsWith(`${module}:`))
                          .map((p) => p.split(":")[1])
                          .filter((action) => !ACTIONS.includes(action as PermissionAction))
                        return (
                          <tr
                            key={module}
                            className={cn(
                              "transition-colors",
                              idx % 2 === 0 ? "bg-background" : "bg-muted/10"
                            )}
                          >
                            <td className="px-4 py-3 border-r border-border">
                              <div className="flex items-center gap-2.5">
                                <Icon className="size-3.5 text-muted-foreground shrink-0" />
                                <span className="font-medium text-sm capitalize">{moduleLabel}</span>
                              </div>
                            </td>
                            {ACTIONS.map((action) => {
                              const checked = rolePermissions.has(`${module}:${action}`)
                              return (
                                <td key={action} className="text-center px-3 py-3 border-r border-border">
                                  <div className="flex justify-center">
                                    <Checkbox
                                      checked={checked}
                                      disabled
                                      className={cn(
                                        "size-4 opacity-100",
                                        action === "delete" && checked &&
                                        "data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                                      )}
                                    />
                                  </div>
                                </td>
                              )
                            })}
                            <td className="px-4 py-3 border-r border-border align-middle">
                              <div className="flex flex-wrap gap-1">
                                {otherPerms.map((action) => (
                                  <Badge key={action} variant="outline" className="text-[9px] uppercase px-1.5 py-0 leading-tight">
                                    {action.replace(/_/g, " ")}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                            <td className="text-center px-3 py-3">
                              <div className="flex justify-center">
                                <Badge
                                  variant={count === 4 ? "default" : "outline"}
                                  className="text-[10px] tabular-nums px-1.5 py-0.5 min-w-[28px] justify-center"
                                >
                                  {Array.from(rolePermissions).filter((p) => p.startsWith(`${module}:`)).length}
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

        {/* ── Sticky Footer ── */}
        <div className="border-t pt-4 mt-4 gap-3 bg-elevated flex flex-col sm:flex-row sm:items-center sm:justify-between shrink-0">
          <p className="text-xs text-muted-foreground font-medium">
            {isSuperAdmin
              ? "Super Admin cannot be edited."
              : selectedIds.length === 0
              ? "Select roles to see permission count."
              : `${rolePermissions.size} permissions across ${selectedRoles.length} role${selectedRoles.length !== 1 ? "s" : ""}.`}
          </p>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1 sm:flex-initial sm:w-28 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || isSuperAdmin || !hasChanges}
              className="flex-1 sm:flex-initial sm:w-36 cursor-pointer"
            >
              {loading ? "Saving…" : isEdit ? "Save Changes" : "Create Admin"}
            </Button>
          </div>
        </div>
      </form>
    </TooltipProvider>
  )
}
