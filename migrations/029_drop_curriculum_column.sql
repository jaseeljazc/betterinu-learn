-- ============================================================
-- 029_drop_curriculum_column.sql
-- Phase 5 cleanup: removes the legacy courses.curriculum JSONB
-- column now that all curriculum data lives in course_weeks.
--
-- SAFE APPROACH: rename to curriculum_backup first so data can
-- be recovered if needed, then drop in a future migration.
--
-- Also adds a named position index matching the Phase 5 spec
-- (idx_course_weeks_position). The functionally identical index
-- idx_course_weeks_course_id from migration 028 is kept for
-- backward compatibility.
-- ============================================================

-- ── 1. Rename the old JSONB column (non-destructive) ──────────────────────────
ALTER TABLE courses
  RENAME COLUMN curriculum TO curriculum_backup;

COMMENT ON COLUMN courses.curriculum_backup IS
  'Legacy JSONB curriculum column — renamed 2026-06 after migration to course_weeks. Safe to DROP once rollback window has passed.';

-- ── 2. Add the spec-named position index if not already present ───────────────
--    (migration 028 already created idx_course_weeks_course_id on the same
--     columns; this adds the alias name the spec requests.)

CREATE INDEX IF NOT EXISTS idx_course_weeks_position
  ON course_weeks (course_id, position);
