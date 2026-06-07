-- ============================================================
-- 030_student_leave_fines.sql
-- Creates student_leave_fines table with proper schema
-- to support both leave request fines and absent fines
-- ============================================================

-- Drop old table if exists (recreate with correct schema)
DROP TABLE IF EXISTS student_leave_fines CASCADE;

CREATE TABLE student_leave_fines (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  
  -- Foreign keys: ONE of these will be set depending on fine type
  leave_request_id UUID        REFERENCES student_leave_requests(id) ON DELETE CASCADE,
  attendance_id    UUID        REFERENCES student_attendance(id) ON DELETE CASCADE,
  
  fine_type        TEXT        NOT NULL CHECK (fine_type IN ('leave', 'absent')),
  period_label     TEXT        NOT NULL,  -- For leave: YYYY-MM or YYYY; For absent: YYYY-MM-DD (the date)
  fine_amount      NUMERIC     NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'paid', 'waived')),
  waive_reason     TEXT,
  resolved_by      UUID        REFERENCES admin_accounts(id),
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints: each leave_request_id can have only one fine
  UNIQUE (leave_request_id),
  -- Each attendance_id can have only one fine (prevents duplicate absent fines for same day)
  UNIQUE (attendance_id),
  
  -- At least one FK must be set
  CHECK (
    (leave_request_id IS NOT NULL AND attendance_id IS NULL) OR
    (leave_request_id IS NULL AND attendance_id IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_slf_student_id   ON student_leave_fines (student_id);
CREATE INDEX idx_slf_status       ON student_leave_fines (status);
CREATE INDEX idx_slf_period       ON student_leave_fines (period_label);
CREATE INDEX idx_slf_fine_type    ON student_leave_fines (fine_type);

COMMENT ON TABLE student_leave_fines IS 'Fines for leave quota overages and unexcused absences';
COMMENT ON COLUMN student_leave_fines.fine_type IS 'leave = over-quota leave, absent = unexcused absence';
COMMENT ON COLUMN student_leave_fines.leave_request_id IS 'Set for leave fines (when fine_type = leave)';
COMMENT ON COLUMN student_leave_fines.attendance_id IS 'Set for absent fines (when fine_type = absent)';
COMMENT ON COLUMN student_leave_fines.period_label IS 'For leave: YYYY-MM or YYYY (period); For absent: YYYY-MM-DD (specific date)';
