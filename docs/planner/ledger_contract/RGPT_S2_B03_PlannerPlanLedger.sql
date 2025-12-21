-- =========================================================
-- RGPT-S2-B-03 — Planner ↔ Decision Ledger Contract (SQL Draft)
-- Purpose: Append-only storage for planner.v1 ExecutionPlans
-- Target: Supabase/Postgres (schema: public by default; adjust if needed)
-- =========================================================

-- NOTE:
-- - This is a contract draft. Apply in a controlled migration flow.
-- - Append-only means: NO UPDATE/DELETE; only INSERT, and supersede via new row.

create table if not exists public.rgpt_planner_plan_ledger (
  id                bigserial primary key,
  created_at        timestamptz not null default now(),

  -- Identity
  plan_id           text not null,
  schema_version    text not null check (schema_version = 'planner.v1'),
  phase             text not null check (phase = 'S2'),
  status            text not null check (status in ('draft','proposed','approved','rejected','superseded')),

  -- Hash / integrity
  plan_hash         text not null check (plan_hash like 'sha256:%'),

  -- Fingerprints
  intent_hash       text not null check (intent_hash like 'sha256:%'),
  repo_state_hash   text not null check (repo_state_hash like 'sha256:%'),
  policy_state_hash text not null check (policy_state_hash like 'sha256:%'),

  -- Approval linkage
  approval_required boolean not null default false,
  approval_status   text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
  approval_ref      text null,   -- e.g., docs/ops/APPROVAL_REQUEST_*.md OR a ledger approval id

  -- Supersession model (append-only)
  supersedes_plan_id text null,  -- points to an older plan_id that this row supersedes

  -- Payload
  plan_json         jsonb not null,

  -- Constraints
  constraint uq_rgpt_planner_plan_id_hash unique (plan_id, plan_hash)
);

-- Helpful indexes
create index if not exists ix_rgpt_planner_plan_ledger_plan_id on public.rgpt_planner_plan_ledger (plan_id);
create index if not exists ix_rgpt_planner_plan_ledger_created_at on public.rgpt_planner_plan_ledger (created_at desc);
create index if not exists ix_rgpt_planner_plan_ledger_status on public.rgpt_planner_plan_ledger (status);
create index if not exists ix_rgpt_planner_plan_ledger_phase on public.rgpt_planner_plan_ledger (phase);

-- Optional: quickly fetch "latest" plan by plan_id
-- (For strict "latest", rely on created_at ordering.)
