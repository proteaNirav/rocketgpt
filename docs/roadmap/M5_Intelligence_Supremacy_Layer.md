Param(
    # Root of your RocketGPT repo. Change if needed.
    [string]$RepoRoot = "D:\Projects\RocketGPT\rocketgpt"
)

Write-Host "`n[RGPT-M5] RocketGPT M5 roadmap injector starting..." -ForegroundColor Cyan

# 1) Basic path checks
if (-not (Test-Path $RepoRoot)) {
    Write-Host "[RGPT-M5] ERROR: RepoRoot not found: $RepoRoot" -ForegroundColor Red
    Write-Host "Please edit the script Param RepoRoot and try again."
    exit 1
}

Set-Location $RepoRoot
Write-Host "[RGPT-M5] Working directory set to: $(Get-Location)" -ForegroundColor DarkCyan

# 2) Ensure docs/roadmap directory exists
$RoadmapDir = Join-Path $RepoRoot "docs\roadmap"
if (-not (Test-Path $RoadmapDir)) {
    Write-Host "[RGPT-M5] docs\roadmap not found. Creating..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $RoadmapDir -Force | Out-Null
} else {
    Write-Host "[RGPT-M5] docs\roadmap already exists." -ForegroundColor DarkGray
}

# 3) Prepare target file path
$M5File = Join-Path $RoadmapDir "M5_Intelligence_Supremacy_Layer.md"

# 4) Backup existing file (if any)
if (Test-Path $M5File) {
    $Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $BackupFile = "$M5File.bak.$Timestamp"
    Copy-Item $M5File $BackupFile
    Write-Host "[RGPT-M5] Existing M5 file found. Backup created: $BackupFile" -ForegroundColor Yellow
}

# 5) Define M5 roadmap markdown content
$M5Content = @"
# RocketGPT Roadmap — Milestone M5: Intelligence Supremacy Layer

## Goal of M5
Transform RocketGPT from a capable AI orchestrator into a **deterministic, self-improving, multi-model AI Operating System** that **outperforms Gemini 3.0 at the system level**.

---

## Strategic Context

RocketGPT will **not compete at the single-model level**.

It will decisively outperform Gemini 3.0 by operating as a **model-agnostic, agent-driven AI Operating System** focused on **execution, governance, and verified outcomes**.

- **Gemini 3.0:** General-purpose multimodal assistant  
- **RocketGPT:** Autonomous AI Execution & Governance Platform

RocketGPT’s differentiation lies in **how intelligence is planned, orchestrated, validated, and evolved**, not merely generated.

---

## M5.0 — Foundation Lock (Prerequisite)

**Status:** Must be completed before M5.1  
**Objective:** Stabilize contracts, safety, and orchestration boundaries.

### Deliverables
- Agent interface contracts (Planner, Builder, Tester, Reviewer, Releaser)
- JSON schema enforcement engine
- Model adapter interface (OpenAI, Gemini, Claude, Local)
- Central execution context (e.g. `ExecutionContext` object)
- Safety & rollback guardrails

### Acceptance Criteria
- All agents communicate **only via schemas**
- Model calls are fully abstracted behind adapters
- Execution can be replayed deterministically

---

## M5.1 — Model Arbitration Engine (Core Differentiator)

**Objective:** Decide *which* model should think, per step.

### Features
- Model capability registry
- Task classification engine
- Cost / confidence / latency aware routing
- Automatic fallback on failure
- Multi-model retry logic

### Example Routing Logic

```json
{
  "task_type": "code_review",
  "preferred_model": "claude",
  "fallback": ["gpt-5.1"],
  "confidence_threshold": 0.8
}
