# ================================================
# RGPT-Brain-DB-Migration.ps1
# RocketGPT - Neural Orchestrator + Agents + Self-Heal + Logging
# STEP-1: Create all core tables, enums, and seed agents
# ================================================

param(
    [string]$DbConnectionString = $env:RGPT_DB_CONN  # Optional: read from env if not passed
)

if (-not $DbConnectionString) {
    Write-Host "❌ ERROR: Please provide a Postgres connection string via -DbConnectionString or RGPT_DB_CONN env var." -ForegroundColor Red
    Write-Host "   Example:" -ForegroundColor Yellow
    Write-Host "   `$env:RGPT_DB_CONN = 'host=localhost port=5432 dbname=yourdb user=youruser password=yourpass'" -ForegroundColor Yellow
    exit 1
}

# -------------------------
# 1) Define SQL migration
# -------------------------
$Sql = @"
-- =========================================
-- [RGPT-BRAIN-001] Core enums and extensions
-- =========================================

-- Enable pgcrypto for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Optional: enable pgvector if you plan to use embeddings
-- CREATE EXTENSION IF NOT EXISTS vector;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
        CREATE TYPE task_priority AS ENUM ('low', 'normal', 'high', 'critical');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE task_status AS ENUM ('pending', 'running', 'blocked', 'done', 'failed', 'canceled');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_mode') THEN
        CREATE TYPE task_mode AS ENUM ('serial', 'parallel');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'run_status') THEN
        CREATE TYPE run_status AS ENUM ('queued', 'running', 'succeeded', 'failed', 'skipped');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'observation_source') THEN
        CREATE TYPE observation_source AS ENUM ('ci','git','logs','user','system','metric');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'artifact_type') THEN
        CREATE TYPE artifact_type AS ENUM ('doc','code-diff','config','prompt','diagram','plan','runbook');
    END IF;
END
$$;

-- =========================================
-- [RGPT-BRAIN-002] Agents registry
-- =========================================

CREATE TABLE IF NOT EXISTS agents (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code                text NOT NULL UNIQUE,              -- e.g. 'core-codegen', 'ui-codegen'
    display_name        text NOT NULL,                     -- 'Core Coding Agent'
    description         text,
    enabled             boolean NOT NULL DEFAULT true,

    default_model       text NOT NULL,                     -- e.g. 'gpt-5.1-thinking'
    role_prompt         text NOT NULL,                     -- system prompt / persona text

    allowed_tools       jsonb NOT NULL DEFAULT '[]'::jsonb, -- ['git','fs','web-search']
    max_parallel_tasks  integer NOT NULL DEFAULT 2,

    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agents_enabled
    ON agents (enabled);

-- =========================================
-- [RGPT-BRAIN-003] Agent tasks queue
-- =========================================

CREATE TABLE IF NOT EXISTS agent_tasks (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    -- High-level description
    goal                text NOT NULL,         -- natural language: "Create Agent Monitor UI"
    task_type           text NOT NULL,         -- 'ui','backend','research','docs','devops','sql',...
    priority            task_priority NOT NULL DEFAULT 'normal',
    mode                task_mode NOT NULL DEFAULT 'serial',  -- serial vs parallel preference

    -- Assignment
    agent_id            uuid REFERENCES agents(id),
    orchestrator_run_id uuid,  -- FK into agent_runs of orchestrator (optional, not enforced yet)

    -- Dependencies: other tasks that must complete first
    depends_on          uuid[] NOT NULL DEFAULT '{}',

    -- Context
    input_context       jsonb NOT NULL DEFAULT '{}'::jsonb,  -- repo info, files, issue ids
    policy_tags         text[] NOT NULL DEFAULT '{}',        -- 'high-risk','touches-workflows'

    -- Status
    status              task_status NOT NULL DEFAULT 'pending',
    error_message       text,
    result_summary      text,

    -- Timestamps
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    started_at          timestamptz,
    completed_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_status_priority
    ON agent_tasks (status, priority);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent_status
    ON agent_tasks (agent_id, status);

-- =========================================
-- [RGPT-BRAIN-004] Agent runs (execution log)
-- =========================================

CREATE TABLE IF NOT EXISTS agent_runs (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id             uuid NOT NULL REFERENCES agent_tasks(id) ON DELETE CASCADE,
    agent_id            uuid NOT NULL REFERENCES agents(id),

    model_used          text NOT NULL,
    tools_used          text[] NOT NULL DEFAULT '{}',   -- ['git','fs','github-actions']

    status              run_status NOT NULL DEFAULT 'queued',

    input_payload       jsonb NOT NULL DEFAULT '{}'::jsonb,  -- prompt + context
    output_payload      jsonb,
    error_message       text,

    token_input         integer,
    token_output        integer,
    latency_ms          integer,

    created_at          timestamptz NOT NULL DEFAULT now(),
    started_at          timestamptz,
    completed_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_task
    ON agent_runs (task_id);

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_status
    ON agent_runs (agent_id, status);

-- =========================================
-- [RGPT-BRAIN-005] Observations (signals / ELMAH-style log base)
-- =========================================

CREATE TABLE IF NOT EXISTS observations (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source              observation_source NOT NULL,
    source_ref          text,                             -- 'gh-run#123', 'user#nirav', 'api:/api/xyz@prod'

    summary             text NOT NULL,
    details             jsonb NOT NULL DEFAULT '{}'::jsonb,

    related_task_id     uuid REFERENCES agent_tasks(id),
    related_run_id      uuid REFERENCES agent_runs(id),

    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_observations_source
    ON observations (source, created_at DESC);

-- Index focused on error-like observations (ELMAH-style)
CREATE INDEX IF NOT EXISTS idx_observations_errors
    ON observations (source, created_at DESC)
    WHERE (details ? 'exception_type') OR (details ? 'error');

-- =========================================
-- [RGPT-BRAIN-006] Artifacts (memory objects)
-- =========================================

CREATE TABLE IF NOT EXISTS artifacts (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_type           artifact_type NOT NULL,       -- 'doc','code-diff','config','plan',...
    title                   text NOT NULL,
    description             text,

    location                text,                         -- path/URL: 'docs/runbooks/self-heal.md'
    repo_ref                text,                         -- repo/branch/commit if needed

    created_by_run_id       uuid REFERENCES agent_runs(id),
    created_by_agent_id     uuid REFERENCES agents(id),

    -- Optional vector embedding for semantic recall (if pgvector enabled)
    -- embedding              vector(1536),

    metadata                jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_artifacts_type
    ON artifacts (artifact_type);

-- If using pgvector, uncomment:
-- CREATE INDEX IF NOT EXISTS idx_artifacts_embedding
--     ON artifacts USING ivfflat (embedding vector_ops);

-- =========================================
-- [RGPT-BRAIN-007] Seed core agents
-- =========================================

INSERT INTO agents (code, display_name, description, default_model, role_prompt, allowed_tools)
VALUES
  (
    'orchestrator',
    'Neural Orchestrator',
    'Plans work, decides serial/parallel execution, assigns tasks to specialist agents.',
    'gpt-5.1-thinking',
    'You are the central orchestrator for RocketGPT. Given goals, observations, and agent capabilities,
     you break work into tasks, assign suitable agents, and decide dependencies and modes (serial/parallel).',
    '["planner","read_observations","read_artifacts"]'
  ),
  (
    'core-codegen',
    'Core Coding Agent',
    'Works on backend logic, APIs, workflows, and core engine code.',
    'gpt-5.1-thinking',
    'You are the Core Coding Agent. You modify backend and orchestration code safely and incrementally.',
    '["git","fs","github","tests"]'
  ),
  (
    'ui-codegen',
    'UI/UX Coding Agent',
    'Specialized in Next.js + React + Tailwind UI for RocketGPT.',
    'gpt-5.1-thinking',
    'You are the UI/UX Coding Agent. You only modify UI components, not core backend logic.',
    '["git","fs","github"]'
  ),
  (
    'research',
    'Research Agent',
    'Researches best practices, tools, patterns, and summarizes them.',
    'gpt-5.1-thinking',
    'You are the Research Agent. You read docs and external knowledge and provide concise guidance.',
    '["web-search","docs"]'
  ),
  (
    'docs',
    'Docs & Knowledge Agent',
    'Maintains runbooks, docs, and summaries of changes.',
    'gpt-5.1-thinking',
    'You are the Docs & Knowledge Agent. You keep RocketGPT documentation clear and updated.',
    '["git","fs","github"]'
  )
ON CONFLICT (code) DO NOTHING;
"@

# -------------------------
# 2) Write migration to a file (for traceability)
# -------------------------
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$MigrationsDir = Join-Path $ScriptDir "..\..\sql\migrations"
if (-not (Test-Path $MigrationsDir)) {
    New-Item -ItemType Directory -Path $MigrationsDir | Out-Null
}

$MigrationFile = Join-Path $MigrationsDir "RGPT-Brain-DB-Initial.sql"
$Sql | Set-Content -Path $MigrationFile -Encoding UTF8

Write-Host "✅ Migration file written to: $MigrationFile" -ForegroundColor Green

# -------------------------
# 3) Execute migration using psql
# -------------------------
Write-Host "ℹ️ Executing migration via psql..." -ForegroundColor Cyan

$psqlCmd = "psql `"$DbConnectionString`" -v ON_ERROR_STOP=1 -f `"$MigrationFile`""

Write-Host "Running: $psqlCmd" -ForegroundColor DarkGray

try {
    & psql "$DbConnectionString" -v ON_ERROR_STOP=1 -f "$MigrationFile"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database migration completed successfully." -ForegroundColor Green
    }
    else {
        Write-Host "❌ Database migration finished with exit code $LASTEXITCODE." -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Exception while running psql: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
