-- ============================================================
-- Security & Performance Hardening Migration
-- Run in Supabase SQL Editor (safe to re-run — uses IF NOT EXISTS / IF EXISTS).
--
-- Context: The Node.js backend uses the Prisma service-role key, which
-- bypasses RLS automatically. Enabling RLS with NO policies therefore:
--   - Blocks direct PostgREST access for anon/authenticated roles  ✓
--   - Leaves service-role (Prisma) fully operational                ✓
-- ============================================================

-- ─── 1. Enable RLS on all public tables that are missing it ──────────────────
-- (service_role bypasses RLS, so Prisma is unaffected)

ALTER TABLE public.shifts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_invitations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_otps              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prani_schema_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_types             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_features   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_portfolio        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_reviews          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_inquiries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_favorites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.save_the_date_designs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_onboarding       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_analytics        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_plans           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_media             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_budget_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_guests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_venues          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_menu_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_design_assets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants                 ENABLE ROW LEVEL SECURITY;

-- ─── 2. Fix notifications: drop the always-true policy ───────────────────────
-- USING (true) WITH CHECK (true) is flagged by the linter because it gives
-- unrestricted access to all roles. service_role bypasses RLS anyway, so
-- the policy is redundant and harmful.
DROP POLICY IF EXISTS "backend_full_access" ON public.notifications;

-- ─── 3. Fix function search_path to prevent search-path injection ─────────────
ALTER FUNCTION public.inventory_rented_stats()      SET search_path = public, pg_temp;
ALTER FUNCTION public.inventory_category_counts()   SET search_path = public, pg_temp;
ALTER FUNCTION public.inventory_distinct_categories() SET search_path = public, pg_temp;
ALTER FUNCTION public.transaction_type_counts()     SET search_path = public, pg_temp;
ALTER FUNCTION public.event_status_counts()         SET search_path = public, pg_temp;
ALTER FUNCTION public.users_by_role_counts()        SET search_path = public, pg_temp;
ALTER FUNCTION public.truncate_all_tables()         SET search_path = public, pg_temp;

-- ─── 4. Drop duplicate index on notifications ─────────────────────────────────
-- idx_notifications_user_read covers (user_id, is_read) — a superset of
-- idx_notifications_is_read which only covers (is_read). Drop the weaker one.
DROP INDEX IF EXISTS public.idx_notifications_is_read;

-- ─── 5. Add indexes for unindexed foreign keys ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by
  ON public.api_keys (created_by);

CREATE INDEX IF NOT EXISTS idx_event_tasks_assigned_to
  ON public.event_tasks (assigned_to);

CREATE INDEX IF NOT EXISTS idx_event_tasks_created_by
  ON public.event_tasks (created_by);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id
  ON public.notifications (tenant_id);

CREATE INDEX IF NOT EXISTS idx_payments_subscription_id
  ON public.payments (subscription_id);

CREATE INDEX IF NOT EXISTS idx_tenant_invitations_invited_by
  ON public.tenant_invitations (invited_by);

CREATE INDEX IF NOT EXISTS idx_test_accounts_created_by
  ON public.test_accounts (created_by);

CREATE INDEX IF NOT EXISTS idx_test_accounts_user_id
  ON public.test_accounts (user_id);

CREATE INDEX IF NOT EXISTS idx_vendor_favorites_vendor_id
  ON public.vendor_favorites (vendor_id);

CREATE INDEX IF NOT EXISTS idx_vendor_reviews_user_id
  ON public.vendor_reviews (user_id);

-- ─── Verify ──────────────────────────────────────────────────────────────────
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;
-- Expected: 0 rows (all tables now have RLS enabled)
