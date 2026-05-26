-- Migration: add_guest_checkin_and_support
-- Adds guest QR check-in tables and platform support system tables
-- NOTE: event_id and user_id columns use TEXT to match existing table column types

-- ── 1. Event: guest check-in feature flags ────────────────────────────────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS guest_checkin_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS guest_checkin_otp_expiry_minutes INTEGER NOT NULL DEFAULT 10;

-- ── 2. Guest check-in attempts (OTP flow) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS guest_checkin_attempts (
  attempt_id      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id        TEXT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  guest_name      TEXT,
  otp_code        TEXT,
  otp_expires_at  TIMESTAMPTZ,
  verified_at     TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'pending',
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, email)
);

CREATE INDEX IF NOT EXISTS idx_guest_checkin_attempts_event_id ON guest_checkin_attempts(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_checkin_attempts_status   ON guest_checkin_attempts(status);

-- ── 3. Guest check-ins (confirmed check-in records) ───────────────────────────
CREATE TABLE IF NOT EXISTS guest_checkins (
  checkin_id    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id      TEXT NOT NULL REFERENCES events(event_id),
  email         TEXT NOT NULL,
  guest_name    TEXT,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address    INET
);

CREATE INDEX IF NOT EXISTS idx_guest_checkins_event_id ON guest_checkins(event_id);

-- ── 4. Support tickets ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  ticket_id   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id     TEXT REFERENCES users(user_id),
  email       TEXT NOT NULL,
  subject     TEXT NOT NULL,
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open',
  priority    TEXT NOT NULL DEFAULT 'normal',
  assigned_to TEXT REFERENCES users(user_id),
  resolution  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status     ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id    ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- ── 5. Support messages (per-ticket conversation thread) ──────────────────────
CREATE TABLE IF NOT EXISTS support_messages (
  message_id  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ticket_id   TEXT NOT NULL REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);

-- ── 6. Chatbot conversations ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chatbot_conversations (
  conversation_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id         TEXT REFERENCES users(user_id),
  session_token   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user_id       ON chatbot_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_session_token ON chatbot_conversations(session_token);

-- ── 7. Chatbot messages ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chatbot_messages (
  message_id      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  conversation_id TEXT NOT NULL REFERENCES chatbot_conversations(conversation_id) ON DELETE CASCADE,
  role            TEXT NOT NULL,
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_messages_conversation_id ON chatbot_messages(conversation_id);

-- ── 8. Auto-update updated_at for support_tickets ─────────────────────────────
CREATE OR REPLACE FUNCTION update_support_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_support_ticket_updated_at();

-- ── 9. RLS: disable RLS on new tables (backend enforces access) ───────────────
ALTER TABLE guest_checkin_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE guest_checkins         DISABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets        DISABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages       DISABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_conversations  DISABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_messages       DISABLE ROW LEVEL SECURITY;
