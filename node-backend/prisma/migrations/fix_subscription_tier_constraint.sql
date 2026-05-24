-- ============================================================
-- Remove CHECK constraints on subscription_tier (tenants) and
-- plan (subscriptions) that block valid plan values like 'wedding'.
-- The Node.js backend already validates allowed values in code.
-- Safe to run more than once — IF EXISTS guards each DROP.
-- Run this in Supabase SQL Editor.
-- ============================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop all CHECK constraints on tenants.subscription_tier
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'tenants'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%subscription_tier%'
  LOOP
    EXECUTE 'ALTER TABLE tenants DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    RAISE NOTICE 'Dropped constraint % on tenants', r.conname;
  END LOOP;

  -- Drop all CHECK constraints on subscriptions.plan
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'subscriptions'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%plan%'
  LOOP
    EXECUTE 'ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    RAISE NOTICE 'Dropped constraint % on subscriptions', r.conname;
  END LOOP;

  -- Drop all CHECK constraints on tenants.subscription_status
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'tenants'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%subscription_status%'
  LOOP
    EXECUTE 'ALTER TABLE tenants DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    RAISE NOTICE 'Dropped constraint % on tenants (subscription_status)', r.conname;
  END LOOP;
END $$;

-- Verify: list remaining CHECK constraints on these tables
SELECT
  t.relname   AS table_name,
  c.conname   AS constraint_name,
  pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
WHERE t.relname IN ('tenants', 'subscriptions')
  AND c.contype = 'c'
ORDER BY t.relname, c.conname;
