-- ============================================================
-- migrations/025_update_roles.sql
-- Removes the deprecated "admin" and "support" system roles
-- and adds: ceo, developer, marketing_staff, sales_staff,
-- department_head.
--
-- Safe to run on a live DB:
--   • admin_accounts linked to removed roles are re-assigned
--     to "instructor" (or left with no role if none exists).
--   • Uses ON CONFLICT DO NOTHING / DO UPDATE throughout.
-- ============================================================

-- ── 1. Ensure new roles exist ─────────────────────────────────
INSERT INTO admin_roles (name, label, description, is_system)
VALUES
  ('ceo',             'CEO',             'Full unrestricted access equivalent to Super Admin. Intended for the organisation''s CEO.',                                                                                                      true),
  ('developer',       'Developer',       'View-only access to courses and curriculum. Default tasks_mgmt permissions.',                                                                                                                    true),
  ('marketing_staff', 'Marketing Staff', 'View-only access to students and courses. Default tasks_mgmt permissions.',                                                                                                                      true),
  ('sales_staff',     'Sales Staff',     'Can view and create students. View-only on courses and accounts. Default tasks_mgmt permissions.',                                                                                                true),
  ('department_head', 'Department Head', 'Supplementary role — always paired with a base role. Adds elevated tasks_mgmt visibility plus view access to employees and attendance.',                                                          true)
ON CONFLICT (name) DO UPDATE SET
  label       = EXCLUDED.label,
  description = EXCLUDED.description;

-- ── 2. Ensure all tasks_mgmt permission rows exist ────────────
INSERT INTO permissions (module, action, description)
VALUES
  ('tasks_mgmt', 'view_own',           'Can view own tasks'),
  ('tasks_mgmt', 'view_team',          'Can view team tasks'),
  ('tasks_mgmt', 'view_all',           'Can view all tasks'),
  ('tasks_mgmt', 'view_disabled',      'Can view disabled tasks'),
  ('tasks_mgmt', 'create',             'Can create tasks'),
  ('tasks_mgmt', 'edit_own',           'Can edit own tasks'),
  ('tasks_mgmt', 'edit_any',           'Can edit any task'),
  ('tasks_mgmt', 'delete',             'Can delete tasks'),
  ('tasks_mgmt', 'assign',             'Can assign tasks to others'),
  ('tasks_mgmt', 'self_assign',        'Can self-assign tasks'),
  ('tasks_mgmt', 'manage_projects',    'Can manage projects'),
  ('tasks_mgmt', 'manage_sprints',     'Can manage sprints'),
  ('tasks_mgmt', 'view_audit_log',     'Can view audit log'),
  ('tasks_mgmt', 'view_dashboard',     'Can view tasks dashboard'),
  ('tasks_mgmt', 'manage_attachments', 'Can manage attachments')
ON CONFLICT (module, action) DO NOTHING;

-- ── 3. Seed permissions for new roles ────────────────────────
-- (run seed-rbac.ts for full idempotent seeding; this handles bootstrap)

-- ceo: all modules × all CRUD + all tasks_mgmt actions
WITH role AS (SELECT id FROM admin_roles WHERE name = 'ceo'),
     perms AS (
       SELECT id FROM permissions
       WHERE (module != 'tasks_mgmt')
          OR (module = 'tasks_mgmt')
     )
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT role.id, perms.id FROM role, perms
ON CONFLICT DO NOTHING;

-- developer: courses view, curriculum view + tasks_mgmt defaults
WITH role AS (SELECT id FROM admin_roles WHERE name = 'developer'),
     perms AS (
       SELECT id FROM permissions
       WHERE (module = 'courses'    AND action = 'view')
          OR (module = 'curriculum' AND action = 'view')
          OR (module = 'tasks_mgmt' AND action IN ('view_own','create','edit_own','self_assign','manage_attachments'))
     )
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT role.id, perms.id FROM role, perms
ON CONFLICT DO NOTHING;

-- marketing_staff: students view, courses view + tasks_mgmt defaults
WITH role AS (SELECT id FROM admin_roles WHERE name = 'marketing_staff'),
     perms AS (
       SELECT id FROM permissions
       WHERE (module = 'students' AND action = 'view')
          OR (module = 'courses'  AND action = 'view')
          OR (module = 'tasks_mgmt' AND action IN ('view_own','create','edit_own','self_assign','manage_attachments'))
     )
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT role.id, perms.id FROM role, perms
ON CONFLICT DO NOTHING;

-- sales_staff: students (view+create), courses view, accounts view + tasks_mgmt defaults
WITH role AS (SELECT id FROM admin_roles WHERE name = 'sales_staff'),
     perms AS (
       SELECT id FROM permissions
       WHERE (module = 'students' AND action IN ('view','create'))
          OR (module = 'courses'  AND action = 'view')
          OR (module = 'accounts' AND action = 'view')
          OR (module = 'tasks_mgmt' AND action IN ('view_own','create','edit_own','self_assign','manage_attachments'))
     )
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT role.id, perms.id FROM role, perms
ON CONFLICT DO NOTHING;

-- department_head: tasks_mgmt elevated + employees/attendance view
WITH role AS (SELECT id FROM admin_roles WHERE name = 'department_head'),
     perms AS (
       SELECT id FROM permissions
       WHERE (module = 'tasks_mgmt' AND action IN ('view_team','view_audit_log','view_dashboard','assign','edit_any'))
          OR (module = 'employees'  AND action = 'view')
          OR (module = 'attendance' AND action = 'view')
     )
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT role.id, perms.id FROM role, perms
ON CONFLICT DO NOTHING;

-- ── 4. Re-home any accounts on removed roles before deletion ──
-- Admins currently assigned ONLY "admin" or "support" get reassigned
-- to "instructor" so they keep at least one role.

DO $$
DECLARE
  v_instructor_id UUID;
BEGIN
  SELECT id INTO v_instructor_id FROM admin_roles WHERE name = 'instructor';

  -- For each admin account whose only roles are the ones being removed,
  -- insert an instructor assignment so they're not left roleless.
  INSERT INTO admin_account_roles (admin_account_id, role_id)
  SELECT DISTINCT aar.admin_account_id, v_instructor_id
  FROM admin_account_roles aar
  JOIN admin_roles ar ON ar.id = aar.role_id
  WHERE ar.name IN ('admin', 'support')
    AND NOT EXISTS (
      SELECT 1
      FROM admin_account_roles aar2
      JOIN admin_roles ar2 ON ar2.id = aar2.role_id
      WHERE aar2.admin_account_id = aar.admin_account_id
        AND ar2.name NOT IN ('admin', 'support')
    )
  ON CONFLICT DO NOTHING;
END $$;

-- Remove pivot rows pointing to the old roles
DELETE FROM admin_account_roles
WHERE role_id IN (SELECT id FROM admin_roles WHERE name IN ('admin', 'support'));

-- Remove the role permission mappings
DELETE FROM admin_role_permissions
WHERE role_id IN (SELECT id FROM admin_roles WHERE name IN ('admin', 'support'));

-- ── 5. Delete the removed roles ───────────────────────────────
DELETE FROM admin_roles WHERE name IN ('admin', 'support');
