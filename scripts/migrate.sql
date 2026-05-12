-- ──────────────────────────────────────────────────────────
-- LearnForge LMS — NeonDB Schema
-- Run: psql $NEON_DATABASE_URL -f scripts/migrate.sql
-- Re-running is safe (IF NOT EXISTS on every table).
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admins (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT        UNIQUE NOT NULL,
  firebase_uid TEXT        UNIQUE NOT NULL,
  created_at   TIMESTAMP   DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  email        TEXT        UNIQUE NOT NULL,
  firebase_uid TEXT        UNIQUE,        -- set after Firebase user is created
  created_at   TIMESTAMP   DEFAULT NOW()
);

-- Add new columns if they don't exist (safe for re-runs)
ALTER TABLE students ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_code TEXT UNIQUE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS enrollment_date DATE;

-- Only metadata fields. Week/day/subModule content stays in TypeScript.
CREATE TABLE IF NOT EXISTS courses (
  id             TEXT        PRIMARY KEY,   -- 'mern' | 'python' | 'hr' | 'marketing'
  title          TEXT        NOT NULL,
  tagline        TEXT,
  description    TEXT,
  instructor     TEXT,
  instructor_bio TEXT,
  duration       TEXT,
  total_modules  INT,
  level          TEXT,
  color          TEXT,                      -- CSS variable e.g. '--course-mern'
  icon           TEXT,                      -- Lucide icon name e.g. 'Code2'
  outcomes       JSONB,                     -- string[]
  is_active      BOOLEAN     DEFAULT TRUE,
  curriculum     JSONB,                     -- Array of Weeks (with days and modules)
  created_at     TIMESTAMP   DEFAULT NOW()
);

-- Add curriculum if it doesn't exist
ALTER TABLE courses ADD COLUMN IF NOT EXISTS curriculum JSONB;


-- Admin assigns a course to a student
CREATE TABLE IF NOT EXISTS student_courses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID        NOT NULL REFERENCES students(id)  ON DELETE CASCADE,
  course_id   TEXT        NOT NULL REFERENCES courses(id)   ON DELETE CASCADE,
  assigned_at TIMESTAMP   DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);

-- Per-student completion of individual sub-modules
-- All *_id TEXT columns reference exact id strings from the TypeScript data files.
CREATE TABLE IF NOT EXISTS student_progress (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id     TEXT        NOT NULL REFERENCES courses(id)  ON DELETE CASCADE,
  week_id       TEXT        NOT NULL,   -- Week.id     e.g. 'week-1'
  day_id        TEXT        NOT NULL,   -- Day.id      e.g. 'shared-web-day-1'
  sub_module_id TEXT        NOT NULL,   -- SubModule.id e.g. 'shared-web-how-internet-works'
  completed_at  TIMESTAMP   DEFAULT NOW(),
  UNIQUE(student_id, course_id, week_id, day_id, sub_module_id)
);

-- One row per quiz attempt
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id    TEXT        NOT NULL REFERENCES courses(id)  ON DELETE CASCADE,
  week_id      TEXT        NOT NULL,   -- Week.id
  quiz_id      TEXT        NOT NULL,   -- Quiz.id e.g. 'web-basics-week-1'
  score        INT         NOT NULL,
  passed       BOOLEAN     NOT NULL,
  answers      JSONB,                  -- { [questionId]: selectedIndex }
  attempted_at TIMESTAMP   DEFAULT NOW()
);
