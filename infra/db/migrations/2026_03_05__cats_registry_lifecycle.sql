-- RGPT-CATS-SECTION1-01
-- Purpose: CATS registry + lifecycle core tables

create table if not exists public.cats (
  cat_id text primary key,
  owner_org_id text not null,
  owner_user_id text null,
  name text not null,
  description text null,
  status text not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_cats_status check (status in ('Draft','Review','Approved','Rejected','Deprecated','Archived'))
);

create table if not exists public.cats_versions (
  cat_version_id text primary key,
  cat_id text not null references public.cats(cat_id) on delete cascade,
  version text not null,
  manifest_json jsonb not null default '{}'::jsonb,
  rulebook_json jsonb not null default '{}'::jsonb,
  command_bundle_ref text null,
  status text not null default 'Published',
  created_at timestamptz not null default now()
);

create table if not exists public.cats_permissions (
  permission_id text primary key,
  cat_version_id text not null references public.cats_versions(cat_version_id) on delete cascade,
  permission_key text not null,
  scope text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.cats_fingerprints (
  fingerprint_id text primary key,
  cat_version_id text not null references public.cats_versions(cat_version_id) on delete cascade,
  algo text not null,
  digest text not null,
  signed_by text null,
  created_at timestamptz not null default now()
);

create table if not exists public.cats_metrics (
  metric_id text primary key,
  cat_version_id text not null references public.cats_versions(cat_version_id) on delete cascade,
  success_count bigint not null default 0,
  fail_count bigint not null default 0,
  avg_exec_ms numeric(18,2) null,
  last_run_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_cats_ownerorg_name on public.cats (owner_org_id, name);
create unique index if not exists uq_cats_versions_cat_version on public.cats_versions (cat_id, version);
create index if not exists ix_cats_versions_cat_createdat_desc on public.cats_versions (cat_id, created_at desc);
create unique index if not exists uq_cats_fingerprints_catversion on public.cats_fingerprints (cat_version_id);
