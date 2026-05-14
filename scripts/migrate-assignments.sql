-- ──────────────────────────────────────────────────────────
-- Assignment Feature Migration
-- Run: psql $NEON_DATABASE_URL -f scripts/migrate-assignments.sql
-- Re-running is safe (IF NOT EXISTS).
-- ──────────────────────────────────────────────────────────

-- Stores assignment submissions by students
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id   TEXT        NOT NULL,  -- matches sub_module_id in curriculum JSONB
  student_id      UUID        NOT NULL REFERENCES students(id)  ON DELETE CASCADE,
  course_id       TEXT        NOT NULL REFERENCES courses(id)   ON DELETE CASCADE,
  week_id         TEXT        NOT NULL,
  day_id          TEXT        NOT NULL,
  submitted_text  TEXT        NOT NULL,
  submitted_at    TIMESTAMP   DEFAULT NOW(),
  status          TEXT        DEFAULT 'pending', -- pending | approved | rejected
  feedback        TEXT,
  reviewed_at     TIMESTAMP,
  reviewed_by     UUID        REFERENCES admins(id),
  UNIQUE(assignment_id, student_id)
);

-- Add submitted_files column if it doesn't exist (added later)
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS submitted_files JSONB;

-- Add progress_state column to students if it doesn't exist
ALTER TABLE students ADD COLUMN IF NOT EXISTS progress_state JSONB;

