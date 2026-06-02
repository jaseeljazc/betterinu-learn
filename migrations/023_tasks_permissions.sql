-- ============================================================
-- 023_tasks_permissions.sql
-- Schema: public
-- Table: permissions, admin_roles, admin_role_permissions
-- Seed permissions for the tasks_mgmt module and assign to roles
-- Dependencies: 006_rbac.sql, 022_tasks.sql
-- ============================================================

-- Ensure new roles exist
INSERT INTO admin_roles (name, label, description, is_system)
VALUES 
  ('task_manager', 'Task Manager', 'System role to manage projects, sprints, and task assignments.', TRUE),
  ('reviewer', 'Reviewer', 'System role to review tasks and view audit logs.', TRUE),
  ('hr_manager', 'HR Manager', 'System role to manage employees, payroll, and tasks.', TRUE)
ON CONFLICT (name) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description;

-- Insert permissions for tasks_mgmt module
INSERT INTO permissions (module, action, description)
VALUES
  ('tasks_mgmt', 'view_own', 'Can view own tasks'),
  ('tasks_mgmt', 'view_team', 'Can view team tasks'),
  ('tasks_mgmt', 'view_all', 'Can view all tasks'),
  ('tasks_mgmt', 'view_disabled', 'Can view disabled/soft-deleted tasks'),
  ('tasks_mgmt', 'create', 'Can create new tasks'),
  ('tasks_mgmt', 'edit_own', 'Can edit own tasks'),
  ('tasks_mgmt', 'edit_any', 'Can edit any tasks'),
  ('tasks_mgmt', 'delete', 'Can soft-delete tasks'),
  ('tasks_mgmt', 'assign', 'Can assign tasks to others'),
  ('tasks_mgmt', 'self_assign', 'Can self assign tasks'),
  ('tasks_mgmt', 'manage_projects', 'Can create and edit projects/boards'),
  ('tasks_mgmt', 'manage_sprints', 'Can manage sprints/milestones'),
  ('tasks_mgmt', 'view_audit_log', 'Can view task audit logs'),
  ('tasks_mgmt', 'view_dashboard', 'Can view task metrics and dashboard'),
  ('tasks_mgmt', 'manage_attachments', 'Can upload or delete task attachments')
ON CONFLICT (module, action) DO NOTHING;

-- 1. super_admin — all task permissions
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT ar.id, p.id
FROM admin_roles ar
CROSS JOIN permissions p
WHERE ar.name = 'super_admin'
  AND p.module = 'tasks_mgmt'
ON CONFLICT DO NOTHING;

-- 2. task_manager — view_all, view_disabled, create, edit_any, assign, manage_projects, manage_sprints, view_dashboard, manage_attachments, view_audit_log
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT ar.id, p.id
FROM admin_roles ar
CROSS JOIN permissions p
WHERE ar.name = 'task_manager'
  AND p.module = 'tasks_mgmt'
  AND p.action IN ('view_all', 'view_disabled', 'create', 'edit_any', 'assign', 'manage_projects', 'manage_sprints', 'view_dashboard', 'manage_attachments', 'view_audit_log')
ON CONFLICT DO NOTHING;

-- 3. admin — view_team, create, edit_own, assign, manage_projects, view_dashboard, manage_attachments
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT ar.id, p.id
FROM admin_roles ar
CROSS JOIN permissions p
WHERE ar.name = 'admin'
  AND p.module = 'tasks_mgmt'
  AND p.action IN ('view_team', 'create', 'edit_own', 'assign', 'manage_projects', 'view_dashboard', 'manage_attachments')
ON CONFLICT DO NOTHING;

-- 4. reviewer — view_team, view_disabled (only tasks where they are the reviewer), edit_own, view_audit_log
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT ar.id, p.id
FROM admin_roles ar
CROSS JOIN permissions p
WHERE ar.name = 'reviewer'
  AND p.module = 'tasks_mgmt'
  AND p.action IN ('view_team', 'view_disabled', 'edit_own', 'view_audit_log')
ON CONFLICT DO NOTHING;

-- 5. account_manager, hr_manager, and other existing roles (instructor, support) — view_own, create, edit_own, self_assign, manage_attachments
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT ar.id, p.id
FROM admin_roles ar
CROSS JOIN permissions p
WHERE ar.name IN ('account_manager', 'hr_manager', 'instructor', 'support')
  AND p.module = 'tasks_mgmt'
  AND p.action IN ('view_own', 'create', 'edit_own', 'self_assign', 'manage_attachments')
ON CONFLICT DO NOTHING;
