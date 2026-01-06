-- =========================================================
-- RGPT Schema Exposure Guard
-- FAILS CI if unsafe exposure is detected
-- =========================================================

-- 1) rgpt schema must not be usable by client roles
select 'UNSAFE_SCHEMA_USAGE' as issue, r.rolname as grantee, p.privilege_type
from pg_namespace n
join lateral (
  select
    (aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner)))).grantee as grantee_oid,
    (aclexplode(coalesce(n.nspacl, acldefault('n', n.nspowner)))).privilege_type as privilege_type
) p on true
join pg_roles r on r.oid = p.grantee_oid
where n.nspname = 'rgpt'
  and r.rolname in ('anon','authenticated','public')
  and p.privilege_type in ('USAGE','CREATE');

-- 2) No rgpt table/view grants for anon/authenticated
select 'UNSAFE_TABLE_GRANT' as issue, grantee, table_schema, table_name, privilege_type
from information_schema.table_privileges
where table_schema = 'rgpt'
  and grantee in ('anon','authenticated');

-- 3) SECURITY DEFINER functions must not be executable by client roles
select 'UNSAFE_FUNCTION_EXECUTE' as issue,
       n.nspname as schema, p.proname as function_name,
       grantee.rolname as grantee, priv.privilege_type
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) priv on true
join pg_roles grantee on grantee.oid = priv.grantee
where n.nspname = 'rgpt'
  and grantee.rolname in ('anon','authenticated','public')
  and priv.privilege_type = 'EXECUTE';
