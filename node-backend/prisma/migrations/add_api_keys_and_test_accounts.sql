-- ============================================================
-- Add api_keys and test_accounts tables.
-- Run this in Supabase SQL Editor (one-time migration).
-- Safe: uses IF NOT EXISTS — harmless to run more than once.
-- ============================================================

-- 1. API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  key_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  created_by   TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  prefix       TEXT NOT NULL,
  key_hash     TEXT NOT NULL UNIQUE,
  scopes       TEXT[] NOT NULL DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_id  ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash    ON api_keys(key_hash);

-- 2. Test Accounts table
CREATE TABLE IF NOT EXISTS test_accounts (
  test_account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL,
  tenant_id       TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_by      TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  plan            TEXT NOT NULL DEFAULT 'pro',
  expires_at      TIMESTAMPTZ NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_test_accounts_tenant_id ON test_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_test_accounts_email     ON test_accounts(email);
CREATE INDEX IF NOT EXISTS idx_test_accounts_expires   ON test_accounts(expires_at) WHERE is_active = true;

-- Verify
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('api_keys', 'test_accounts')
ORDER BY table_name;
