-- ============================================================
-- 010_employees.sql
-- Departments, employees, and payroll tables
-- Dependencies: 006_rbac.sql (admin_accounts), 007_account_manager.sql (account_transactions)
-- ============================================================

CREATE TABLE IF NOT EXISTS departments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(100) NOT NULL,
  description       TEXT,
  head_employee_id  UUID,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE departments IS 'Organisational departments';
COMMENT ON COLUMN departments.head_employee_id IS 'FK to employees.id — added after employees table creation';

CREATE TABLE IF NOT EXISTS employees (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_account_id      UUID UNIQUE REFERENCES admin_accounts(id),
  employee_code         VARCHAR(20) UNIQUE NOT NULL,
  full_name             VARCHAR(150) NOT NULL,
  email                 VARCHAR(255) UNIQUE NOT NULL,
  phone                 VARCHAR(20),
  date_of_birth         DATE,
  gender                VARCHAR(20),
  address               TEXT,
  profile_photo_key     TEXT,
  department_id         UUID REFERENCES departments(id),
  designation           VARCHAR(100),
  employment_type       VARCHAR(20) DEFAULT 'full_time',
  reporting_manager_id  UUID REFERENCES employees(id),
  monthly_salary        NUMERIC(12,2) DEFAULT 0,
  date_of_joining       DATE,
  status                VARCHAR(20) DEFAULT 'active',
  created_by            UUID REFERENCES admin_accounts(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE employees IS 'Core employee directory';
COMMENT ON COLUMN employees.employee_code IS 'Auto-generated, e.g. EMP001';
COMMENT ON COLUMN employees.profile_photo_key IS 'Private S3 key — fetch presigned URL on demand';
COMMENT ON COLUMN employees.employment_type IS 'full_time | part_time | contractual';
COMMENT ON COLUMN employees.status IS 'active | inactive | on_notice | resigned';

ALTER TABLE departments
  ADD CONSTRAINT fk_dept_head
  FOREIGN KEY (head_employee_id) REFERENCES employees(id);

CREATE TABLE IF NOT EXISTS payroll (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID REFERENCES employees(id),
  month           DATE NOT NULL,
  base_salary     NUMERIC(12,2) NOT NULL,
  bonus           NUMERIC(12,2) DEFAULT 0,
  deduction       NUMERIC(12,2) DEFAULT 0,
  net_salary      NUMERIC(12,2) NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending',
  transaction_id  UUID REFERENCES account_transactions(id),
  bonus_note      TEXT,
  deduction_note  TEXT,
  paid_at         TIMESTAMPTZ,
  created_by      UUID REFERENCES admin_accounts(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, month)
);

COMMENT ON TABLE payroll IS 'Monthly payroll records per employee';
COMMENT ON COLUMN payroll.month IS 'Stored as first day of month, e.g. 2025-01-01';
COMMENT ON COLUMN payroll.status IS 'pending | paid';
COMMENT ON COLUMN payroll.transaction_id IS 'Linked account_transactions record when paid';

-- Add employee_id to account_transactions for salary traceability
ALTER TABLE account_transactions
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id);

COMMENT ON COLUMN account_transactions.employee_id IS 'Optional: links salary expense transactions to an employee';

-- RBAC: add employees and payroll modules to permissions
INSERT INTO permissions (module, action, description)
VALUES
  ('employees', 'view',   'View employee directory and profiles'),
  ('employees', 'create', 'Create new employee records'),
  ('employees', 'edit',   'Edit employee details'),
  ('employees', 'delete', 'Deactivate or soft-delete employees'),
  ('payroll',   'view',   'View payroll records'),
  ('payroll',   'create', 'Create and disburse payroll'),
  ('payroll',   'edit',   'Adjust bonus/deductions on payroll records'),
  ('payroll',   'delete', 'Void payroll records')
ON CONFLICT (module, action) DO NOTHING;

-- Grant employees/payroll permissions to super_admin and admin roles
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT ar.id, p.id
FROM admin_roles ar
CROSS JOIN permissions p
WHERE ar.name IN ('super_admin', 'admin')
  AND p.module IN ('employees', 'payroll')
ON CONFLICT DO NOTHING;

-- Grant account_manager: view employees + all payroll
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT ar.id, p.id
FROM admin_roles ar
CROSS JOIN permissions p
WHERE ar.name = 'account_manager'
  AND (
    (p.module = 'employees' AND p.action = 'view')
    OR p.module = 'payroll'
  )
ON CONFLICT DO NOTHING;

-- Grant instructor/support: view employees only
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT ar.id, p.id
FROM admin_roles ar
CROSS JOIN permissions p
WHERE ar.name IN ('instructor', 'support')
  AND p.module = 'employees'
  AND p.action = 'view'
ON CONFLICT DO NOTHING;
