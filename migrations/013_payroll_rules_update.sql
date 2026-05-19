-- 013_payroll_rules_update.sql

-- Add Half_Day to attendance status check constraint
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_status_check;
ALTER TABLE attendance ADD CONSTRAINT attendance_status_check 
CHECK (status IN ('Present', 'Absent', 'Leave', 'Half_Day', 'Holiday'));

-- Update payroll_runs table
ALTER TABLE payroll_runs DROP COLUMN IF EXISTS total_absences;
ALTER TABLE payroll_runs DROP COLUMN IF EXISTS lop_days;

ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS leave_count INT NOT NULL DEFAULT 0;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS absent_count INT NOT NULL DEFAULT 0;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS half_day_count INT NOT NULL DEFAULT 0;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS lop_leaves INT NOT NULL DEFAULT 0;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS lop_absences INT NOT NULL DEFAULT 0;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS lop_full_days INT NOT NULL DEFAULT 0;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS lop_half_days NUMERIC(10,1) NOT NULL DEFAULT 0;

COMMENT ON COLUMN payroll_runs.leave_count IS 'days with status Leave on working days';
COMMENT ON COLUMN payroll_runs.absent_count IS 'days with status Absent on working days';
COMMENT ON COLUMN payroll_runs.half_day_count IS 'days with status Half_Day on working days';
