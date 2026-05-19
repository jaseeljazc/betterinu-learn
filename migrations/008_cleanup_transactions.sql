-- Remove bill_status, is_recurring, and recurring_interval from account_transactions
ALTER TABLE account_transactions DROP COLUMN IF EXISTS bill_status;
ALTER TABLE account_transactions DROP COLUMN IF EXISTS is_recurring;
ALTER TABLE account_transactions DROP COLUMN IF EXISTS recurring_interval;
