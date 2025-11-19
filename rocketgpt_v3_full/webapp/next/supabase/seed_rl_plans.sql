-- =========================================================
-- RocketGPT · Seed script for public.rl_plans (UPSERT version)
-- Purpose: Baseline plan catalog for /api/limits
-- Scope:
--   - BRONZE (Free)
--   - SILVER (Standard)
--   - GOLD (Pro)
--
-- Assumes table:
--   public.rl_plans(
--     plan_code text primary key,
--     plan_name text,
--     per_minute integer,
--     per_hour integer,
--     monthly_price_inr integer,
--     monthly_price_usd integer
--   )
--
-- Usage:
--   1) Commit this file to Git.
--   2) Copy-paste into Supabase SQL editor and run once.
--   3) Adjust pricing/limits later as product evolves.
-- =========================================================

-- Upsert baseline plans (no deletes, safe with foreign keys)
insert into public.rl_plans (
  plan_code,
  plan_name,
  per_minute,
  per_hour,
  monthly_price_inr,
  monthly_price_usd
) values
  ('BRONZE', 'Bronze (Free)', 3, 60, 0, 0),
  ('SILVER', 'Silver',       10, 200, 499, 6),
  ('GOLD',   'Gold',         30, 600, 1499, 18)
on conflict (plan_code) do update
set
  plan_name         = excluded.plan_name,
  per_minute        = excluded.per_minute,
  per_hour          = excluded.per_hour,
  monthly_price_inr = excluded.monthly_price_inr,
  monthly_price_usd = excluded.monthly_price_usd;

-- =========================================================
-- END OF SEED SCRIPT (UPSERT)
-- =========================================================
