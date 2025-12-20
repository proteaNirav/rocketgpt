📘 RocketGPT Orchestrator–Tester Wiring — V2 Architecture & Specification
Document ID: RGPT-Orchestrator-Test-Wiring-V2
Last Updated: 2025-12-09
Author: RocketGPT Automated Assistant
🚀 1. Purpose of V2

V2 expands the V1 wiring to introduce a real orchestration lifecycle, including:

Persistent run storage (DB-based)

State transitions (planner → builder → tester → releaser → done)

Retry logic

Long-running run support

Complete auto-advance logic

UI integration model

API schemas

Sequence diagrams

Event-based and API-based control plane

Future-proof extension points for multi-agent, multi-model execution

V2 is the production architecture baseline for RocketGPT’s Orchestrator Engine.

✔️ 2. V2 Architecture Summary
User Action → Planner → Run Created (DB) → Orchestrator Engine  
  → Builder → Tester → Releaser → Completed

Key Enhancements in V2:
Area	V1	V2
Run Tracking	None	Full DB table with metadata + timestamps
State Machine	Stub (noop)	Full lifecycle phases
Auto-Advance	Accepts runId	Drives complete pipeline
Logs	Tester stub logs	Unified logs per run in DB
UI	Not wired	Full run viewer + logs pane
Persistence	None	Supabase / PostgreSQL tables
Restartability	No	Restart pipeline from last safe phase
Error Handling	Basic	Structured errors, retries, escalation
Multi-Agent	Single stub	Planner/Builder/Tester/Releaser independence
✔️ 3. Run Lifecycle (State Machine)
3.1 Phases
Phase	Description
pending	Run created, not yet processed
planner_running	Planner LLM executing plan
planner_completed	Plan stored in DB
builder_running	Builder executing steps
builder_completed	Build output stored
tester_running	Tester executing test suite
tester_completed	Test results stored
releaser_running	Deployment/publishing logic
done	Pipeline finished successfully
error	A blocking failure occurred
noop	Only allowed as placeholder for backwards compatibility
3.2 State Transition Rules
pending → planner_running
planner_running → planner_completed | error
planner_completed → builder_running
builder_running → builder_completed | error
builder_completed → tester_running
tester_running → tester_completed | error
tester_completed → releaser_running
releaser_running → done | error
error → (terminal)


Auto-advance triggers transitions based on the current phase’s completion.

✔️ 4. Database Schema (Supabase / PostgreSQL)
4.1 Table: orchestrator_runs
CREATE TABLE orchestrator_runs (
    id BIGSERIAL PRIMARY KEY,
    goal_title TEXT NOT NULL,
    goal_description TEXT,
    planner_model TEXT DEFAULT 'gpt-4.1-mini',
    builder_model TEXT DEFAULT 'gpt-4.1-mini',
    tester_model TEXT DEFAULT 'gpt-4.1-mini',
    releaser_model TEXT DEFAULT 'gpt-4.1-mini',

    -- State machine
    phase TEXT NOT NULL DEFAULT 'pending',
    status TEXT NOT NULL DEFAULT 'pending',   -- success / error / pending

    -- Results per phase stored as JSONB
    planner_output JSONB DEFAULT '{}'::jsonb,
    builder_output JSONB DEFAULT '{}'::jsonb,
    tester_output JSONB DEFAULT '{}'::jsonb,
    releaser_output JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Error context
    error_message TEXT,
    error_stack TEXT
);

Indexes
CREATE INDEX idx_runs_phase ON orchestrator_runs (phase);
CREATE INDEX idx_runs_status ON orchestrator_runs (status);

4.2 Table: orchestrator_run_logs
CREATE TABLE orchestrator_run_logs (
    id BIGSERIAL PRIMARY KEY,
    run_id BIGINT NOT NULL REFERENCES orchestrator_runs(id),
    phase TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    message TEXT
);

✔️ 5. API Specification (V2)
5.1 POST /api/orchestrator/run

Creates a new orchestrator run in DB.

Request
{
  "goal_title": "Implement Dark Mode",
  "goal_description": "User wants dark mode in Settings UI"
}

Response
{
  "success": true,
  "runId": 42,
  "phase": "pending"
}

5.2 POST /api/orchestrator/auto-advance

Drives the lifecycle forward.

Request
{ "runId": 42 }

Response
{
  "success": true,
  "runId": 42,
  "phase": "builder_running",
  "phaseResult": { "message": "Builder started" }
}

5.3 GET /api/orchestrator/run/:runId

Returns full state of a run.

5.4 GET /api/orchestrator/run/:runId/logs

Returns logs grouped by phase.

✔️ 6. Orchestrator Engine Logic (Pseudocode)
switch (run.phase) {
  case "pending":
    run.phase = "planner_running"
    callPlanner(run)
    break

  case "planner_running":
    if (plannerComplete(run)) {
       run.phase = "planner_completed"
    }
    break

  case "planner_completed":
    run.phase = "builder_running"
    callBuilder(run)
    break

  case "builder_running":
    if (builderComplete(run)) {
       run.phase = "builder_completed"
    }
    break

  case "builder_completed":
    run.phase = "tester_running"
    callTester(run)
    break

  case "tester_running":
    if (testerComplete(run)) {
       run.phase = "tester_completed"
    }
    break

  case "tester_completed":
    run.phase = "releaser_running"
    callReleaser(run)
    break

  case "releaser_running":
    if (releaserComplete(run)) {
       run.phase = "done"
    }
    break
}

✔️ 7. Sequence Diagram (V2 High-Level)
User → POST /run
       ← runId:42

AutoAdvanceLoop → POST /auto-advance { runId:42 }
Orchestrator → Planner (LLM)
Planner → DB update planner_output
AutoAdvanceLoop → run state=planner_completed

AutoAdvanceLoop → Builder
AutoAdvanceLoop → Tester
AutoAdvanceLoop → Releaser

Final state: done

✔️ 8. UI Integration Plan (Next.js 14)
Components to Add
Component	Purpose
/runs page	List all runs
/runs/[runId]	Show full pipeline state
Phase timeline bar	planner → builder → tester → releaser
Live logs panel	Poll /run/:id/logs
Controls	Retry, Cancel, Auto-advance on/off
API calls in UI

useSWR('/api/orchestrator/run/' + id)

useSWR('/api/orchestrator/run/' + id + '/logs')

Expected UI sections

Run metadata

Phase status blocks

Logs (tailing mode)

Execution artifacts (ZIPs, files, JSON)

✔️ 9. PowerShell Enhancements for V2
9.1 Updated Loop

Invoke-RGPTAutoAdvanceLoop.ps1 remains unchanged for V2.
It handles:

runId

phase transitions

Terminal phases

9.2 New Script: Create Run (V2)

To be delivered in V3.

✔️ 10. Migration from V1 → V2
V1 behavior	V2 upgrade
No run storage	DB table orchestrator_runs
No state machine	Full lifecycle
Tester = stub	Real execution engine
Auto-advance = placeholder	Real driver
No UI	Full orchestrator dashboard
✔️ 11. V2 Done Criteria

 Run creation API implemented

 DB tables created and indexed

 Planner → Builder → Tester → Releaser executed in order

 Auto-advance uses real lifecycle logic

 UI for run viewer implemented

 Logs visible per phase

 Scriptable via PowerShell

 Planner/Builder/Tester models selectable

✔️ 12. Appendix: Example Future Run Output (V2-ready)
{
  "runId": 42,
  "phase": "tester_completed",
  "status": "success",
  "planner_output": { ... },
  "builder_output": { ... },
  "tester_output": {
     "results": [...],
     "logs": [...]
  },
  "releaser_output": {},
  "created_at": "...",
  "updated_at": "..."
}

✔️ End of V2 Document