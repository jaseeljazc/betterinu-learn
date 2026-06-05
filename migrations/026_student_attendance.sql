-- ============================================================
-- 026_student_attendance.sql
-- Schema: public (or default schema)
-- Tables: trusted_ips, attendance_punches, attendance_notifications
-- Purpose: Student attendance punch-in/out with in-app admin notifications for untrusted IPs.
-- Dependencies: admin_accounts, students
-- ============================================================

-- Table 1: trusted_ips
CREATE TABLE IF NOT EXISTS trusted_ips (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label      TEXT NOT NULL,
  ip_range   TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES admin_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: attendance_punches  
CREATE TABLE IF NOT EXISTS attendance_punches (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  punch_in   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  punch_out  TIMESTAMPTZ,
  ip_address TEXT NOT NULL,
  is_trusted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 3: attendance_notifications
CREATE TABLE IF NOT EXISTS attendance_notifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id   UUID NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
  punch_id       UUID NOT NULL REFERENCES attendance_punches(id) ON DELETE CASCADE,
  student_id     UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  message        TEXT NOT NULL,
  action_url     TEXT,
  ip_address     TEXT NOT NULL,
  is_read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_punches_student
  ON attendance_punches (student_id, punch_in);

CREATE INDEX IF NOT EXISTS idx_attendance_notifs_recipient
  ON attendance_notifications (recipient_id);

CREATE INDEX IF NOT EXISTS idx_attendance_notifs_unread
  ON attendance_notifications (recipient_id) WHERE is_read = FALSE;

-- Comments
COMMENT ON TABLE trusted_ips IS 'List of trusted IP addresses or ranges for student attendance.';
COMMENT ON TABLE attendance_punches IS 'Records of student attendance punch-in and punch-out events.';
COMMENT ON TABLE attendance_notifications IS 'In-app notifications for admins regarding untrusted IP attendance punches.';

COMMENT ON COLUMN attendance_punches.is_trusted IS 'True if the IP address is in the trusted_ips table.';
COMMENT ON COLUMN attendance_notifications.action_url IS 'Optional URL for the admin to view details about the flagged attendance.';
