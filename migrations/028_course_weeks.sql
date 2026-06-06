-- ============================================================
-- 028_course_weeks.sql
-- Extracts the per-week curriculum data out of the courses.curriculum
-- JSONB column into a proper relational table so weeks can be loaded
-- one at a time instead of reading the entire curriculum on every request.
--
-- SAFE TO RE-RUN: CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS
--
-- Dependencies: migrate.sql (courses table — TEXT primary key)
-- ============================================================

-- ── 1. Create the course_weeks table ──────────────────────────────────────────
--
-- NOTE: course_id is TEXT (not UUID) because courses.id is a TEXT PK
--       (e.g. 'mern', 'python', 'hr').  The original spec had UUID but that
--       does not match the live schema.

CREATE TABLE IF NOT EXISTS course_weeks (
  id          TEXT        NOT NULL,
  course_id   TEXT        REFERENCES courses(id) ON DELETE CASCADE,
  position    INT         NOT NULL,
  title       TEXT        NOT NULL,
  is_locked   BOOLEAN     DEFAULT false,
  is_shared   BOOLEAN     DEFAULT false,
  days        JSONB       NOT NULL DEFAULT '[]',
  quiz        JSONB,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id, course_id)
);

COMMENT ON TABLE  course_weeks              IS 'One row per curriculum week; extracted from courses.curriculum JSONB for per-week lazy loading';
COMMENT ON COLUMN course_weeks.id          IS 'Week identifier — matches the id field inside the Week object (e.g. "week-1")';
COMMENT ON COLUMN course_weeks.course_id   IS 'FK → courses.id (TEXT). Cascade-deletes when the parent course is removed';
COMMENT ON COLUMN course_weeks.position    IS 'Zero-based index of this week within the course curriculum array';
COMMENT ON COLUMN course_weeks.title       IS 'Week display title';
COMMENT ON COLUMN course_weeks.is_locked   IS 'Whether this week is locked for students';
COMMENT ON COLUMN course_weeks.is_shared   IS 'Whether this week is shared across multiple courses';
COMMENT ON COLUMN course_weeks.days        IS 'JSON array of Day objects for this week (each Day contains sub-modules)';
COMMENT ON COLUMN course_weeks.quiz        IS 'Optional week-level quiz object';
COMMENT ON COLUMN course_weeks.created_at  IS 'Row creation timestamp';
COMMENT ON COLUMN course_weeks.updated_at  IS 'Last write timestamp — updated on every dual-write from the PUT /api/admin/courses/[id] route';

-- ── 2. Index for the most common access pattern: all weeks for a course ────────

CREATE INDEX IF NOT EXISTS idx_course_weeks_course_id
  ON course_weeks (course_id, position);
