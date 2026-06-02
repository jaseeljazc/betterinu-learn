-- ============================================================
-- 021_multi_role.sql
-- Migrates admin_accounts from a single role_id column to a
-- many-to-many relationship via admin_account_roles pivot table.
-- Dependencies: 006_rbac.sql (admin_accounts, admin_roles)
-- ============================================================

-- 1. Create the pivot table for user-to-roles
CREATE TABLE IF NOT EXISTS admin_account_roles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_account_id UUID NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
  role_id          UUID NOT NULL REFERENCES admin_roles(id)    ON DELETE CASCADE,
  assigned_at      TIMESTAMPTZ DEFAULT NOW(),
  assigned_by      UUID REFERENCES admin_accounts(id),
  UNIQUE(admin_account_id, role_id)
);

COMMENT ON TABLE  admin_account_roles                    IS 'Many-to-many: admin accounts ↔ roles. Replaces the single role_id column on admin_accounts.';
COMMENT ON COLUMN admin_account_roles.admin_account_id   IS 'FK to admin_accounts.id';
COMMENT ON COLUMN admin_account_roles.role_id            IS 'FK to admin_roles.id';
COMMENT ON COLUMN admin_account_roles.assigned_by        IS 'Admin who performed the assignment (NULL = system migration)';

-- 2. Back-fill: migrate existing single role assignments into the new pivot table
INSERT INTO admin_account_roles (admin_account_id, role_id)
SELECT id, role_id
FROM admin_accounts
WHERE role_id IS NOT NULL
ON CONFLICT (admin_account_id, role_id) DO NOTHING;

-- 3. Create indexes for common lookup paths
CREATE INDEX IF NOT EXISTS idx_account_roles_account ON admin_account_roles (admin_account_id);
CREATE INDEX IF NOT EXISTS idx_account_roles_role    ON admin_account_roles (role_id);

-- 4. Keep role_id on admin_accounts for backward compatibility during transition.
--    Once all queries are updated to use the pivot table, run:
--    ALTER TABLE admin_accounts DROP COLUMN role_id;
--    This is intentionally deferred to avoid breaking active sessions.
