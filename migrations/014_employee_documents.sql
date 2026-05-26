-- ============================================================
-- 014_employee_documents.sql
-- Employee document attachments stored in the private S3 bucket.
-- Dependencies: 010_employees.sql (employees)
-- ============================================================

CREATE TABLE IF NOT EXISTS employee_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  -- doc_type values: 'aadhaar' | 'pan' | 'passbook' | 'sslc' | 'plusTwo' | 'degree' | 'pg' | 'other'
  doc_type     VARCHAR(50)  NOT NULL,
  -- Human-readable label; used for 'other' doc types supplied by the admin
  doc_name     VARCHAR(150),
  s3_key       TEXT         NOT NULL,
  file_name    TEXT         NOT NULL,
  file_type    VARCHAR(100) NOT NULL,
  file_size    INTEGER      NOT NULL,
  uploaded_by  UUID REFERENCES admin_accounts(id),
  uploaded_at  TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON TABLE  employee_documents               IS 'Private S3 document attachments per employee';
COMMENT ON COLUMN employee_documents.doc_type      IS 'aadhaar | pan | passbook | sslc | plusTwo | degree | pg | other';
COMMENT ON COLUMN employee_documents.doc_name      IS 'Human label — populated for doc_type=other';
COMMENT ON COLUMN employee_documents.s3_key        IS 'Private S3 key — fetch presigned URL on demand, never expose raw';

CREATE INDEX IF NOT EXISTS idx_employee_documents_employee_id
  ON employee_documents (employee_id);
