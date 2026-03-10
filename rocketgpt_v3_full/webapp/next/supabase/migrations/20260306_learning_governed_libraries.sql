-- Autonomous Learning + Governed Libraries
-- Minimal canonical learning schema for RSS + chat-derived learning lifecycle.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'learning_source_kind') then
    create type public.learning_source_kind as enum ('rss', 'chat');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'learning_item_status') then
    create type public.learning_item_status as enum ('proposed', 'approved', 'published', 'rejected', 'revoked', 'deprecated');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'learning_review_decision') then
    create type public.learning_review_decision as enum ('approve', 'reject', 'publish', 'revoke', 'deprecate');
  end if;
end $$;

create or replace function public.rgpt_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.rgpt_current_tenant_id()
returns uuid
language sql
stable
as $$
  select nullif(coalesce(auth.jwt() ->> 'tenant_id', ''), '')::uuid
$$;

create or replace function public.rgpt_is_tenant_admin()
returns boolean
language sql
stable
as $$
  select
    coalesce((auth.jwt() ->> 'role') in ('service_role','admin'), false)
    or coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

create or replace function public.rgpt_is_reviewer_or_admin()
returns boolean
language sql
stable
as $$
  select
    public.rgpt_is_tenant_admin()
    or coalesce((auth.jwt() ->> 'role') = 'reviewer', false)
    or coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'reviewer', false)
$$;

create table if not exists public.learning_settings (
  tenant_id uuid primary key,
  chat_learning_opt_out boolean not null default false,
  allow_user_chat_proposals boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  kind public.learning_source_kind not null,
  name text not null,
  source_url text null,
  enabled boolean not null default true,
  interval_minutes integer not null default 360 check (interval_minutes between 5 and 10080),
  created_by_user_id uuid null,
  last_run_at timestamptz null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_learning_sources_tenant_name unique (tenant_id, name)
);

create table if not exists public.learning_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  source_id uuid null references public.learning_sources(id) on delete set null,
  source_kind public.learning_source_kind not null,
  source_ref text null,
  title text not null,
  sanitized_content text not null,
  content_sha256 text not null,
  provenance_json jsonb not null default '{}'::jsonb,
  status public.learning_item_status not null default 'proposed',
  proposed_by_user_id uuid null,
  approved_by_user_id uuid null,
  approved_at timestamptz null,
  published_at timestamptz null,
  revoked_at timestamptz null,
  rejection_reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_learning_items_tenant_hash unique (tenant_id, content_sha256)
);

create table if not exists public.learning_topics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  topic_key text not null,
  display_name text not null,
  created_at timestamptz not null default now(),
  constraint uq_learning_topics_tenant_key unique (tenant_id, topic_key)
);

create table if not exists public.learning_item_topics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  item_id uuid not null references public.learning_items(id) on delete cascade,
  topic_id uuid not null references public.learning_topics(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_learning_item_topic unique (item_id, topic_id)
);

create table if not exists public.learning_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  item_id uuid not null references public.learning_items(id) on delete cascade,
  decision public.learning_review_decision not null,
  rationale text null,
  actor_user_id uuid null,
  before_status public.learning_item_status not null,
  after_status public.learning_item_status not null,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_library_paths (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  item_id uuid not null references public.learning_items(id) on delete cascade,
  library_id text not null,
  file_path text not null,
  content_sha256 text not null,
  published_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_learning_library_paths_item unique (item_id)
);

create table if not exists public.learning_redaction_audit (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  item_id uuid not null references public.learning_items(id) on delete cascade,
  redaction_count integer not null default 0,
  redaction_kinds jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_ingest_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  source_id uuid null references public.learning_sources(id) on delete set null,
  status text not null check (status in ('started','success','failed','partial')),
  fetched_count integer not null default 0,
  proposed_count integer not null default 0,
  error_text text null,
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists ix_learning_sources_tenant_enabled on public.learning_sources (tenant_id, enabled);
create index if not exists ix_learning_items_tenant_status_created on public.learning_items (tenant_id, status, created_at desc);
create index if not exists ix_learning_item_topics_tenant_item on public.learning_item_topics (tenant_id, item_id);
create index if not exists ix_learning_reviews_tenant_item on public.learning_reviews (tenant_id, item_id, created_at desc);
create index if not exists ix_learning_library_paths_tenant_library on public.learning_library_paths (tenant_id, library_id, created_at desc);
create index if not exists ix_learning_ingest_runs_tenant_source on public.learning_ingest_runs (tenant_id, source_id, started_at desc);

drop trigger if exists trg_learning_settings_set_updated_at on public.learning_settings;
create trigger trg_learning_settings_set_updated_at
before update on public.learning_settings
for each row execute function public.rgpt_set_updated_at();

drop trigger if exists trg_learning_sources_set_updated_at on public.learning_sources;
create trigger trg_learning_sources_set_updated_at
before update on public.learning_sources
for each row execute function public.rgpt_set_updated_at();

drop trigger if exists trg_learning_items_set_updated_at on public.learning_items;
create trigger trg_learning_items_set_updated_at
before update on public.learning_items
for each row execute function public.rgpt_set_updated_at();

drop trigger if exists trg_learning_library_paths_set_updated_at on public.learning_library_paths;
create trigger trg_learning_library_paths_set_updated_at
before update on public.learning_library_paths
for each row execute function public.rgpt_set_updated_at();

alter table public.learning_settings enable row level security;
alter table public.learning_sources enable row level security;
alter table public.learning_items enable row level security;
alter table public.learning_topics enable row level security;
alter table public.learning_item_topics enable row level security;
alter table public.learning_reviews enable row level security;
alter table public.learning_library_paths enable row level security;
alter table public.learning_redaction_audit enable row level security;
alter table public.learning_ingest_runs enable row level security;

drop policy if exists "learning_settings_select_tenant" on public.learning_settings;
create policy "learning_settings_select_tenant" on public.learning_settings
for select to authenticated
using (tenant_id = public.rgpt_current_tenant_id());

drop policy if exists "learning_settings_write_admin" on public.learning_settings;
create policy "learning_settings_write_admin" on public.learning_settings
for all to authenticated
using (tenant_id = public.rgpt_current_tenant_id() and public.rgpt_is_tenant_admin())
with check (tenant_id = public.rgpt_current_tenant_id() and public.rgpt_is_tenant_admin());

drop policy if exists "learning_sources_select_tenant" on public.learning_sources;
create policy "learning_sources_select_tenant" on public.learning_sources
for select to authenticated
using (tenant_id = public.rgpt_current_tenant_id());

drop policy if exists "learning_sources_write_admin" on public.learning_sources;
create policy "learning_sources_write_admin" on public.learning_sources
for all to authenticated
using (tenant_id = public.rgpt_current_tenant_id() and public.rgpt_is_reviewer_or_admin())
with check (tenant_id = public.rgpt_current_tenant_id() and public.rgpt_is_reviewer_or_admin());

drop policy if exists "learning_items_select_tenant" on public.learning_items;
create policy "learning_items_select_tenant" on public.learning_items
for select to authenticated
using (tenant_id = public.rgpt_current_tenant_id());

drop policy if exists "learning_items_insert_proposed" on public.learning_items;
create policy "learning_items_insert_proposed" on public.learning_items
for insert to authenticated
with check (
  tenant_id = public.rgpt_current_tenant_id()
  and (
    public.rgpt_is_reviewer_or_admin()
    or (status = 'proposed' and proposed_by_user_id = auth.uid())
  )
);

drop policy if exists "learning_items_update_reviewer_or_owner" on public.learning_items;
create policy "learning_items_update_reviewer_or_owner" on public.learning_items
for update to authenticated
using (
  tenant_id = public.rgpt_current_tenant_id()
  and (
    public.rgpt_is_reviewer_or_admin()
    or (proposed_by_user_id = auth.uid() and status = 'proposed')
  )
)
with check (
  tenant_id = public.rgpt_current_tenant_id()
  and (
    public.rgpt_is_reviewer_or_admin()
    or (proposed_by_user_id = auth.uid() and status = 'proposed')
  )
);

drop policy if exists "learning_topics_select_tenant" on public.learning_topics;
create policy "learning_topics_select_tenant" on public.learning_topics
for select to authenticated
using (tenant_id = public.rgpt_current_tenant_id());

drop policy if exists "learning_topics_write_reviewer" on public.learning_topics;
create policy "learning_topics_write_reviewer" on public.learning_topics
for all to authenticated
using (tenant_id = public.rgpt_current_tenant_id() and public.rgpt_is_reviewer_or_admin())
with check (tenant_id = public.rgpt_current_tenant_id() and public.rgpt_is_reviewer_or_admin());

drop policy if exists "learning_item_topics_select_tenant" on public.learning_item_topics;
create policy "learning_item_topics_select_tenant" on public.learning_item_topics
for select to authenticated
using (tenant_id = public.rgpt_current_tenant_id());

drop policy if exists "learning_item_topics_write_reviewer" on public.learning_item_topics;
create policy "learning_item_topics_write_reviewer" on public.learning_item_topics
for all to authenticated
using (tenant_id = public.rgpt_current_tenant_id() and public.rgpt_is_reviewer_or_admin())
with check (tenant_id = public.rgpt_current_tenant_id() and public.rgpt_is_reviewer_or_admin());

drop policy if exists "learning_reviews_select_tenant" on public.learning_reviews;
create policy "learning_reviews_select_tenant" on public.learning_reviews
for select to authenticated
using (tenant_id = public.rgpt_current_tenant_id());

drop policy if exists "learning_reviews_write_reviewer" on public.learning_reviews;
create policy "learning_reviews_write_reviewer" on public.learning_reviews
for all to authenticated
using (tenant_id = public.rgpt_current_tenant_id() and public.rgpt_is_reviewer_or_admin())
with check (tenant_id = public.rgpt_current_tenant_id() and public.rgpt_is_reviewer_or_admin());

drop policy if exists "learning_library_paths_select_tenant" on public.learning_library_paths;
create policy "learning_library_paths_select_tenant" on public.learning_library_paths
for select to authenticated
using (tenant_id = public.rgpt_current_tenant_id());

drop policy if exists "learning_library_paths_write_reviewer" on public.learning_library_paths;
create policy "learning_library_paths_write_reviewer" on public.learning_library_paths
for all to authenticated
using (tenant_id = public.rgpt_current_tenant_id() and public.rgpt_is_reviewer_or_admin())
with check (tenant_id = public.rgpt_current_tenant_id() and public.rgpt_is_reviewer_or_admin());

drop policy if exists "learning_redaction_audit_select_tenant" on public.learning_redaction_audit;
create policy "learning_redaction_audit_select_tenant" on public.learning_redaction_audit
for select to authenticated
using (tenant_id = public.rgpt_current_tenant_id());

drop policy if exists "learning_redaction_audit_write_reviewer" on public.learning_redaction_audit;
create policy "learning_redaction_audit_write_reviewer" on public.learning_redaction_audit
for all to authenticated
using (tenant_id = public.rgpt_current_tenant_id() and public.rgpt_is_reviewer_or_admin())
with check (tenant_id = public.rgpt_current_tenant_id() and public.rgpt_is_reviewer_or_admin());

drop policy if exists "learning_ingest_runs_select_tenant" on public.learning_ingest_runs;
create policy "learning_ingest_runs_select_tenant" on public.learning_ingest_runs
for select to authenticated
using (tenant_id = public.rgpt_current_tenant_id());

drop policy if exists "learning_ingest_runs_write_reviewer" on public.learning_ingest_runs;
create policy "learning_ingest_runs_write_reviewer" on public.learning_ingest_runs
for all to authenticated
using (tenant_id = public.rgpt_current_tenant_id() and public.rgpt_is_reviewer_or_admin())
with check (tenant_id = public.rgpt_current_tenant_id() and public.rgpt_is_reviewer_or_admin());
