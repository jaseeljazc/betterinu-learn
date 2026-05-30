-- ============================================================
-- 020_receipt_number.sql
-- Schema: learning
-- Table: student_payment_logs
-- Add receipt_number column for fee receipts
-- Dependencies: 019_fee_management.sql
-- ============================================================

ALTER TABLE student_payment_logs
  ADD COLUMN IF NOT EXISTS receipt_number TEXT UNIQUE;

COMMENT ON COLUMN student_payment_logs.receipt_number IS 'Unique sequential receipt number generated on first access (format: RCP-YYYY-NNNNN)';
