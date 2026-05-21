-- Migration: add task assignment fields and notifications table
-- Run via: psql $DATABASE_URL -f this_file.sql
-- OR via Supabase SQL editor

-- 1. Add assigned_at to event_tasks (assigned_to already exists)
ALTER TABLE event_tasks
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- 2. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  tenant_id       UUID        NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  type            TEXT        NOT NULL,
  title           TEXT        NOT NULL,
  body            TEXT,
  resource_id     UUID,
  resource_type   TEXT,
  is_read         BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id   ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read   ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);
