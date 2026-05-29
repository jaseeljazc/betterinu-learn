-- ============================================================
-- 018_auto_verify_students.sql
-- Schema: public
-- Updates trigger to auto-verify newly seeded student profiles
-- and sets existing students to verified.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_seed_student_profile()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO student_profiles (student_id, verification_status)
  VALUES (NEW.id, 'verified')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Mark all current student profiles as verified
UPDATE student_profiles SET verification_status = 'verified';

-- Mark all current pending students as active
UPDATE students SET status = 'active' WHERE status = 'pending';
