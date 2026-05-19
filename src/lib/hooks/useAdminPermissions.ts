"use client"

import { useMemo } from "react"
import { hasPermission, getDefaultPermissions } from "@/lib/permissions"
import type { AdminRole, Permission, PermissionModule, PermissionAction } from "@/types"

type RbacCookie = {
  role: AdminRole
  /** Full permissions array — may be absent/truncated in large payloads */
  permissions?: Permission[]
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
 * useAdminPermissions — reads role from the __rbac cookie (set by the
 * verify API route on login) and derives permissions client-side.
 *
 * Permissions are intentionally NOT stored in the cookie to avoid the
 * 4 KB browser cookie size limit. Instead we use getDefaultPermissions()
 * which mirrors the DB seed exactly. If the cookie also carries a
 * `permissions` array (legacy / custom roles), those are used instead.
 *
 * Returns:
 *   can(module, action) — true when the session has that permission
 *   role               — the raw AdminRole string
 *   isSuperAdmin       — shorthand for role === "super_admin"
 *   fullName           — full name of the admin
 *   email              — email of the admin
 */
export function useAdminPermissions() {
  const payload = useMemo<SessionPayload>(() => {
    if (typeof document === "undefined") {
      return { role: "support" as AdminRole, permissions: [] }
    }
    try {
      const match = document.cookie.match(new RegExp('(^| )__rbac=([^;]+)'))
      if (match) {
        const raw = JSON.parse(decodeURIComponent(match[2])) as RbacCookie
        // Use cookie-stored permissions if present and non-empty (custom roles),
        // otherwise derive from role to avoid 4KB cookie size truncation.
        const permissions: Permission[] =
          raw.permissions && raw.permissions.length > 0
            ? raw.permissions
            : (getDefaultPermissions(raw.role) as unknown as Permission[])
        return { role: raw.role, permissions, fullName: raw.fullName, email: raw.email }
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
