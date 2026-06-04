-- ============================================================
-- 027_add_punch_out_ip.sql
-- Schema: public
-- Table: attendance_punches
-- Purpose: Add a separate column to track the IP address at the time of punch-out.
-- Dependencies: attendance_punches
-- ============================================================

ALTER TABLE attendance_punches 
ADD COLUMN IF NOT EXISTS punch_out_ip_address TEXT;

COMMENT ON COLUMN attendance_punches.punch_out_ip_address IS 'The IP address from which the student punched out.';
