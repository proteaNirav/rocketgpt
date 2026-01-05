-- RGPT-S4-A2 — Canonical Runtime Ledger (Execution + Decision)
-- Location: rocketgpt_v3_full/webapp/next/supabase/patch_runtime_canonical_ledger.sql
-- Strategy: patch-style SQL aligned to repo conventions
--
-- Features:
-- - rgpt.runtime_executions + rgpt.runtime_decisions
-- - idempotency_key uniqueness
-- - append-only enforcement via triggers (block UPDATE/DELETE)

begin;

create schema if not exists rgpt;

-- =========================
-- 1) Execution ledger
-- =========================
create table if not exists rgpt.runtime_executions (
  execution_id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,

  request_id text not null,
  run_id text null,

  parent_execution_id uuid null,
  root_execution_id uuid not null,

  actor_type text not null check (actor_type in ('human','ci','agent','system')),
  actor_id text not null,
  actor_display text null,

  runtime_mode text not null check (runtime_mode in ('normal','safe_mode','dry_run','read_only')),
  runtime_policy_version text null,
  safe_mode_reason_code text null,
  permissions_snapshot jsonb null,

  component text not null,
  operation text not null,
  target_ref text null,

  inputs_ref text null,
  inputs_hash text null,

  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  status text not null check (status in ('started','succeeded','failed','aborted','blocked')) default 'started',

  error_kind text null,
  error_message text null,

  metrics jsonb null,

  created_at timestamptz not null default now(),
  created_by text not null default 'server',
  ledger_version int not null default 1
);

create index if not exists ix_runtime_executions_request_id on rgpt.runtime_executions(request_id);
create index if not exists ix_runtime_executions_root_execution_id on rgpt.runtime_executions(root_execution_id);
create index if not exists ix_runtime_executions_run_id on rgpt.runtime_executions(run_id);
create index if not exists ix_runtime_executions_component_op on rgpt.runtime_executions(component, operation);
create index if not exists ix_runtime_executions_started_at on rgpt.runtime_executions(started_at desc);

-- =========================
-- 2) Decision ledger
-- =========================
create table if not exists rgpt.runtime_decisions (
  decision_id uuid primary key default gen_random_uuid(),
  execution_id uuid not null references rgpt.runtime_executions(execution_id) on delete restrict,

  decision_seq int not null,
  idempotency_key text not null unique,

  decision_type text not null check (decision_type in ('allow','deny','escalate','auto_fix','noop')),
  decision_scope text not null check (decision_scope in ('security','workflow','data','runtime','quality')),
  confidence double precision null,
  severity text not null check (severity in ('info','low','medium','high','critical')) default 'info',

  reason_code text not null,
  reason_text text not null,

  policy_refs jsonb null,
  evidence_refs jsonb null,

  recommended_action text null,
  patch_ref text null,
  requires_approval boolean not null default false,

  created_at timestamptz not null default now(),
  created_by text not null default 'server',
  ledger_version int not null default 1,

  constraint uq_runtime_decisions_execution_seq unique (execution_id, decision_seq)
);

create index if not exists ix_runtime_decisions_execution_id on rgpt.runtime_decisions(execution_id);
create index if not exists ix_runtime_decisions_reason_code on rgpt.runtime_decisions(reason_code);
create index if not exists ix_runtime_decisions_created_at on rgpt.runtime_decisions(created_at desc);

-- =========================
-- 3) Append-only enforcement (block update/delete)
-- =========================
create or replace function rgpt.fn_block_ledger_mutation()
returns trigger
language plpgsql
as patch_runtime_canonical_ledger.sql
begin
  raise exception 'Ledger is append-only: updates/deletes are not allowed';
end;
patch_runtime_canonical_ledger.sql;

drop trigger if exists trg_block_runtime_executions_ud on rgpt.runtime_executions;
create trigger trg_block_runtime_executions_ud
before update or delete on rgpt.runtime_executions
for each row execute function rgpt.fn_block_ledger_mutation();

drop trigger if exists trg_block_runtime_decisions_ud on rgpt.runtime_decisions;
create trigger trg_block_runtime_decisions_ud
before update or delete on rgpt.runtime_decisions
for each row execute function rgpt.fn_block_ledger_mutation();

commit;
