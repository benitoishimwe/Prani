-- ============================================================
-- Drop the one genuinely unused index: prani_schema_history_s_idx
--
-- prani_schema_history is a migration-tracking table that is
-- never queried by the application at runtime.
--
-- All other "Unused Index" linter suggestions are intentionally
-- kept because:
--   - tenant_id indexes: queried on every request in a multi-tenant app
--   - idx_api_keys_key_hash: critical for API key authentication
--   - idx_subscriptions_stripe: required for Stripe webhook processing
--   - idx_invitations_token: used on every invite acceptance
--   - FK covering indexes (api_keys, event_tasks, etc.): prevent FK scans
--   - The database is new/low-traffic — pg_stat_user_indexes has not yet
--     accumulated enough scans to mark these as "used".
-- ============================================================

DROP INDEX IF EXISTS public.prani_schema_history_s_idx;
