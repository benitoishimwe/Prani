-- Fix Migration: Correct notifications foreign key type mismatch
-- Run in Supabase SQL editor or via: psql $DATABASE_URL -f this_file.sql
--
-- Root cause: notifications.user_id was defined as UUID, but users.user_id
-- in the actual database is TEXT. PostgreSQL FK columns must have identical types.
-- PostgreSQL error format: "incompatible types: [referencing] and [referenced]"
-- => "uuid and text" means notifications.user_id=uuid, users.user_id=text.
--
-- FIRST: confirm the actual types (run this SELECT before the migration):
--   SELECT column_name, data_type
--   FROM information_schema.columns
--   WHERE table_name IN ('users', 'tenants')
--     AND column_name IN ('user_id', 'tenant_id')
--   ORDER BY table_name;

-- ─── Step 1: Drop the broken table ────────────────────────────────────────────
DROP TABLE IF EXISTS notifications CASCADE;

-- ─── Step 2: Patch event_tasks (safe; skips if columns already exist) ─────────
ALTER TABLE event_tasks
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status      TEXT NOT NULL DEFAULT 'todo';

-- ─── Step 3: Recreate notifications matching the actual column types ──────────
-- user_id and tenant_id are TEXT to match users.user_id / tenants.tenant_id.
-- notification_id stays UUID (its own PK, no FK dependency).
-- resource_id stays UUID (no FK, just a reference hint — safe as UUID).
CREATE TABLE notifications (
  notification_id TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id         TEXT        NOT NULL REFERENCES users(user_id)     ON DELETE CASCADE,
  tenant_id       TEXT        NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  type            TEXT        NOT NULL,
  title           TEXT        NOT NULL,
  body            TEXT,
  resource_id     TEXT,
  resource_type   TEXT,
  is_read         BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Step 4: Indexes ──────────────────────────────────────────────────────────
CREATE INDEX idx_notifications_user_id    ON notifications (user_id);
CREATE INDEX idx_notifications_user_read  ON notifications (user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications (created_at DESC);

-- ─── Step 5: Row Level Security ───────────────────────────────────────────────
-- Backend is Prisma + JWT (not Supabase Auth), so auth.uid() is unavailable.
-- RLS is enabled but the single policy allows all access — the Node.js backend
-- already enforces tenant/user isolation via middleware.
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backend_full_access" ON notifications
  USING (true)
  WITH CHECK (true);

-- ─── Optional: upgrade to UUID later ─────────────────────────────────────────
-- If you want pure UUID columns across the board, run this AFTER the above:
--
--   ALTER TABLE users     ALTER COLUMN user_id   TYPE UUID USING user_id::uuid;
--   ALTER TABLE tenants   ALTER COLUMN tenant_id TYPE UUID USING tenant_id::uuid;
--   -- then re-run this migration replacing TEXT with UUID on notifications.
--
-- Only safe if every stored value is already a valid UUID string.
