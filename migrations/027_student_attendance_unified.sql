-- ============================================================
-- 027_student_attendance_unified.sql
-- Replaces attendance_punches + attendance_notifications with
-- a single unified student_attendance table (one row per student
-- per day) that handles both punch data and admin overrides.
-- Dependencies: 026_student_attendance.sql (drops its tables)
-- ============================================================

-- Drop old tables (CASCADE removes attendance_notifications too)
DROP TABLE IF EXISTS attendance_notifications CASCADE;
DROP TABLE IF EXISTS attendance_punches CASCADE;

-- Unified student attendance table
CREATE TABLE IF NOT EXISTS student_attendance (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date            DATE        NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'Present'
                  CHECK (status IN ('Present', 'Absent', 'Leave', 'Holiday')),
  -- Punch data (auto-filled by student punch-in/out)
  punch_in        TIMESTAMPTZ,
  punch_out       TIMESTAMPTZ,
  punch_in_ip     TEXT,
  punch_out_ip    TEXT,
  is_trusted      BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Admin override fields
  note            TEXT,
  marked_by       UUID        REFERENCES admin_accounts(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One row per student per day
  UNIQUE(student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_student_attendance_student_date
  ON student_attendance (student_id, date);

CREATE INDEX IF NOT EXISTS idx_student_attendance_date
  ON student_attendance (date);

CREATE INDEX IF NOT EXISTS idx_student_attendance_is_trusted
  ON student_attendance (is_trusted) WHERE is_trusted = FALSE;

-- Recreate attendance_notifications referencing new table
CREATE TABLE IF NOT EXISTS attendance_notifications (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id  UUID        NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
  attendance_id UUID        NOT NULL REFERENCES student_attendance(id) ON DELETE CASCADE,
  student_id    UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  message       TEXT        NOT NULL,
  action_url    TEXT,
  ip_address    TEXT        NOT NULL,
  is_read       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_notifs_recipient
  ON attendance_notifications (recipient_id);
CREATE INDEX IF NOT EXISTS idx_attendance_notifs_unread
  ON attendance_notifications (recipient_id) WHERE is_read = FALSE;

COMMENT ON TABLE student_attendance IS 'Unified student attendance: one row per student per day. Punch data filled by student; status/note overrideable by admin.';
COMMENT ON COLUMN student_attendance.marked_by IS 'NULL = auto-created from punch. Non-null = admin manually marked/overrode this day.';
COMMENT ON COLUMN student_attendance.is_trusted IS 'True if punch_in_ip was in trusted_ips at time of punch.';
COMMENT ON COLUMN student_attendance.punch_in_ip IS 'IP address used during punch-in.';
COMMENT ON COLUMN student_attendance.punch_out_ip IS 'IP address used during punch-out.';
