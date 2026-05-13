-- Run this migration to support the Quiz and Assignment system

-- Quiz results table
CREATE TABLE IF NOT EXISTS quiz_results (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id       TEXT          NOT NULL,
  student_id      TEXT          NOT NULL,
  course_id       TEXT          NOT NULL,
  week_id         TEXT          NOT NULL,
  day_id          TEXT          NOT NULL,
  score           FLOAT         NOT NULL DEFAULT 0,
  total_marks     FLOAT         NOT NULL DEFAULT 0,
  passed          BOOLEAN       NOT NULL DEFAULT FALSE,
  attempt_number  INT           NOT NULL DEFAULT 1,
  answers         JSONB,
  results         JSONB,
  submitted_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Index for fast student-specific lookups
CREATE INDEX IF NOT EXISTS quiz_results_student_module
  ON quiz_results (student_id, module_id, course_id);

-- Add module_id to assignment_submissions (links submission to SubModule)
ALTER TABLE assignment_submissions
  ADD COLUMN IF NOT EXISTS module_id TEXT;
