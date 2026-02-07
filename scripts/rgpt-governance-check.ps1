# RGPT-GOV-LOCAL-PS-01
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if (-not $env:SUPABASE_DB_URL) {
  throw "Set SUPABASE_DB_URL first"
}

psql $env:SUPABASE_DB_URL -v ON_ERROR_STOP=1 `
  -c "select rgpt_audit.run_integrity_checks('local');"

psql $env:SUPABASE_DB_URL -v ON_ERROR_STOP=1 -c @"
select check_name, status, details, checked_at
from rgpt_audit.data_integrity_checks
order by checked_at desc
limit 20;
"@

psql $env:SUPABASE_DB_URL -v ON_ERROR_STOP=1 `
  -c "select * from rgpt_governance.v_health;"
