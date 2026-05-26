-- ============================================================
-- 015_add_temp_password_to_admin_accounts.sql
-- Add temp_password column to admin_accounts to display temporary passwords in the management interface.
-- Dependencies: 006_rbac.sql (admin_accounts)
-- ============================================================

ALTER TABLE admin_accounts ADD COLUMN IF NOT EXISTS temp_password VARCHAR(255);

COMMENT ON COLUMN admin_accounts.temp_password IS 'Stores the temporary password of the admin for recovery/display in table';
