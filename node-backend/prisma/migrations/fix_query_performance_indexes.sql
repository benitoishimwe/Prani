-- ============================================================
-- Query Performance & Unused Index Fix
-- Source: Supabase Query Performance Advisor (Index Advisor)
--
-- Top slow queries and their index recommendations:
--   audit_logs timestamp  → 66.7% of total query time (93 calls, 15ms max)
--   messages tenant_id    → 12.7% (113 calls)
--   transactions staff_id →  5.7% (18 calls)
--   messages recipient_id →  5.1% (148 calls)
--   messages sender_id    →  4.4% (148 calls)
-- ============================================================

-- ─── 1. audit_logs: index on timestamp (ORDER BY timestamp DESC) ─────────────
-- This single index eliminates 66.7% of slow query time.
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp
  ON public.audit_logs USING btree ("timestamp" DESC);

-- ─── 2. messages: indexes for tenant_id, recipient_id, sender_id ─────────────
-- All three message queries filter by tenant_id. Also index recipient_id and
-- sender_id which are used in correlated subqueries.
CREATE INDEX IF NOT EXISTS idx_messages_tenant_id
  ON public.messages USING btree (tenant_id);

CREATE INDEX IF NOT EXISTS idx_messages_recipient_id
  ON public.messages USING btree (recipient_id)
  WHERE recipient_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_sender_id
  ON public.messages USING btree (sender_id);

-- ─── 3. transactions: index on staff_id ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transactions_staff_id
  ON public.transactions USING btree (staff_id);

-- ─── 4. Drop the one genuinely unused index ──────────────────────────────────
-- prani_schema_history is a migration-tracking table never queried by the app.
-- All other "Unused Index" linter suggestions are kept intentionally:
-- the database is new — pg_stat_user_indexes has not yet accumulated scans.
DROP INDEX IF EXISTS public.prani_schema_history_s_idx;
