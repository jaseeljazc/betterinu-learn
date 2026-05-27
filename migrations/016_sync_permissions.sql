-- ============================================================
-- 016_sync_permissions.sql
-- Idempotent sync of roles and permissions for all modules.
-- Run after seed-rbac.ts has been executed, or standalone.
-- Fixes missing grants added by later migrations that were
-- not back-filled into existing roles.
-- ============================================================

-- ── 1. Ensure account_manager role exists ────────────────────
INSERT INTO admin_roles (name, label, description, is_system)
VALUES (
  'account_manager',
  'Account Manager',
  'Full access to accounts and payroll modules. View-only access to employees and attendance.',
  TRUE
)
ON CONFLICT (name) DO UPDATE SET
  label       = EXCLUDED.label,
  description = EXCLUDED.description;

-- ── 2. Ensure all 9 modules × 4 actions exist in permissions ─
INSERT INTO permissions (module, action, description)
VALUES
  -- employees (may already exist from 010_employees.sql)
  ('employees', 'view',   'View employee directory and profiles'),
  ('employees', 'create', 'Create new employee records'),
  ('employees', 'edit',   'Edit employee details'),
  ('employees', 'delete', 'Deactivate or soft-delete employees'),
  -- payroll (may already exist from 010_employees.sql)
  ('payroll',   'view',   'View payroll records'),
  ('payroll',   'create', 'Create and disburse payroll'),
  ('payroll',   'edit',   'Adjust payroll records'),
  ('payroll',   'delete', 'Void payroll records'),
  -- attendance (may already exist from 011_attendance.sql)
  ('attendance', 'view',   'View attendance records'),
  ('attendance', 'create', 'Mark / create attendance records'),
  ('attendance', 'edit',   'Edit existing attendance records'),
  ('attendance', 'delete', 'Delete attendance records'),
  -- accounts (may already exist from 007_account_manager.sql)
  ('accounts',   'view',   'View accounts and transactions'),
  ('accounts',   'create', 'Create accounts and transactions'),
  ('accounts',   'edit',   'Edit accounts and transactions'),
  ('accounts',   'delete', 'Delete accounts and transactions'),
  -- original academic modules (idempotent)
  ('students',   'view',   'View student records'),
  ('students',   'create', 'Create student records'),
  ('students',   'edit',   'Edit student records'),
  ('students',   'delete', 'Delete student records'),
  ('courses',    'view',   'View courses'),
  ('courses',    'create', 'Create courses'),
  ('courses',    'edit',   'Edit courses'),
  ('courses',    'delete', 'Delete courses'),
  ('curriculum', 'view',   'View curriculum'),
  ('curriculum', 'create', 'Create curriculum'),
  ('curriculum', 'edit',   'Edit curriculum'),
  ('curriculum', 'delete', 'Delete curriculum'),
  ('tasks',      'view',   'View tasks'),
  ('tasks',      'create', 'Create tasks'),
  ('tasks',      'edit',   'Edit tasks'),
  ('tasks',      'delete', 'Delete tasks'),
  ('admins',     'view',   'View admin accounts'),
  ('admins',     'create', 'Create admin accounts'),
  ('admins',     'edit',   'Edit admin accounts'),
  ('admins',     'delete', 'Delete admin accounts')
ON CONFLICT (module, action) DO NOTHING;

-- ── 3. admin role: grant accounts + employees + payroll + attendance ──
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT ar.id, p.id
FROM admin_roles ar
CROSS JOIN permissions p
WHERE ar.name = 'admin'
  AND p.module IN ('accounts', 'employees', 'payroll', 'attendance')
ON CONFLICT DO NOTHING;

-- ── 4. support role: grant attendance view ───────────────────
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT ar.id, p.id
FROM admin_roles ar
CROSS JOIN permissions p
WHERE ar.name = 'support'
  AND p.module IN ('students', 'courses', 'tasks', 'employees', 'attendance')
  AND p.action = 'view'
ON CONFLICT DO NOTHING;

-- ── 5. instructor role: grant employees view + attendance view/create ─
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT ar.id, p.id
FROM admin_roles ar
CROSS JOIN permissions p
WHERE ar.name = 'instructor'
  AND (
    (p.module = 'employees'  AND p.action = 'view')
    OR (p.module = 'attendance' AND p.action IN ('view', 'create'))
  )
ON CONFLICT DO NOTHING;

-- ── 6. account_manager role: full accounts + payroll + employees/attendance view ─
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT ar.id, p.id
FROM admin_roles ar
CROSS JOIN permissions p
WHERE ar.name = 'account_manager'
  AND (
    p.module IN ('accounts', 'payroll')
    OR (p.module = 'employees'  AND p.action = 'view')
    OR (p.module = 'attendance' AND p.action = 'view')
  )
ON CONFLICT DO NOTHING;

-- ── 7. Remove stale payroll_runs permission rows (if any exist) ──
-- payroll_runs was a type-only accident — never seeded properly.
-- Safe to delete since no routes should be using this module string now.
DELETE FROM admin_role_permissions
WHERE permission_id IN (
  SELECT id FROM permissions WHERE module = 'payroll_runs'
);
DELETE FROM permissions WHERE module = 'payroll_runs';
