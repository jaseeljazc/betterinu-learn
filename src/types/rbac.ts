export type AdminRole = "super_admin" | "admin" | "instructor" | "support"
export type PermissionModule = "students" | "courses" | "curriculum" | "tasks" | "admins"
export type PermissionAction = "view" | "create" | "edit" | "delete"

export interface Permission {
  id: string
  module: PermissionModule
  action: PermissionAction
  description: string
}

export interface AdminRoleRecord {
  id: string
  name: AdminRole
  label: string
  description: string
  isSystem: boolean
  permissions: Permission[]
}

export interface AdminAccount {
  id: string
  firebaseUid: string
  fullName: string
  email: string
  role: AdminRoleRecord
  status: "active" | "inactive" | "pending"
  createdBy?: Pick<AdminAccount, "id" | "fullName" | "email">
  lastLogin?: string
  createdAt: string
}
