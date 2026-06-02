export type AdminRole =
  | "super_admin"
  | "ceo"
  | "instructor"
  | "account_manager"
  | "task_manager"
  | "reviewer"
  | "hr_manager"
  | "developer"
  | "marketing_staff"
  | "sales_staff"
  | "department_head"
export type PermissionModule =
  | "students"
  | "courses"
  | "curriculum"
  | "tasks"
  | "tasks_mgmt"
  | "admins"
  | "accounts"
  | "employees"
  | "payroll"
  | "attendance"
export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "view_own"
  | "view_team"
  | "view_all"
  | "view_disabled"
  | "edit_own"
  | "edit_any"
  | "assign"
  | "self_assign"
  | "manage_projects"
  | "manage_sprints"
  | "view_audit_log"
  | "view_dashboard"
  | "manage_attachments"

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
