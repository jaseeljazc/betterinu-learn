"use client"

import { useState, useMemo, useEffect } from "react"
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
  roleId: string
  status: string
}

/** Shape of an existing admin passed as initialData for edit mode. */
export type AdminFormInitialData = {
  id: string
  fullName: string
  email: string
  status: "active" | "inactive" | "pending"
  roleName: AdminRole
  roleId: string
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
  const isSuperAdmin = initialData?.roleName === "super_admin"

  /* ---------- form state ---------- */
  const [fullName, setFullName]         = useState(initialData?.fullName ?? "")
  const [email,    setEmail]            = useState(initialData?.email    ?? "")
  const [roleId,   setRoleId]           = useState(initialData?.roleId   ?? "")
  const [status,   setStatus]           = useState<string>(initialData?.status   ?? "pending")
  const [error,    setError]            = useState("")

  /* ---------- derived: selected role object ---------- */
  const selectedRole = useMemo(
    () => roles.find((r) => r.id === roleId) ?? null,
    [roles, roleId]
  )

  /* ---------- permission display (read-only, driven by role) ---------- */
  const rolePermissions = useMemo<PermSet>(() => {
    if (!selectedRole) return new Set()
    return new Set(selectedRole.permissions.map((p) => `${p.module}:${p.action}`))
  }, [selectedRole])

  /* ---------- hasChanges (edit mode: disable Save if nothing changed) ---------- */
  const initialRoleId = initialData?.roleId   ?? ""
  const initialStatus = initialData?.status   ?? "pending"
  const initialName   = initialData?.fullName ?? ""

  const hasChanges =
    !isEdit ||
    fullName !== initialName ||
    roleId   !== initialRoleId ||
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
    if (!roleId) {
      setError("Please select a role.")
      return
    }

    onSubmit({ fullName: fullName.trim(), email: email.trim().toLowerCase(), roleId, status })
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
                {isEdit ? "Update this admin's name, role, and status." : "Enter the new admin's information. A temporary password will be emailed to them."}
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

              {/* Role + Status side by side */}
              <div className="grid grid-cols-2 gap-4">
                {/* Role */}
                <div className="space-y-1.5">
                  <Label htmlFor="admin-role" className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    Role <span className="text-destructive">*</span>
                    {isSuperAdmin && <Lock className="size-3 text-muted-foreground" />}
                  </Label>
                  {isSuperAdmin ? (
                    <Input
                      value="Super Admin"
                      disabled
                      className="text-sm"
                    />
                  ) : (
                    <Select
                      value={roleId}
                      onValueChange={setRoleId}
                      disabled={isSuperAdmin}
                    >
                      <SelectTrigger id="admin-role" className="text-sm h-9">
                        <SelectValue placeholder="Select a role…" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {selectedRole && !isSuperAdmin && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {selectedRole.description}
                    </p>
                  )}
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <Label htmlFor="admin-status" className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    Status
                    {isSuperAdmin && <Lock className="size-3 text-muted-foreground" />}
                  </Label>
                  <Select value={status} onValueChange={setStatus} disabled={isSuperAdmin}>
                    <SelectTrigger id="admin-status" className="text-sm h-9">
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

          {/* ── Permissions (read-only — driven by role) ── */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Permissions</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-56 text-xs">
                    Permissions are inherited from the selected role and cannot be overridden per admin.
                  </TooltipContent>
                </Tooltip>
              </div>
              <CardDescription className="text-xs">
                Permissions granted by the selected role. To change, edit the role directly.
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
              ) : !selectedRole ? (
                <div className="m-4 flex items-start gap-3 rounded-lg border border-dashed p-4">
                  <Info className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Select a role above to see its permissions.</p>
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
                        <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground w-16">
                          Selected
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {MODULES.map(({ key: module, label: moduleLabel, icon: Icon }, idx) => {
                        const count = ACTIONS.filter((a) => rolePermissions.has(`${module}:${a}`)).length
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
                            <td className="text-center px-3 py-3">
                              <div className="flex justify-center">
                                <Badge
                                  variant={count === 4 ? "default" : "outline"}
                                  className="text-[10px] tabular-nums px-1.5 py-0.5 min-w-[28px] justify-center"
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

        {/* ── Sticky Footer ── */}
        <div className="border-t pt-4 mt-4 gap-3 bg-elevated flex flex-col sm:flex-row sm:items-center sm:justify-between shrink-0">
          <p className="text-xs text-muted-foreground font-medium">
            {isSuperAdmin
              ? "Super Admin cannot be edited."
              : selectedRole
              ? `${rolePermissions.size} of ${MODULES.length * ACTIONS.length} permissions via "${selectedRole.label}" role.`
              : "Select a role to see permission count."}
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
