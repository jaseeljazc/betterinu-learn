"use client"

import { useMemo } from "react"
import { hasPermission } from "@/lib/permissions"
import type { AdminRole, Permission, PermissionModule, PermissionAction } from "@/types"

type CompactPerm = { m: string; a: string }

type RbacCookie = {
  role: AdminRole
  /**
   * Compact permissions stored as [{m, a}] (written by /api/admin/auth/verify).
   * Always present for custom roles; falls back to getDefaultPermissions() for
   * legacy cookies that only carry the role field.
   */
  permissions?: CompactPerm[]
  fullName?: string
  email?: string
}

type SessionPayload = {
  role: AdminRole
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
 */
export function useAdminPermissions() {
  const payload = useMemo<SessionPayload>(() => {
    if (typeof document === "undefined") {
      return { role: "support" as AdminRole, permissions: [] }
    }
    try {
      const match = document.cookie.match(new RegExp("(^| )__rbac=([^;]+)"))
      if (match) {
        const raw = JSON.parse(decodeURIComponent(match[2])) as RbacCookie

        let permissions: Permission[]

        if (raw.permissions && raw.permissions.length > 0) {
          // New format: [{m, a}] compact array from the verify route
          permissions = raw.permissions.map((p) => ({
            module: p.m as PermissionModule,
            action: p.a as PermissionAction,
            // id and description are not needed for UI gating
            id: "",
            description: "",
          }))
        } else {
          // Legacy cookie with no permissions — empty; user must re-login
          permissions = []
        }

        return {
          role: raw.role,
          permissions,
          fullName: raw.fullName,
          email: raw.email,
        }
      }
      return { role: "support" as AdminRole, permissions: [] }
    } catch {
      return { role: "support" as AdminRole, permissions: [] }
    }
  }, [])

  function can(module: PermissionModule, action: PermissionAction): boolean {
    return hasPermission(payload.role, payload.permissions, module, action)
  }

  return {
    can,
    role: payload.role,
    isSuperAdmin: payload.role === "super_admin",
    fullName: payload.fullName,
    email: payload.email,
  }
}
