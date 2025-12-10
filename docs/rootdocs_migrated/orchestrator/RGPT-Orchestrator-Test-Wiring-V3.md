📘 RocketGPT Orchestrator Architecture — V3 (Distributed Multi-Agent Era)
Document ID: RGPT-Orchestrator-Test-Wiring-V3
Last Updated: 2025-12-09
Author: RocketGPT Automated Assistant
🚀 1. Purpose of V3

V3 transforms RocketGPT from a sequential orchestrator (V1–V2) into a distributed, multi-agent orchestration engine capable of:

Coordinating multiple LLM agents

Running planners, builders, testers, analyzers, and releasers in parallel or pipelines

Executing real, containerized tests

Scaling across local, cloud, and hybrid environments

Using an event-bus-based design for low latency and high reliability

Supporting dynamic model selection (OpenAI, Claude, Gemini, local LLMs, etc.)

Maintaining complete run lineage and traceability

V3 is the foundation required for self-healing, self-improving RocketGPT.

✔️ 2. V3 Architecture Summary
        ┌────────────────────────────────────────────┐
        │        RocketGPT Multi-Agent Layer         │
        └────────────────────────────────────────────┘
                   ▲         ▲         ▲
                   │         │         │
          ┌────────┘         │         └────────┐
          │                  │                  │
   Planner Agent       Builder Agent       Tester Agent
          │                  │                  │
          ▼                  ▼                  ▼
   Planner Worker      Builder Workers     Tester Workers
          │                  │                  │
          └────→ Event Bus / Queue / Scheduler ←┘
                           │
                           ▼
                   Orchestrator Engine
                           │
                           ▼
                   Supabase DB Storage
                           │
                           ▼
                   UI / CLI / PowerShell

✔️ 3. V3 Features at a Glance
Feature	Description
Distributed Agents	Planner, Builder, Tester, Analyzer, Releaser run independently
Parallel Task Execution	Builders & testers can run concurrently on shards
Event-Driven Flow	Pipeline advances via events, not polling
Container-Based Test Executor	Tests run inside Playwright+Node or Docker runners
Unified Log & Trace System	Per-agent logs, per-phase logs, and per-run logs
Model-Agnostic Design	Swap LLM providers dynamically
Failure Classification	Human-error, LLM-error, infra-error, retryable-error
Run Replay & Resume	Re-run specific phases
Run Diffing	Compare previous runs, detect regressions
Artifact Storage	Store zip files, screenshots, test videos, JSON, logs
Agent Health Monitoring	Heartbeat and readiness checks
✔️ 4. Event Bus Specification (Core of V3)

RocketGPT V3 uses an event-driven system, via either:

Supabase Realtime

Redis Streams

NATS

or lightweight in-process queue (dev mode)

4.1 Event Types
Event	Produced By	Consumed By
run.created	UI/CLI/API	Planner Agent
planner.completed	Planner Agent	Builder Agent
builder.completed	Builder Agent	Tester Agent
tester.completed	Tester Agent	Releaser Agent
releaser.completed	Releaser Agent	Orchestrator
run.failed	Any agent	Orchestrator
run.updated	Any agent	UI
✔️ 5. Agent Contracts (V3)

Every agent follows a unified contract:

5.1 Request Contract
{
  "runId": 42,
  "phase": "builder_running",
  "task": {},
  "agent": "builder-agent-v1",
  "timestamp": "...",
  "context": { "models": {}, "env": {} }
}

5.2 Response Contract
{
  "runId": 42,
  "phase": "builder_completed",
  "success": true,
  "output": {},
  "artifacts": [],
  "logs": [],
  "nextPhase": "tester_running"
}

5.3 Error Contract
{
  "runId": 42,
  "phase": "builder_running",
  "success": false,
  "error_type": "LLM_ERROR | INFRA_ERROR | ASSERTION_ERROR | RUNTIME_ERROR",
  "error_message": "...",
  "error_stack": "..."
}

✔️ 6. V3 Database Schema Additions
6.1 orchestrator_agents
CREATE TABLE orchestrator_agents (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,   -- planner, builder, tester, releaser
  version TEXT NOT NULL,
  health_status TEXT DEFAULT 'unknown',
  cpu_usage NUMERIC,
  memory_usage NUMERIC,
  last_heartbeat TIMESTAMPTZ
);

6.2 orchestrator_events
CREATE TABLE orchestrator_events (
  id BIGSERIAL PRIMARY KEY,
  run_id BIGINT REFERENCES orchestrator_runs(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

✔️ 7. Real Test Executor Design (V3)
7.1 Node+Playwright Test Executor (local/dev mode)

Each test execution uses:

Node.js

Playwright

Your test files in ./tests

Worker container spins up per test suite or shard.

7.2 Containerized Executor (production mode)

Docker runner

Pre-warmed containers

Artifact collection (screenshots, videos, logs)

Test summary JSON output

Parallel sharding

7.3 Executor Output Format (JSON)
{
  "summary": {
    "passed": 12,
    "failed": 1,
    "duration": 4231
  },
  "results": [
    {
      "test_case": "login.spec.js",
      "status": "passed",
      "duration_ms": 320
    }
  ],
  "artifacts": ["video.mp4", "screenshot.png"]
}

✔️ 8. Orchestrator Engine Logic (V3)

The orchestrator now consults:

Run DB

Event bus

Agent health

Model selection logic

Error retry policies

V3 Pseudocode
function onEvent(event) {
  let run = loadRun(event.runId)

  switch(event.type) {
    case "run.created":
      startPlanner(run)
      break

    case "planner.completed":
      startBuilder(run)
      break

    case "builder.completed":
      startTester(run)
      break

    case "tester.completed":
      startReleaser(run)
      break

    case "releaser.completed":
      finalizeRun(run)
      break

    case "run.failed":
      markAsFailed(run)
      saveErrorContext(run, event)
      break
  }

  saveRun(run)
}

✔️ 9. V3 Auto-Advance Logic

auto-advance becomes optional and mainly used for:

Debugging

Manual orchestration

Kicking stuck runs

Instead, agents push events to the orchestrator.

However, the API still exists for compatibility.

✔️ 10. UI Specification (V3 – Full Orchestrator Dashboard)
Pages to Implement:
Page	Purpose
/runs	List all runs + status badges
/runs/[id]	Detailed run history
/runs/[id]/timeline	Visualization of phase transitions
/runs/[id]/logs	Real-time logs per agent
/agents	List agents and health
/settings/models	Per-phase model selection
Run Detail View Blocks:

Header (runId, timestamps, status)

Phase timeline

Planner output viewer (JSON)

Builder output + build artifacts

Tester results + Playwright artifacts

Releaser logs

Errors

Restart controls

Download artifacts (ZIP)

✔️ 11. PowerShell Extensions for V3
Tools to Add:
11.1 Create a Run
.\Invoke-RGPTCreateRun.ps1 -GoalTitle "Dark Mode" -GoalDescription "Implement dark mode"

11.2 Trigger Planner
.\Invoke-RGPTTriggerPlanner.ps1 -RunId 42

11.3 Start Full Orchestration (manual mode)
.\Invoke-RGPTForceOrchestrate.ps1 -RunId 42

11.4 Inspect Run
.\Invoke-RGPTInspectRun.ps1 -RunId 42

✔️ 12. V3 Done Criteria
Area	Target
Agents	All four agents implemented
Event Bus	Working + reliable
Test Executor	Real test execution with artifacts
DB Schema	V3 tables created and indexed
Orchestrator	Full lifecycle
UI	Full run dashboard
Logs	Unified run log viewer
Failure Handling	Retry + classification
Tooling	PowerShell suite complete
✔️ 13. Migration Path from V2 to V3

Add DB migrations

Implement event bus

Extract planner/builder/tester as independent micro-agents

Update Orchestrator to event-driven

Add UI run viewer

Switch Test Executor from stub → real executor

Introduce agent health probe system

✔️ 14. Appendix: Example Run (V3)
{
  "runId": 42,
  "phase": "tester_completed",
  "status": "success",
  "planner_output": {...},
  "builder_output": {...},
  "tester_output": {
    "results": [...],
    "artifacts": [...]
  },
  "releaser_output": {...},
  "events": [...],
  "created_at": "...",
  "updated_at": "..."
}

✔️ End of V3 Document