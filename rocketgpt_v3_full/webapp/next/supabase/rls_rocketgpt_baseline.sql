-- =========================================================
-- RocketGPT · Baseline RLS normalisation (v2, text/uuid fix)
-- Generated: 2025-11-18 19:57:55
--
-- Scope:
--   - public.guests
--   - public.rl_plans
--   - public.rl_user_plans
--
-- Note:
--   rl_user_plans.user_id is TEXT, auth.uid() is UUID
--   => compare as: user_id = auth.uid()::text
--
-- Usage:
--   1) Commit this file to Git.
--   2) Copy-paste into Supabase SQL editor and run once.
--   3) If policies with *other* names exist, review and clean up manually.
-- =========================================================

-- 1) GUESTS
-- Any client may insert a guest row (ID is a random token).
-- Authenticated users may read guest rows.

alter table if exists public.guests enable row level security;

drop policy if exists "guests_insert_any" on public.guests;
create policy "guests_insert_any"
  on public.guests
  for insert
  to public
  with check (true);

drop policy if exists "guests_select_authenticated" on public.guests;
create policy "guests_select_authenticated"
  on public.guests
  for select
  to authenticated
  using (true);

-- 2) RL_PLANS
-- Pricing/catalog table: read-only to all authenticated users.

alter table if exists public.rl_plans enable row level security;

drop policy if exists "rl_plans_read_all" on public.rl_plans;
create policy "rl_plans_read_all"
  on public.rl_plans
  for select
  to authenticated
  using (true);

-- 3) RL_USER_PLANS
-- Per-user plan mapping:
--   - user can see only their own row(s)
--   - user can insert/update only their own row(s)
--   - user_id is stored as TEXT, so we cast auth.uid()::text

alter table if exists public.rl_user_plans enable row level security;

drop policy if exists "rl_user_plans_select_own" on public.rl_user_plans;
create policy "rl_user_plans_select_own"
  on public.rl_user_plans
  for select
  to authenticated
  using (user_id = auth.uid()::text);

drop policy if exists "rl_user_plans_insert_own" on public.rl_user_plans;
create policy "rl_user_plans_insert_own"
  on public.rl_user_plans
  for insert
  to authenticated
  with check (user_id = auth.uid()::text);

drop policy if exists "rl_user_plans_update_own" on public.rl_user_plans;
create policy "rl_user_plans_update_own"
  on public.rl_user_plans
  for update
  to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

-- =========================================================
-- END OF BASELINE RLS SCRIPT (v2)
-- =========================================================
