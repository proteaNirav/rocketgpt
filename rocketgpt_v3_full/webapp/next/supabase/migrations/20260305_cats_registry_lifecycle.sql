-- CATS Registry + Lifecycle (Section 1)
-- Supabase migration

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'cats_status') then
    create type public.cats_status as enum ('draft','review','approved','active','deprecated','revoked');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'cats_version_status') then
    create type public.cats_version_status as enum ('draft','published','revoked');
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

create table if not exists public.cats (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  owner_user_id uuid null,
  name text not null,
  description text null,
  status public.cats_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cats_versions (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null references public.cats(id) on delete cascade,
  version text not null,
  manifest_json jsonb not null default '{}'::jsonb,
  rulebook_json jsonb not null default '{}'::jsonb,
  command_bundle_ref text null,
  status public.cats_version_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists public.cats_permissions (
  id uuid primary key default gen_random_uuid(),
  cat_id uuid not null references public.cats(id) on delete cascade,
  permission_key text not null,
  scope text not null default 'cat',
  created_at timestamptz not null default now()
);

create table if not exists public.cats_fingerprints (
  id uuid primary key default gen_random_uuid(),
  cat_version_id uuid not null references public.cats_versions(id) on delete cascade,
  algo text not null default 'sha256',
  digest text not null,
  signed_by text null,
  created_at timestamptz not null default now()
);

create table if not exists public.cats_metrics_stub (
  id uuid primary key default gen_random_uuid(),
  cat_version_id uuid not null references public.cats_versions(id) on delete cascade,
  success_count bigint not null default 0,
  fail_count bigint not null default 0,
  avg_exec_ms bigint null,
  last_run_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_cats_tenant_name on public.cats (tenant_id, name);
create unique index if not exists uq_cats_versions_cat_version on public.cats_versions (cat_id, version);
create index if not exists ix_cats_versions_cat_created_at_desc on public.cats_versions (cat_id, created_at desc);
create unique index if not exists uq_cats_fingerprints_cat_version on public.cats_fingerprints (cat_version_id);

drop trigger if exists trg_cats_set_updated_at on public.cats;
create trigger trg_cats_set_updated_at
before update on public.cats
for each row execute function public.rgpt_set_updated_at();

drop trigger if exists trg_cats_metrics_stub_set_updated_at on public.cats_metrics_stub;
create trigger trg_cats_metrics_stub_set_updated_at
before update on public.cats_metrics_stub
for each row execute function public.rgpt_set_updated_at();

alter table public.cats enable row level security;
alter table public.cats_versions enable row level security;
alter table public.cats_permissions enable row level security;
alter table public.cats_fingerprints enable row level security;
alter table public.cats_metrics_stub enable row level security;

drop policy if exists "cats_select_tenant" on public.cats;
create policy "cats_select_tenant"
on public.cats
for select
to authenticated
using (tenant_id = public.rgpt_current_tenant_id());

drop policy if exists "cats_insert_owner_or_admin" on public.cats;
create policy "cats_insert_owner_or_admin"
on public.cats
for insert
to authenticated
with check (
  tenant_id = public.rgpt_current_tenant_id()
  and (
    public.rgpt_is_tenant_admin()
    or owner_user_id = auth.uid()
  )
);

drop policy if exists "cats_update_owner_or_admin" on public.cats;
create policy "cats_update_owner_or_admin"
on public.cats
for update
to authenticated
using (
  tenant_id = public.rgpt_current_tenant_id()
  and (
    public.rgpt_is_tenant_admin()
    or owner_user_id = auth.uid()
  )
)
with check (
  tenant_id = public.rgpt_current_tenant_id()
  and (
    public.rgpt_is_tenant_admin()
    or owner_user_id = auth.uid()
  )
);

drop policy if exists "cats_delete_admin_only" on public.cats;
create policy "cats_delete_admin_only"
on public.cats
for delete
to authenticated
using (
  tenant_id = public.rgpt_current_tenant_id()
  and public.rgpt_is_tenant_admin()
);

drop policy if exists "cats_versions_select_tenant" on public.cats_versions;
create policy "cats_versions_select_tenant"
on public.cats_versions
for select
to authenticated
using (
  exists (
    select 1
    from public.cats c
    where c.id = cats_versions.cat_id
      and c.tenant_id = public.rgpt_current_tenant_id()
  )
);

drop policy if exists "cats_versions_write_owner_or_admin" on public.cats_versions;
create policy "cats_versions_write_owner_or_admin"
on public.cats_versions
for all
to authenticated
using (
  exists (
    select 1
    from public.cats c
    where c.id = cats_versions.cat_id
      and c.tenant_id = public.rgpt_current_tenant_id()
      and (public.rgpt_is_tenant_admin() or c.owner_user_id = auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.cats c
    where c.id = cats_versions.cat_id
      and c.tenant_id = public.rgpt_current_tenant_id()
      and (public.rgpt_is_tenant_admin() or c.owner_user_id = auth.uid())
  )
);

drop policy if exists "cats_permissions_select_tenant" on public.cats_permissions;
create policy "cats_permissions_select_tenant"
on public.cats_permissions
for select
to authenticated
using (
  exists (
    select 1
    from public.cats c
    where c.id = cats_permissions.cat_id
      and c.tenant_id = public.rgpt_current_tenant_id()
  )
);

drop policy if exists "cats_permissions_write_owner_or_admin" on public.cats_permissions;
create policy "cats_permissions_write_owner_or_admin"
on public.cats_permissions
for all
to authenticated
using (
  exists (
    select 1
    from public.cats c
    where c.id = cats_permissions.cat_id
      and c.tenant_id = public.rgpt_current_tenant_id()
      and (public.rgpt_is_tenant_admin() or c.owner_user_id = auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.cats c
    where c.id = cats_permissions.cat_id
      and c.tenant_id = public.rgpt_current_tenant_id()
      and (public.rgpt_is_tenant_admin() or c.owner_user_id = auth.uid())
  )
);

drop policy if exists "cats_fingerprints_select_tenant" on public.cats_fingerprints;
create policy "cats_fingerprints_select_tenant"
on public.cats_fingerprints
for select
to authenticated
using (
  exists (
    select 1
    from public.cats_versions cv
    join public.cats c on c.id = cv.cat_id
    where cv.id = cats_fingerprints.cat_version_id
      and c.tenant_id = public.rgpt_current_tenant_id()
  )
);

drop policy if exists "cats_fingerprints_write_owner_or_admin" on public.cats_fingerprints;
create policy "cats_fingerprints_write_owner_or_admin"
on public.cats_fingerprints
for all
to authenticated
using (
  exists (
    select 1
    from public.cats_versions cv
    join public.cats c on c.id = cv.cat_id
    where cv.id = cats_fingerprints.cat_version_id
      and c.tenant_id = public.rgpt_current_tenant_id()
      and (public.rgpt_is_tenant_admin() or c.owner_user_id = auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.cats_versions cv
    join public.cats c on c.id = cv.cat_id
    where cv.id = cats_fingerprints.cat_version_id
      and c.tenant_id = public.rgpt_current_tenant_id()
      and (public.rgpt_is_tenant_admin() or c.owner_user_id = auth.uid())
  )
);

drop policy if exists "cats_metrics_stub_select_tenant" on public.cats_metrics_stub;
create policy "cats_metrics_stub_select_tenant"
on public.cats_metrics_stub
for select
to authenticated
using (
  exists (
    select 1
    from public.cats_versions cv
    join public.cats c on c.id = cv.cat_id
    where cv.id = cats_metrics_stub.cat_version_id
      and c.tenant_id = public.rgpt_current_tenant_id()
  )
);

drop policy if exists "cats_metrics_stub_write_owner_or_admin" on public.cats_metrics_stub;
create policy "cats_metrics_stub_write_owner_or_admin"
on public.cats_metrics_stub
for all
to authenticated
using (
  exists (
    select 1
    from public.cats_versions cv
    join public.cats c on c.id = cv.cat_id
    where cv.id = cats_metrics_stub.cat_version_id
      and c.tenant_id = public.rgpt_current_tenant_id()
      and (public.rgpt_is_tenant_admin() or c.owner_user_id = auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.cats_versions cv
    join public.cats c on c.id = cv.cat_id
    where cv.id = cats_metrics_stub.cat_version_id
      and c.tenant_id = public.rgpt_current_tenant_id()
      and (public.rgpt_is_tenant_admin() or c.owner_user_id = auth.uid())
  )
);
