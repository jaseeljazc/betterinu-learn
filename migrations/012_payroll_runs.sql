-- ============================================================
-- 012_payroll_runs.sql
-- Attendance-driven payroll runs with LOP calculation
-- Dependencies: 010_employees.sql, 011_attendance.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS payroll_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  month           VARCHAR(7) NOT NULL,           -- "YYYY-MM"
  working_days    INT NOT NULL DEFAULT 0,
  days_present    INT NOT NULL DEFAULT 0,
  total_absences  INT NOT NULL DEFAULT 0,
  lop_days        INT NOT NULL DEFAULT 0,
  daily_rate      NUMERIC(12,4) NOT NULL DEFAULT 0,
  lop_deduction   NUMERIC(12,2) NOT NULL DEFAULT 0,
  gross_salary    NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_salary      NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft | approved | disbursed | on_hold
  disbursed_at    TIMESTAMPTZ,
  transaction_id  UUID REFERENCES account_transactions(id),
  created_by      UUID REFERENCES admin_accounts(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, month)
);

COMMENT ON TABLE payroll_runs IS 'Attendance-driven monthly payroll calculation runs';
COMMENT ON COLUMN payroll_runs.month IS 'YYYY-MM format e.g. 2025-05';
COMMENT ON COLUMN payroll_runs.status IS 'draft | approved | disbursed | on_hold';
COMMENT ON COLUMN payroll_runs.daily_rate IS 'gross_salary / working_days';
COMMENT ON COLUMN payroll_runs.lop_days IS 'max(0, total_absences - 1) — first CL is free';

-- Permissions for payroll_runs module
INSERT INTO permissions (module, action, description)
VALUES
  ('payroll_runs', 'view',   'View payroll runs and payslips'),
  ('payroll_runs', 'create', 'Generate and run payroll'),
  ('payroll_runs', 'edit',   'Approve / hold payroll runs'),
  ('payroll_runs', 'delete', 'Delete draft payroll runs')
ON CONFLICT (module, action) DO NOTHING;

-- super_admin + admin: full access
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT ar.id, p.id
FROM admin_roles ar
CROSS JOIN permissions p
WHERE ar.name IN ('super_admin', 'admin')
  AND p.module = 'payroll_runs'
ON CONFLICT DO NOTHING;

-- account_manager: view + create + edit
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT ar.id, p.id
FROM admin_roles ar
CROSS JOIN permissions p
WHERE ar.name = 'account_manager'
  AND p.module = 'payroll_runs'
  AND p.action IN ('view', 'create', 'edit')
ON CONFLICT DO NOTHING;
