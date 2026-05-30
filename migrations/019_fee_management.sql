-- ============================================================
-- 019_fee_management.sql
-- Schema: public
-- Tables: courses (alter), student_courses (alter),
--         student_installments, student_payment_logs,
--         student_fee_waivers, account_transactions (alter)
-- Purpose: Complete fee management system for course enrollments
-- Dependencies: 006_rbac.sql (admin_accounts, permissions),
--               017_students_v2.sql (students),
--               007_account_manager.sql (account_transactions)
-- ============================================================

-- ── 1. Extend `courses` with pricing fields ───────────────────────────────────

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS one_time_price            NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS installment_total_price   NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS default_installment_count INTEGER,
  ADD COLUMN IF NOT EXISTS default_installment_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS grace_period_days         INTEGER DEFAULT 3;

COMMENT ON COLUMN courses.one_time_price             IS 'Discounted lump-sum price when paid in full';
COMMENT ON COLUMN courses.installment_total_price    IS 'Total price when paid via installments (may be higher than one_time_price)';
COMMENT ON COLUMN courses.default_installment_count  IS 'Number of monthly installments offered by default';
COMMENT ON COLUMN courses.default_installment_amount IS 'Per-installment amount (installment_total_price / default_installment_count); stored for quick reads';
COMMENT ON COLUMN courses.grace_period_days          IS 'Days after due_date before an installment is flagged overdue (default 3)';

-- ── 2. Extend `student_courses` with payment plan fields ──────────────────────

ALTER TABLE student_courses
  ADD COLUMN IF NOT EXISTS payment_type             TEXT
    CHECK (payment_type IN ('one_time', 'installment')),
  ADD COLUMN IF NOT EXISTS is_plan_customized       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS custom_installment_count INTEGER,
  ADD COLUMN IF NOT EXISTS custom_installment_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS plan_start_date          DATE;

COMMENT ON COLUMN student_courses.payment_type              IS 'one_time | installment — how the student pays for this course';
COMMENT ON COLUMN student_courses.is_plan_customized        IS 'TRUE when admin has overridden the course default installment plan';
COMMENT ON COLUMN student_courses.custom_installment_count  IS 'Custom number of installments (overrides course default)';
COMMENT ON COLUMN student_courses.custom_installment_amount IS 'Custom per-installment amount (overrides course default)';
COMMENT ON COLUMN student_courses.plan_start_date           IS 'Date from which installment due dates are calculated';

-- ── 3. Create `student_installments` ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS student_installments (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id            UUID NOT NULL
    REFERENCES student_courses(id) ON DELETE CASCADE,
  installment_number       INTEGER NOT NULL,
  due_date                 DATE NOT NULL,
  total_amount             NUMERIC(12,2) NOT NULL,
  paid_amount              NUMERIC(12,2) NOT NULL DEFAULT 0,
  status                   TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'paid', 'partially_paid', 'overdue', 'waived')),
  is_status_auto_calculated BOOLEAN NOT NULL DEFAULT TRUE,
  overpayment_reduction    NUMERIC(12,2) NOT NULL DEFAULT 0,
  waiver_reduction         NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_installment_amounts
    CHECK (total_amount >= 0 AND paid_amount >= 0 AND paid_amount <= total_amount)
);

COMMENT ON TABLE  student_installments                          IS 'Individual installment rows for a student enrollment payment plan';
COMMENT ON COLUMN student_installments.enrollment_id           IS 'FK → student_courses.id — the enrollment this installment belongs to';
COMMENT ON COLUMN student_installments.installment_number      IS 'Sequential number: 1 = first installment, 2 = second, etc.';
COMMENT ON COLUMN student_installments.due_date                IS 'Calendar date by which this installment should be paid';
COMMENT ON COLUMN student_installments.total_amount            IS 'Full amount due for this installment (reduced by waivers and overpayment cascades)';
COMMENT ON COLUMN student_installments.paid_amount             IS 'Amount received so far (sum of all payment_log entries for this installment)';
COMMENT ON COLUMN student_installments.status                  IS 'upcoming | paid | partially_paid | overdue | waived — auto-derived unless is_status_auto_calculated = FALSE';
COMMENT ON COLUMN student_installments.is_status_auto_calculated IS 'When FALSE the status was manually set (e.g. waived) and must not be overwritten by recalculate_installment_status()';
COMMENT ON COLUMN student_installments.overpayment_reduction   IS 'Amount by which this installment was reduced due to overpayment cascade from a previous payment';
COMMENT ON COLUMN student_installments.waiver_reduction        IS 'Total amount waived on this installment by admin-applied fee waivers';

CREATE INDEX IF NOT EXISTS idx_student_installments_enrollment_id
  ON student_installments (enrollment_id);

CREATE INDEX IF NOT EXISTS idx_student_installments_status
  ON student_installments (status)
  WHERE status IN ('upcoming', 'overdue');

CREATE INDEX IF NOT EXISTS idx_student_installments_due_date
  ON student_installments (due_date);

-- ── 4. Create `student_payment_logs` ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS student_payment_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_id   UUID NOT NULL
    REFERENCES student_installments(id) ON DELETE RESTRICT,
  enrollment_id    UUID NOT NULL
    REFERENCES student_courses(id) ON DELETE RESTRICT,
  student_id       UUID NOT NULL
    REFERENCES students(id) ON DELETE RESTRICT,
  amount_paid      NUMERIC(12,2) NOT NULL
    CHECK (amount_paid > 0),
  payment_date     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_mode     TEXT NOT NULL
    CHECK (payment_mode IN ('cash', 'upi', 'bank_transfer', 'cheque', 'other')),
  reference_number TEXT,
  recorded_by      UUID NOT NULL
    REFERENCES admin_accounts(id) ON DELETE RESTRICT,
  notes            TEXT,
  entry_type       TEXT NOT NULL
    CHECK (entry_type IN ('payment', 'waiver', 'adjustment')),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  student_payment_logs                   IS 'Immutable audit log of every payment, waiver, and adjustment against a student installment';
COMMENT ON COLUMN student_payment_logs.installment_id   IS 'FK → student_installments.id — which installment was paid';
COMMENT ON COLUMN student_payment_logs.enrollment_id    IS 'Denormalized FK → student_courses.id for fast ledger queries';
COMMENT ON COLUMN student_payment_logs.student_id       IS 'Denormalized FK → students.id for fast per-student reports';
COMMENT ON COLUMN student_payment_logs.amount_paid      IS 'Amount applied to the installment in this log entry';
COMMENT ON COLUMN student_payment_logs.payment_mode     IS 'cash | upi | bank_transfer | cheque | other';
COMMENT ON COLUMN student_payment_logs.reference_number IS 'Optional UPI ref, cheque no., bank transaction ID, etc.';
COMMENT ON COLUMN student_payment_logs.recorded_by      IS 'FK → admin_accounts.id — the admin who recorded this entry';
COMMENT ON COLUMN student_payment_logs.entry_type       IS 'payment | waiver | adjustment — purpose of this log entry';

CREATE INDEX IF NOT EXISTS idx_student_payment_logs_installment_id
  ON student_payment_logs (installment_id);

CREATE INDEX IF NOT EXISTS idx_student_payment_logs_enrollment_id
  ON student_payment_logs (enrollment_id);

CREATE INDEX IF NOT EXISTS idx_student_payment_logs_student_id
  ON student_payment_logs (student_id);

-- ── 5. Create `student_fee_waivers` ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS student_fee_waivers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id   UUID NOT NULL
    REFERENCES student_courses(id) ON DELETE RESTRICT,
  installment_id  UUID
    REFERENCES student_installments(id) ON DELETE RESTRICT,
  waiver_type     TEXT NOT NULL
    CHECK (waiver_type IN ('full', 'partial')),
  waiver_amount   NUMERIC(12,2) NOT NULL
    CHECK (waiver_amount > 0),
  reason          TEXT NOT NULL
    CHECK (reason IN (
      'merit', 'financial_need', 'staff_child',
      'special_circumstance', 'management_decision', 'other'
    )),
  internal_notes  TEXT,
  approved_by     UUID NOT NULL
    REFERENCES admin_accounts(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  student_fee_waivers                  IS 'Fee waivers approved by admin — either for a single installment or the whole course';
COMMENT ON COLUMN student_fee_waivers.enrollment_id   IS 'FK → student_courses.id — the affected enrollment';
COMMENT ON COLUMN student_fee_waivers.installment_id  IS 'FK → student_installments.id — NULL means waiver applies to the entire course fee';
COMMENT ON COLUMN student_fee_waivers.waiver_type     IS 'full | partial';
COMMENT ON COLUMN student_fee_waivers.waiver_amount   IS 'Monetary amount waived';
COMMENT ON COLUMN student_fee_waivers.reason          IS 'merit | financial_need | staff_child | special_circumstance | management_decision | other';
COMMENT ON COLUMN student_fee_waivers.internal_notes  IS 'Internal admin notes — not shown to students';
COMMENT ON COLUMN student_fee_waivers.approved_by     IS 'FK → admin_accounts.id — the admin who approved the waiver';

CREATE INDEX IF NOT EXISTS idx_student_fee_waivers_enrollment_id
  ON student_fee_waivers (enrollment_id);

-- ── 6. Extend `account_transactions` with fee management links ────────────────

ALTER TABLE account_transactions
  ADD COLUMN IF NOT EXISTS student_id     UUID REFERENCES students(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS enrollment_id  UUID REFERENCES student_courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS installment_id UUID REFERENCES student_installments(id) ON DELETE SET NULL;

COMMENT ON COLUMN account_transactions.student_id     IS 'Optional: links an income transaction to the paying student';
COMMENT ON COLUMN account_transactions.enrollment_id  IS 'Optional: links a transaction to the specific course enrollment';
COMMENT ON COLUMN account_transactions.installment_id IS 'Optional: links a transaction to a specific installment row';

-- ── 7. RBAC — fee_management permissions ─────────────────────────────────────

INSERT INTO permissions (module, action, description)
VALUES
  ('fee_management', 'view',   'View student payment plans, installments, and payment history'),
  ('fee_management', 'create', 'Record payments, waivers, and adjustments'),
  ('fee_management', 'edit',   'Edit payment plan details and installment schedules'),
  ('fee_management', 'delete', 'Void or delete payment log entries')
ON CONFLICT (module, action) DO NOTHING;

-- Grant super_admin + admin: full fee_management access
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT ar.id, p.id
FROM admin_roles ar
CROSS JOIN permissions p
WHERE ar.name IN ('super_admin', 'admin')
  AND p.module = 'fee_management'
ON CONFLICT DO NOTHING;

-- Grant account_manager: full fee_management access
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT ar.id, p.id
FROM admin_roles ar
CROSS JOIN permissions p
WHERE ar.name = 'account_manager'
  AND p.module = 'fee_management'
ON CONFLICT DO NOTHING;

-- Grant support: view only
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT ar.id, p.id
FROM admin_roles ar
CROSS JOIN permissions p
WHERE ar.name = 'support'
  AND p.module = 'fee_management'
  AND p.action = 'view'
ON CONFLICT DO NOTHING;
