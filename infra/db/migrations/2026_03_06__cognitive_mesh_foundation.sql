-- RGPT-CML-V1-01
-- Purpose: Non-breaking Cognitive Mesh foundation tables.
-- Note: This migration creates only minimal schema shells for V1.

create table if not exists public.cog_events (
  event_id text primary key,
  session_id text not null,
  source text not null,
  trust_class text not null,
  risk_score integer not null,
  processing_mode text not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cog_logs (
  log_id text primary key,
  event_id text not null references public.cog_events(event_id) on delete cascade,
  level text not null,
  message text not null,
  details_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cog_indexes (
  index_id text primary key,
  event_id text not null references public.cog_events(event_id) on delete cascade,
  session_id text not null,
  index_type text not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cog_memory_items (
  memory_id text primary key,
  session_id text not null,
  event_id text null references public.cog_events(event_id) on delete set null,
  tier text not null,
  content text not null,
  confidence numeric(6,5) not null default 0.0,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cog_reasoning_sessions (
  reasoning_session_id text primary key,
  session_id text not null,
  event_id text not null references public.cog_events(event_id) on delete cascade,
  processing_mode text not null,
  status text not null default 'planned',
  created_at timestamptz not null default now()
);

create table if not exists public.cog_reasoning_steps (
  reasoning_step_id text primary key,
  reasoning_session_id text not null references public.cog_reasoning_sessions(reasoning_session_id) on delete cascade,
  step_kind text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.cog_learning_events (
  learning_event_id text primary key,
  event_id text not null references public.cog_events(event_id) on delete cascade,
  disposition text not null,
  reason text null,
  created_at timestamptz not null default now()
);

create table if not exists public.cog_unlearning_events (
  unlearning_event_id text primary key,
  session_id text not null,
  event_id text null references public.cog_events(event_id) on delete set null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.cog_quarantine_items (
  quarantine_id text primary key,
  event_id text not null references public.cog_events(event_id) on delete cascade,
  session_id text not null,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create index if not exists ix_cog_events_session_created on public.cog_events (session_id, created_at desc);
create index if not exists ix_cog_logs_event_created on public.cog_logs (event_id, created_at desc);
create index if not exists ix_cog_indexes_session_created on public.cog_indexes (session_id, created_at desc);
create index if not exists ix_cog_memory_items_session_tier_created on public.cog_memory_items (session_id, tier, created_at desc);
