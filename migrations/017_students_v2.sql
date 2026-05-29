-- ============================================================
-- 017_students_v2.sql
-- Rebuilds the student entity into two clean tables:
--   students        — core identity + contact fields
--   student_profiles — extended academic profile (all optional)
-- Dependencies: migrate.sql (students), 016_sync_permissions.sql
-- ============================================================

-- ── 1. Extend the existing `students` table ──────────────────────────────────
-- All ADD COLUMN IF NOT EXISTS calls are safe to re-run.

-- Basic identity / contact
ALTER TABLE students ADD COLUMN IF NOT EXISTS phone           TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS date_of_birth   DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS gender          TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS address         TEXT;

-- Emergency contact (all three travel together, all optional)
ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_contact_name     TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_contact_phone    TEXT;

-- Student type: 'online' | 'offline'
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_type    TEXT
  CHECK (student_type IN ('online', 'offline'));

-- Profile image stored in the public S3 bucket (URL, not a key)
ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

-- Lifecycle
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_active        BOOLEAN     DEFAULT TRUE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT NOW();

-- Rename legacy `phone_number` → `phone` only if the old column still exists
-- (the ADD COLUMN above is a no-op if `phone` already existed; the old
--  `phone_number` column stays untouched — apps must migrate reads to `phone`)

-- Back-fill updated_at for existing rows
UPDATE students SET updated_at = created_at WHERE updated_at IS NULL;

COMMENT ON TABLE  students                              IS 'Core student identity and contact details';
COMMENT ON COLUMN students.phone                        IS 'Primary phone number';
COMMENT ON COLUMN students.gender                       IS 'male | female | other | prefer_not_to_say';
COMMENT ON COLUMN students.emergency_contact_name       IS 'Emergency contact person name (optional)';
COMMENT ON COLUMN students.emergency_contact_relation   IS 'Relation to student, e.g. Parent, Sibling (optional)';
COMMENT ON COLUMN students.emergency_contact_phone      IS 'Emergency contact phone number (optional)';
COMMENT ON COLUMN students.student_type                 IS 'online | offline — mode of learning';
COMMENT ON COLUMN students.profile_image_url            IS 'Full public S3 URL to profile photo (optional)';
COMMENT ON COLUMN students.is_active                    IS 'Soft-delete flag; FALSE = deactivated student';
COMMENT ON COLUMN students.updated_at                   IS 'Last record modification timestamp';

-- ── 2. Create `student_profiles` ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS student_profiles (
  -- ── Identity ──────────────────────────────────────────────────────────────
  student_id              UUID PRIMARY KEY
    REFERENCES students(id) ON DELETE CASCADE,

  -- ── Academic background (all optional) ───────────────────────────────────
  highest_qualification   TEXT,
  -- e.g. 'SSLC' | 'Plus Two' | 'Diploma' | 'UG' | 'PG' | 'PhD' | 'Other'

  current_status          TEXT,
  -- e.g. 'studying' | 'employed' | 'self_employed' | 'unemployed' | 'other'

  year_of_passing         SMALLINT,
  -- 4-digit year, e.g. 2023

  certification_url       TEXT,
  -- Public S3 URL to uploaded qualification certificate

  -- ── Verification ─────────────────────────────────────────────────────────
  id_proof_url            TEXT,
  -- Public S3 URL to uploaded ID proof (Aadhaar / Passport / Driving Licence)

  verification_status     TEXT DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),

  verified_by             UUID REFERENCES admin_accounts(id) ON DELETE SET NULL,
  verified_at             TIMESTAMPTZ,

  -- ── Audit ─────────────────────────────────────────────────────────────────
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  student_profiles                          IS 'Extended academic profile — one row per student, all fields optional except student_id';
COMMENT ON COLUMN student_profiles.student_id              IS 'PK + FK → students.id; 1-to-1 relationship';
COMMENT ON COLUMN student_profiles.highest_qualification   IS 'SSLC | Plus Two | Diploma | UG | PG | PhD | Other';
COMMENT ON COLUMN student_profiles.current_status          IS 'studying | employed | self_employed | unemployed | other';
COMMENT ON COLUMN student_profiles.year_of_passing         IS '4-digit year of highest qualification completion';
COMMENT ON COLUMN student_profiles.certification_url       IS 'Public S3 URL to qualification certificate';
COMMENT ON COLUMN student_profiles.id_proof_url            IS 'Public S3 URL to government-issued ID proof';
COMMENT ON COLUMN student_profiles.verification_status     IS 'pending | verified | rejected — set by admin after reviewing documents';
COMMENT ON COLUMN student_profiles.verified_by             IS 'FK to admin_accounts.id — the admin who verified the profile';
COMMENT ON COLUMN student_profiles.verified_at             IS 'Timestamp of last verification action';

-- ── 3. Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_students_is_active
  ON students (is_active);

CREATE INDEX IF NOT EXISTS idx_students_student_type
  ON students (student_type);

CREATE INDEX IF NOT EXISTS idx_student_profiles_verification_status
  ON student_profiles (verification_status)
  WHERE verification_status = 'pending';
-- Partial index speeds up the admin "pending verifications" queue

-- ── 4. Auto-seed a student_profiles row when a student is created ─────────────
-- This trigger ensures every student always has exactly one profile row.

CREATE OR REPLACE FUNCTION fn_seed_student_profile()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO student_profiles (student_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_student_profile ON students;
CREATE TRIGGER trg_seed_student_profile
  AFTER INSERT ON students
  FOR EACH ROW EXECUTE FUNCTION fn_seed_student_profile();

-- Back-fill student_profiles for existing students who don't have one yet
INSERT INTO student_profiles (student_id)
SELECT id FROM students
WHERE id NOT IN (SELECT student_id FROM student_profiles)
ON CONFLICT DO NOTHING;

-- ── 5. Permissions — add 'student_profiles' module ───────────────────────────

INSERT INTO permissions (module, action, description)
VALUES
  ('student_profiles', 'view',   'View student profile and documents'),
  ('student_profiles', 'edit',   'Edit student profile fields'),
  ('student_profiles', 'verify', 'Verify or reject student ID proof and documents')
ON CONFLICT (module, action) DO NOTHING;

-- Grant super_admin + admin: all student_profiles permissions
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT ar.id, p.id
FROM admin_roles ar
CROSS JOIN permissions p
WHERE ar.name IN ('super_admin', 'admin')
  AND p.module = 'student_profiles'
ON CONFLICT DO NOTHING;

-- Grant support: view only
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT ar.id, p.id
FROM admin_roles ar
CROSS JOIN permissions p
WHERE ar.name = 'support'
  AND p.module = 'student_profiles'
  AND p.action = 'view'
ON CONFLICT DO NOTHING;
