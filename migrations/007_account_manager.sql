-- Account Manager migration
-- Run after 006_rbac.sql

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  type VARCHAR(50) NOT NULL,              -- cash | bank | digital_wallet | petty_cash
  account_number VARCHAR(100),
  opening_balance NUMERIC(12,2) DEFAULT 0,
  current_balance NUMERIC(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES admin_accounts(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS account_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,              -- income | expense
  color VARCHAR(20),
  icon VARCHAR(50),                       -- lucide icon name
  is_system BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS account_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL,              -- income | expense | transfer
  account_id UUID REFERENCES accounts(id),
  to_account_id UUID REFERENCES accounts(id),
  category_id UUID REFERENCES account_categories(id),
  amount NUMERIC(12,2) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  reference_number VARCHAR(100),
  bill_status VARCHAR(20) DEFAULT 'not_required', -- attached | pending | not_required
  status VARCHAR(20) DEFAULT 'confirmed', -- confirmed | pending | void
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_interval VARCHAR(20),         -- monthly | weekly | yearly
  created_by UUID REFERENCES admin_accounts(id),
  voided_by UUID REFERENCES admin_accounts(id),
  voided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS account_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES account_transactions(id) ON DELETE CASCADE,
  s3_key TEXT NOT NULL,                   -- store key only, NEVER the URL
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID REFERENCES admin_accounts(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS account_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL,            -- created | updated | voided | restored | deleted
  changed_by UUID REFERENCES admin_accounts(id),
  changes JSONB,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);
