-- =========================================================
-- RocketGPT · RLS patch for public.rl_plans
-- Goal: allow public (anon + authenticated) to read plan catalog.
-- =========================================================

alter table if exists public.rl_plans enable row level security;

drop policy if exists "rl_plans_read_all" on public.rl_plans;

create policy "rl_plans_read_all"
  on public.rl_plans
  for select
  to public
  using (true);

-- =========================================================
-- END OF PATCH
-- =========================================================
