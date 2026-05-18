"use client"

import { useMemo } from "react"
import { hasPermission } from "@/lib/permissions"
import type { AdminRole, Permission, PermissionModule, PermissionAction } from "@/types"

type SessionPayload = {
  role: AdminRole
  permissions: Permission[]
  fullName?: string
  email?: string
}

/**
 * useAdminPermissions — reads role + permissions injected into the page
 * via the __rbac data attribute on <body> (set by the admin layout server
 * component after verifying the session cookie).
 *X002HK8O3T
 
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
        return JSON.parse(decodeURIComponent(match[2])) as SessionPayload
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
