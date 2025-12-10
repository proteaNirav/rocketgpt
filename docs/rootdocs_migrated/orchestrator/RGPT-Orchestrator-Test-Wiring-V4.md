📘 RocketGPT Orchestrator Architecture — V4 (Self-Healing, Self-Improving AI System)
Document ID: RGPT-Orchestrator-Test-Wiring-V4
Last Updated: 2025-12-09
Author: RocketGPT Automated Assistant
🚀 1. Purpose of V4

V4 evolves RocketGPT into a self-healing, self-improving, safety-aware orchestrator, capable of:

Detecting failures automatically

Classifying root causes (LLM error, infra error, logic error)

Repairing itself in real time

Auto-patching code, prompts, tests, or configurations

Replaying failed pipelines

Running self-improve loops

Enforcing safety & governance constraints

Backing up and migrating its own artifacts

Selecting the best LLM for each phase (OpenAI, Claude, Gemini, Local)

Dynamically adjusting model temperature, context strategies, and reasoning depth

V4 is the foundation of RocketGPT’s Neural Orchestrator and bridges the system toward autonomous operation.

✔️ 2. V4 Architecture Overview

V4 introduces five new subsystems:

 +---------------------------------------------------------+
 |                  V4 Neural Orchestrator                 |
 +---------------------------------------------------------+
 |   Self-Healing Engine      |    Self-Improvement Engine |
 |---------------------------------------------------------|
 |   Failure Classification    |    Code/Prompt/Test Auto   |
 |   Auto-Repair Rules        |    Refactor Engine (LLM)    |
 |   Retry-Orchestrator       |    Safety-locked Reviewer   |
 +---------------------------------------------------------+
 |   Governance & Safety Layer (Policy Gate + LLM Filters) |
 +---------------------------------------------------------+
 |            Multi-LLM Mesh + Model Selection Engine      |
 +---------------------------------------------------------+
 |     Event Bus / Agents / Executors / DB (V3 foundation) |
 +---------------------------------------------------------+


V4 is backwards-compatible with V3, but introduces autonomy, safety locks, and self-repair intelligence.

✔️ 3. V4 New Subsystems
3.1 Self-Healing Engine

The system can automatically respond to errors by:

Classifying them

Choosing appropriate repair actions

Replaying the failed phase

Adjusting parameters dynamically

Error Classification
Error Type	Cause	Automated Healing Action
LLM_ERROR	Bad output, invalid JSON, hallucination	Regenerate, retry with constraints
INFRA_ERROR	Timeout, network, container crash	Retry, move workload to another agent
ASSERTION_ERROR	Test failure, output mismatch	Patch builder/tester instructions
LOGIC_ERROR	Wrong plan, invalid steps	Self-refine planner output
CONFIG_ERROR	Missing config/env files	Auto-create defaults
SAFETY_ERROR	Violation of allowed behaviors	Apply policy corrections
3.2 Self-Improvement Engine

Runs automated improvement cycles:

Improvement Loops:

Prompt Optimization Loop

Plan Optimization Loop

Builder Instruction Refinement

Test Coverage Expansion Loop

Agent Behavior Reinforcement Loop

Failure-Based Improvement Loop

Inputs for Improvement:

Run histories

Logs

Test artifacts

Error classifications

Previous planner/builder/tester outputs

Human feedback (optional)

Outputs:

Improved prompts

Updated code

New tests

Auto-commits / PRs

Versioned improvements

3.3 Governance & Safety Layer (Policy Gate v2)

Before any AI-generated change is applied, V4 activates:

+---------------------+
|  POLICY GATE v2     |
+---------------------+
| - SafeRewrite       |
| - SafeRefactor      |
| - SafeTestGen       |
| - Workflow Safety   |
| - AutoMerge Control |
+---------------------+


This enforces:

Code safety

Workflow safety

Prompt safety

LLM output validation

PR label-based governance

No unauthorized workflow edits

The system uses:

Syntax validation

Static analysis

Actionlint

Safety allowlist labels

LLM-based verification

3.4 Multi-LLM Mesh (Dynamic Selection)

Each phase can choose the best model:

Phase	Recommended Models
Planner	Claude / GPT-4.1 / Gemini Flash Thinking
Builder	GPT-4.1 / Claude / Local reasoning models
Tester	Local model for performance or log parsing
Releaser	GPT-4.1-mini or local
Analyzer	Claude-Sonnet or GPT-5 (when needed)

Decision is based on:

Cost

Token footprint

Temperature needs

Accuracy

Model reasoning score

Prompt templates

3.5 Autonomous Replay + Resume Engine

The system can:

Resume a failed run at any phase

Replay only failing phases

Regenerate only broken artifacts

Compare outputs with prior versions

Ensure test alignment

Automatically close runs after stability is verified

✔️ 4. V4 State Machine (Self-Healing Enabled)
pending
  ↓
planner_running → planner_error → self_heal → planner_running
  ↓
planner_completed
  ↓
builder_running → builder_error → self_heal → builder_running
  ↓
builder_completed
  ↓
tester_running → tester_error → self_heal → tester_running
  ↓
tester_completed
  ↓
releaser_running → releaser_error → self_heal → releaser_running
  ↓
done

✔️ 5. V4 Database Schema Extensions
5.1 orchestrator_self_heal_events
CREATE TABLE orchestrator_self_heal_events (
    id BIGSERIAL PRIMARY KEY,
    run_id BIGINT REFERENCES orchestrator_runs(id),
    phase TEXT,
    error_type TEXT,
    heal_action TEXT,
    heal_output JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

5.2 Add fields to orchestrator_runs
ALTER TABLE orchestrator_runs
ADD COLUMN retry_count INT DEFAULT 0,
ADD COLUMN max_retries INT DEFAULT 3,
ADD COLUMN last_heal_action TEXT,
ADD COLUMN quality_score NUMERIC;

✔️ 6. V4 Auto-Advance Logic (Self-Healing Enabled)
High-Level Flow
if (phaseError) {
    classifyError()
    attemptHeal()
    if (healSuccess) retryPhase()
    else markRunFailed()
}
else {
    advanceToNextPhase()
}

Auto-Heal Actions (Examples)

Regenerate planner plan with constraints

Fix invalid JSON via correction pass

Rerun builder with stricter validation

Rewrite tests via TestGen agent

Re-validate models

Switch to safer LLM model if hallucinating

✔️ 7. V4 Agents
Agent	Role	V4 Enhancement
Planner Agent	Generate plan	Self-correct plans, detect missing steps
Builder Agent	Execute steps	Auto-fix broken commands, regenerate partial outputs
Tester Agent	Execute tests	Smarter log parsing + test regeneration
Releaser Agent	Finalization	Validate readiness, ensure safety locks
Analyzer Agent	Cross-run optimization	Compare runs, identify regression patterns
Repair Agent	Validate + repair failures	Executes self-healing logic
✔️ 8. V4 Sequence Diagram
User → POST /run
Orchestrator → Planner Agent
Planner → Event(planner.completed)
Orchestrator → Builder Agent
Builder → Event(builder.error)
Self-Heal Engine → Repair Agent
Repair Agent → Patch plan / code / test
Repair Agent → Event(heal.success)
Orchestrator → Retry(builder_running)
...
Event(releaser.completed)
Orchestrator → mark done

✔️ 9. V4 UI Specification
9.1 New UI Components
UI Component	Description
Self-Heal Timeline	Shows retries + repairs
Root-Cause Visualization	Shows error type and fix applied
Diff Viewer	View before/after of repaired artifacts
Model Selection Panel	Switch LLM for specific phases
Live Replay Console	Observe self-healing attempts
Agent Health Dashboard	Real-time agent performance
✔️ 10. V4 PowerShell Tooling Enhancements
New V4 Scripts:
Script	Purpose
Invoke-RGPTSelfHeal.ps1	Trigger heal cycle manually
Invoke-RGPTReplayRun.ps1	Replay failed phases
Invoke-RGPTDiffRun.ps1	Compare runs
Invoke-RGPTSwitchModel.ps1	Change model for a run or agent
Example
.\Invoke-RGPTReplayRun.ps1 -RunId 42 -Phase tester_running

✔️ 11. V4 Done Criteria
Area	Target
Self-Healing	All error types classified + patched
Self-Improvement	Improved code/prompt/test after runs
Governance	Policy Gate v2 active
Multi-LLM	Dynamic routing per phase
Distributed Agents	5+ agents live
Event Bus	Fully async
UI	Self-heal timeline implemented
DB	Healing + replay tables created
Test Executor	Real tests executed & repaired
✔️ 12. Appendix: Example Self-Heal Output
{
  "runId": 42,
  "phase": "builder_running",
  "error_type": "LLM_ERROR",
  "heal_action": "regenerate_step_3",
  "heal_output": {
    "message": "Regenerated step with better JSON constraints."
  }
}

✔️ End of V4 Document