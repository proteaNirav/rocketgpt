# CAT Complete View (v1.0) — RocketGPT-Aligned Nano-Robot Model

## 1. What a CAT is (Authoritative Definition)
A CAT (Contract-Agent-Team) is a **task-scoped nano-worker** that runs on **RocketGPT Core intelligence** and operates strictly under:
- **Execution Context v2** (read-only situational snapshot)
- **Decision Ledger** (append-only trace of intent, risk, reasoning, and outcomes)
- **Policy + Safe-Mode controls**

A CAT is designed to help a user achieve **day-to-day goals** by executing small, bounded tasks and producing actionable outputs.

### CAT is NOT
- A standalone AI platform
- An always-running background agent
- A self-learning entity without oversight
- A policy-mutating engine
- A free-form prompt bundle that bypasses governance

---

## 2. Core Mental Model
- **User** = commander
- **CATs** = nano-robots (hands/eyes/scouts)
- **RocketGPT** = command centre (brain, governance, aggregation, long-term insights)

Hierarchy:
YOU → CATs (workers) → RocketGPT (command centre)

---

## 3. Non-Negotiable Invariants (Hard Rules)
### 3.1 Local-First CAT Invariant (Locked)
Every CAT must be fully useful locally without RocketGPT:
- Runs without requiring RocketGPT to be online
- Produces **local results** every run
- Explains what it did and why

RocketGPT later provides **more comprehensive views** by aggregation and correlation.

### 3.2 Ledger Always On
- No execution without a Decision Ledger entry
- Ledger is append-only
- Even offline runs produce a **local ledger** (JSONL)

### 3.3 Deterministic Start State
- CAT runs start from a known state
- No hidden memory bleed between runs unless explicitly permitted

### 3.4 Human-in-the-Loop Controls
CAT must support:
- Run / Pause / Stop
- Continue with reduced scope
- Explicit confirmations for chaining

---

## 4. CAT Identity & Versioning
Each CAT must declare:
- cat_id (immutable)
- name
- semantic version (MAJOR.MINOR.PATCH)
- compatible RocketGPT Core versions
- mission statement + forbidden actions
- supported modes: Cloud / Edge / Offline-Degraded

Rules:
- Any behavioural logic change = new CAT version
- Configuration/profile change is logged (not necessarily a version bump)
- No silent upgrades

---

## 5. Behaviour Profiles (User Control)
CATs expose safe tuning via profiles (not arbitrary prompt edits):
- Conservative
- Balanced (default)
- Aggressive
- Audit-only

Profiles map to constraints such as:
- risk thresholds
- token budgets
- retry limits
- execution allowed/blocked

---

## 6. Modes of Operation
### 6.1 Cloud Mode
- Full policy evaluation available
- Full RocketGPT aggregation available
- Still local-first outputs are required

### 6.2 Edge Mode (PC)
- Runs locally on device
- Produces local outputs + local ledger
- Sync is optional and consent-based

### 6.3 Offline-Degraded Mode
- Runs locally with strict limitations:
  - No learning writes
  - No policy mutation
  - Policy evaluation is read-only / cached at best
- Local outputs still mandatory

---

## 7. Execution Lifecycle (Run Contract)
1) Load CAT manifest and validate compatibility
2) Build Execution Context v2 and compute context_hash
3) Write DecisionEntry (intent, constraints, risk, confidence)
4) Execute permitted steps (Planner/Builder/Tester as applicable)
5) Write DecisionOutcome (status, metrics, side-effects)
6) Produce local outputs (mandatory)
7) Optionally prepare sync summary for RocketGPT

No step may bypass ledger or context.

---

## 8. Local Outputs (Mandatory, Every Run)
A CAT run cannot be considered complete unless these files are written:

1) runs/<run_id>/result.md
2) runs/<run_id>/result.json
3) logs/<run_id>/ledger.jsonl
4) exports/<run_id>/run_report.xlsx (or CSV)

If any mandatory export fails:
- outcome = export_failed
- partial outputs still written
- reasons documented locally

---

## 9. Decision Ledger (What it records)
DecisionEntry includes:
- who (agent + cat_id + version)
- what (decision_type, intent)
- why (reasoning, evidence)
- governance (constraints, policy state, safe-mode)
- risk_score and confidence_score
- context_hash

DecisionOutcome includes:
- status (success/partial/blocked_policy/blocked_token/failed_runtime/stopped_by_user/export_failed)
- metrics (duration, tokens, retries)
- side effects (files changed, tests run)

---

## 10. Token = Energy Model
Tokens represent “energy”.
CATs must support:
- total token budget
- per-phase budgets
- minimum reserve
- attribution by phase + decision

If energy falls below threshold:
- stop gracefully
- write partial outputs
- recommend tuning (profile/budget)

---

## 11. Multi-CAT Discovery and Chaining
When multiple CATs exist:
- runtime lists CATs
- user can run one or create a chain (A → B → C)

Chaining rules:
- explicit user confirmation required
- CAT B must validate compatibility of CAT A output
- each handoff logged in Decision Ledger
- standardized handoff artifact (handoff.json + optional handoff.md)

---

## 12. RocketGPT Aggregation (When Connected)
RocketGPT is the command centre:
- correlates across CATs, time, devices, projects
- generates strategic insights (“what works / what fails / where to improve”)
- suggests improvements (read-only; no auto-apply)
- maintains long-term learning and governance

Sync principle:
- CAT syncs **summary.json** (signals + metadata), not raw logs by default
- raw logs are never pulled without explicit user consent

---

## 13. Forbidden Capabilities (v1.0)
A CAT must never:
- mutate RocketGPT policies
- self-learn without review/approval
- run hidden tools
- auto-sync data without consent
- execute outside mission boundaries
- bypass Safe-Mode/controls

Violation results in:
- deny decision
- audit flag
- local explanation

---

## 14. Success Criteria (What “good” looks like)
- CAT is useful locally, every time
- User can understand what happened from local outputs alone
- RocketGPT provides a broader, more powerful view when connected
- Governance is preserved under all modes
- CAT behaviour is controllable and versioned

---

## 15. Glossary
- CAT: Contract-Agent-Team (nano-worker)
- RocketGPT: command centre (brain + governance + aggregation)
- Execution Context v2: read-only situational snapshot
- Decision Ledger: append-only reasoning and outcomes log
- Local-first: results always available locally without RocketGPT

