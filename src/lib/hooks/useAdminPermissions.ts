"use client"

import { useMemo } from "react"
import { hasPermission, canViewTasks, getDefaultPermissions } from "@/lib/permissions"
import type { AdminRole, Permission, PermissionModule, PermissionAction } from "@/types"

type CompactPerm = { m: string; a: string }

type RbacCookie = {
  /** admin_accounts.id for the signed-in user */
  adminId?: string
  role: AdminRole
  /**
   * All roles assigned to the user — aggregated from admin_account_roles
   * by the verify route. Primary role is `role`; this array includes all.
   */
  roles?: AdminRole[]
  /**
   * Compact permissions stored as [{m, a}] (written by /api/admin/auth/verify).
   * Always present for custom roles; falls back to empty for legacy cookies.
   */
  permissions?: CompactPerm[]
  fullName?: string
  email?: string
}

type SessionPayload = {
  adminId?: string
  role: AdminRole
  roles: AdminRole[]
  permissions: Permission[]
  fullName?: string
  email?: string
}

/**
 * useAdminPermissions — reads the __rbac cookie written by the login verify
 * route and exposes a `can(module, action)` helper for the sidebar nav.
 *
 * Permissions are stored compactly as [{m, a}] in the cookie to stay well
 * under the 4KB browser limit while still supporting arbitrary custom roles.
 *
 * `roles` returns all assigned roles (multi-role support).
 */
export function useAdminPermissions() {
  const payload = useMemo<SessionPayload>(() => {
    if (typeof document === "undefined") {
      return { role: "developer" as AdminRole, roles: ["developer"], permissions: [] }
    }
    try {
      const match = document.cookie.match(new RegExp("(^| )__rbac=([^;]+)"))
      if (match) {
        const raw = JSON.parse(decodeURIComponent(match[2])) as RbacCookie

        let role = raw.role
        if (role === ("admin" as AdminRole)) {
          role = "instructor" as AdminRole
        }
        let roles = raw.roles ?? [raw.role]
        roles = roles.map(r => r === ("admin" as AdminRole) ? "instructor" as AdminRole : r)

        let permissions: Permission[] = []

        if (raw.permissions && raw.permissions.length > 0) {
          // New format: [{m, a}] compact array from the verify route
          permissions = raw.permissions.map((p) => ({
            module: p.m as PermissionModule,
            action: p.a as PermissionAction,
            // id and description are not needed for UI gating
            id: "",
            description: "",
          }))
        }

        // Fallback to defaults or merge if legacy/outdated
        if (raw.role === ("admin" as AdminRole) || permissions.length === 0) {
          const defaults = getDefaultPermissions(role)
          const defaultMapped = defaults.map((d) => ({
            module: d.module,
            action: d.action,
            id: "",
            description: "",
          }))
          // Merge
          const seen = new Set(permissions.map(p => `${p.module}:${p.action}`))
          for (const d of defaultMapped) {
            if (!seen.has(`${d.module}:${d.action}`)) {
              permissions.push(d)
            }
          }
        }

        return {
          adminId: raw.adminId,
          role,
          roles,
          permissions,
          fullName: raw.fullName,
          email: raw.email,
        }
      }
      return { role: "developer" as AdminRole, roles: ["developer"], permissions: [] }
    } catch {
      return { role: "developer" as AdminRole, roles: ["developer"], permissions: [] }
    }
  }, [])

  function can(module: PermissionModule, action: PermissionAction): boolean {
    return hasPermission(payload.role, payload.permissions, module, action)
  }

  const canViewTasksVal = canViewTasks(payload.role, payload.permissions)

  return {
    can,
    /** admin_accounts.id for the signed-in user — use to identify task ownership. */
    adminId: payload.adminId,
    role: payload.role,
    /** All roles assigned to the current user (multi-role). */
    roles: payload.roles,
    isSuperAdmin: payload.role === "super_admin",
    fullName: payload.fullName,
    email: payload.email,
    canViewTasks: canViewTasksVal,
  }
}
