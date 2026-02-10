-- RGPT-E2-RUNTIME-TIMELINE-SQL-01
-- Purpose: Runtime execution envelope + unified timeline events (append-only)

create table if not exists public.runtime_executions (
  execution_id text primary key,
  created_at timestamptz not null default now(),

  org_id text null,
  user_id text null,

  auth_context_hash text not null,
  policy_profile text not null,

  status text not null default 'created'
    check (status in ('created','locked','finalized','aborted','completed')),

  meta jsonb not null default '{}'::jsonb
);

create table if not exists public.runtime_timeline_events (
  id bigserial primary key,

  execution_id text not null references public.runtime_executions(execution_id) on delete cascade,

  event_id text not null,
  sequence_no int not null check (sequence_no >= 1),

  event_type text not null,
  layer int not null check (layer between 0 and 6),

  event_time_utc timestamptz not null,

  parent_event_id text null,
  caused_by_event_id text null,

  trigger_reason text null,
  decision_ref text null,

  actor_type text not null,
  actor_id text null,

  status text not null check (status in ('ok','blocked','partial','error','timeout','aborted')),

  authority jsonb not null,
  cat jsonb null,
  provider jsonb null,
  guards jsonb null,

  payload jsonb null,

  integrity jsonb null,

  created_at timestamptz not null default now(),

  constraint uq_timeline_event_unique unique (execution_id, sequence_no),
  constraint uq_event_id_per_execution unique (execution_id, event_id)
);

create index if not exists ix_timeline_exec_time on public.runtime_timeline_events (execution_id, event_time_utc);
create index if not exists ix_timeline_exec_type on public.runtime_timeline_events (execution_id, event_type);
create index if not exists ix_timeline_exec_layer on public.runtime_timeline_events (execution_id, layer);

-- Append-only enforcement (no UPDATE/DELETE)
create or replace function public.fn_block_update_delete_runtime_timeline()
returns trigger
language plpgsql
as $$
begin
  raise exception 'runtime_timeline_events is append-only';
end;
$$;

drop trigger if exists trg_runtime_timeline_no_update on public.runtime_timeline_events;
create trigger trg_runtime_timeline_no_update
before update on public.runtime_timeline_events
for each row execute function public.fn_block_update_delete_runtime_timeline();

drop trigger if exists trg_runtime_timeline_no_delete on public.runtime_timeline_events;
create trigger trg_runtime_timeline_no_delete
before delete on public.runtime_timeline_events
for each row execute function public.fn_block_update_delete_runtime_timeline();
