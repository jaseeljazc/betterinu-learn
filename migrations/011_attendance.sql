-- ============================================================
-- 011_attendance.sql
-- Employee attendance tracking
-- Dependencies: 010_employees.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS attendance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  status      VARCHAR(20) NOT NULL CHECK (status IN ('Present', 'Absent', 'Leave', 'Holiday')),
  note        TEXT,
  marked_by   UUID REFERENCES admin_accounts(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

COMMENT ON TABLE attendance IS 'Daily attendance records per employee';
COMMENT ON COLUMN attendance.status IS 'Present | Absent | Leave | Holiday';

-- RBAC: attendance module permissions
INSERT INTO permissions (module, action, description)
VALUES
  ('attendance', 'view',   'View attendance records'),
  ('attendance', 'create', 'Mark / create attendance records'),
  ('attendance', 'edit',   'Edit existing attendance records'),
  ('attendance', 'delete', 'Delete attendance records')
ON CONFLICT (module, action) DO NOTHING;

-- super_admin + admin: full access
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT ar.id, p.id
FROM admin_roles ar
CROSS JOIN permissions p
WHERE ar.name IN ('super_admin', 'admin')
  AND p.module = 'attendance'
ON CONFLICT DO NOTHING;

-- account_manager: view only
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT ar.id, p.id
FROM admin_roles ar
CROSS JOIN permissions p
WHERE ar.name = 'account_manager'
  AND p.module = 'attendance'
  AND p.action = 'view'
ON CONFLICT DO NOTHING;

-- instructor (dept head proxy): view + create
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT ar.id, p.id
FROM admin_roles ar
CROSS JOIN permissions p
WHERE ar.name = 'instructor'
  AND p.module = 'attendance'
  AND p.action IN ('view', 'create')
ON CONFLICT DO NOTHING;
