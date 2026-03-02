-- CATS Governance Monitor schema
-- Safe to re-run (idempotent where possible)

create schema if not exists governance;

create table if not exists governance.crps_executions (
  id uuid primary key default gen_random_uuid(),
  run_id text not null,
  org_id text null,
  actor_id text null,
  crps_id text not null,
  workflow_id text not null,
  cats_involved jsonb not null,
  params_fingerprint text not null,
  risk_domains jsonb not null,
  impact_score integer not null check (impact_score between 0 and 100),
  reversibility_score integer not null check (reversibility_score between 0 and 100),
  aggressiveness_score integer not null check (aggressiveness_score between 0 and 100),
  override_rate integer not null default 0 check (override_rate between 0 and 100),
  confidence numeric(5,4) not null check (confidence >= 0 and confidence <= 1),
  recommended_level smallint not null check (recommended_level in (1,2,3)),
  evidence_refs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_crps_executions_created_at on governance.crps_executions(created_at desc);
create index if not exists idx_crps_executions_crps on governance.crps_executions(crps_id);

create table if not exists governance.crps_weekly_patterns (
  id uuid primary key default gen_random_uuid(),
  week_start timestamptz not null,
  crps_id text not null,
  workflow_id text not null,
  risk_domains jsonb not null default '[]'::jsonb,
  execution_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique(week_start, crps_id)
);

create table if not exists governance.policy_rules (
  id text primary key,
  name text not null,
  enabled boolean not null default true,
  priority integer not null default 0,
  conditions jsonb not null default '{}'::jsonb,
  action jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists governance.containment_events (
  id uuid primary key default gen_random_uuid(),
  run_id text not null,
  workflow_id text not null,
  crps_id text not null,
  containment_level smallint not null check (containment_level in (1,2,3)),
  decision_payload jsonb not null,
  explanation text not null,
  policy_rule_id text null,
  policy_rule_name text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_containment_events_created_at on governance.containment_events(created_at desc);
create index if not exists idx_containment_events_level on governance.containment_events(containment_level);

create table if not exists governance.foresight_tasks (
  id uuid primary key default gen_random_uuid(),
  crps_id text not null,
  summary text not null,
  why_it_matters text not null,
  scenarios jsonb not null,
  stop_conditions jsonb not null default '[]'::jsonb,
  mitigation_if_late text not null,
  recommended_policy_changes jsonb not null default '[]'::jsonb,
  recommended_cat_patches jsonb not null default '[]'::jsonb,
  domain_queues jsonb not null default '[]'::jsonb,
  status text not null check (status in ('open','in_review','resolved')) default 'open',
  created_at timestamptz not null default now()
);

create index if not exists idx_foresight_tasks_status on governance.foresight_tasks(status);

create table if not exists governance.weekly_digest_snapshots (
  id text primary key,
  week_start timestamptz not null,
  week_end timestamptz not null,
  digest_payload jsonb not null,
  generated_at timestamptz not null default now()
);

create table if not exists governance.ledger_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (
    event_type in (
      'risk_eval',
      'containment_applied',
      'foresight_task_created',
      'weekly_digest_published'
    )
  ),
  run_id text null,
  workflow_id text not null,
  crps_id text null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_governance_ledger_created_at on governance.ledger_events(created_at desc);
create index if not exists idx_governance_ledger_event_type on governance.ledger_events(event_type);

create or replace function governance.prevent_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'governance.ledger_events is append-only';
end;
$$;

drop trigger if exists trg_governance_ledger_no_update on governance.ledger_events;
drop trigger if exists trg_governance_ledger_no_delete on governance.ledger_events;

create trigger trg_governance_ledger_no_update
before update on governance.ledger_events
for each row execute function governance.prevent_mutation();

create trigger trg_governance_ledger_no_delete
before delete on governance.ledger_events
for each row execute function governance.prevent_mutation();

insert into governance.policy_rules (id, name, enabled, priority, conditions, action)
values
(
  'default-l3-high-impact-low-reversibility',
  'L3: High impact and low reversibility',
  true,
  100,
  '{"impactScoreGte":85,"reversibilityScoreLte":30}'::jsonb,
  '{"level":3,"explainTemplate":"Execution blocked: impact {impactScore} with reversibility {reversibilityScore} crossed emergency threshold.","lockParameters":["*"],"disableAutoExec":true,"requireApprovalCheckpoint":true,"requireSimulationReport":true,"blockExecution":true,"openIncident":true,"silent":false}'::jsonb
),
(
  'default-l3-redline',
  'L3: Red-line match',
  true,
  95,
  '{"redLineMatch":true}'::jsonb,
  '{"level":3,"explainTemplate":"Execution blocked due to red-line policy match in domains: {domains}.","lockParameters":["*"],"disableAutoExec":true,"requireApprovalCheckpoint":true,"requireSimulationReport":true,"blockExecution":true,"openIncident":true,"silent":false}'::jsonb
),
(
  'default-l2-missing-approvals',
  'L2: High impact with approvals missing',
  true,
  80,
  '{"impactScoreGte":70,"approvalsMissing":true}'::jsonb,
  '{"level":2,"explainTemplate":"Approval checkpoint required: impact {impactScore} is high and required approvals are missing.","lockParameters":["aggressiveMode","autoExecute","maxBudget"],"disableAutoExec":true,"requireApprovalCheckpoint":true,"requireSimulationReport":true,"blockExecution":false,"openIncident":false,"silent":false}'::jsonb
),
(
  'default-l2-legal-security-confidence',
  'L2: Legal/security domain with high confidence',
  true,
  70,
  '{"domainsIncludeAny":["legal","security"],"confidenceGte":0.7}'::jsonb,
  '{"level":2,"explainTemplate":"Approval checkpoint required for sensitive domains ({domains}) with high confidence.","lockParameters":["aggressiveMode","autoExecute","maxBudget"],"disableAutoExec":true,"requireApprovalCheckpoint":true,"requireSimulationReport":true,"blockExecution":false,"openIncident":false,"silent":false}'::jsonb
),
(
  'default-l1-baseline',
  'L1: Baseline containment',
  true,
  10,
  '{"impactScoreGte":50}'::jsonb,
  '{"level":1,"explainTemplate":"Soft containment applied for medium/high risk impact {impactScore}.","disableAutoExec":false,"requireApprovalCheckpoint":false,"requireSimulationReport":true,"blockExecution":false,"openIncident":false,"silent":true}'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  enabled = excluded.enabled,
  priority = excluded.priority,
  conditions = excluded.conditions,
  action = excluded.action,
  updated_at = now();

