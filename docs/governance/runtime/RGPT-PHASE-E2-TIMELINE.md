# RGPT-PHASE-E — E2 Unified Timeline (Runtime Ledgers)

## Objective
Phase-E2 establishes a single, authoritative, time-ordered runtime ledger timeline for RocketGPT execution to ensure traceability, auditability, causality, and post-facto reconstruction of every AI-driven action across planners, orchestrators, CATs, providers, and guards.

Core question:
> What exactly happened, in what order, under which authority, and why?

## Scope
- Planner → Orchestrator → CAT → Provider execution flow
- Policy gates, guards, and runtime decisions
- Success, failure, retries, fallbacks, aborts
- Human overrides and emergency controls
- Cross-provider and cross-model execution stitching

## Design Principles
1. **Single Source of Truth**
   - One canonical runtime timeline per execution chain
   - Append-only; immutable after finalization
2. **Causality First**
   - parent_event_id, caused_by_event_id, trigger_reason, decision_ref
3. **Clock Neutrality**
   - sequence_no is primary ordering; timestamps are secondary
4. **Provider-Agnostic**
   - Normalize OpenAI / Claude / Gemini / local LLM events into one schema

## Unified Runtime Timeline Layers

### Layer 0 — Execution Envelope
Events:
- EXECUTION_CREATED
- EXECUTION_CONTEXT_LOCKED
- EXECUTION_FINALIZED

### Layer 1 — Planning
Events:
- PLAN_REQUESTED
- PLAN_GENERATED
- PLAN_VALIDATED
- PLAN_REJECTED

### Layer 2 — Orchestration
Events:
- ORCHESTRATION_STARTED
- CAT_SELECTED
- PROVIDER_ROUTED
- FALLBACK_TRIGGERED

Rules:
- Every routing decision must be logged
- No silent retries (retries must emit events)

### Layer 3 — CAT Execution
Events:
- CAT_INVOKED
- CAT_CONTEXT_BOUND
- CAT_ACTION_EXECUTED
- CAT_ACTION_ABORTED

Wrapper handling:
- wrapper_cat_id and origin_cat_id both captured when applicable

### Layer 4 — Provider Interaction
Events:
- PROVIDER_CALL_SENT
- PROVIDER_RESPONSE_RECEIVED
- PROVIDER_ERROR
- PROVIDER_TIMEOUT

Captured:
- provider_name, model_name, model_version (if known)
- token counts
- latency_ms (optional)
- safety flags (if any)

### Layer 5 — Guard & Policy
Events:
- POLICY_GATE_EVALUATED
- POLICY_GATE_BLOCKED
- RUNTIME_GUARD_TRIGGERED
- SAFE_MODE_ENTERED

Important:
- Guards must not modify outcomes silently; every intervention emits an event

### Layer 6 — Resolution
Events:
- RESULT_COMMITTED
- RESULT_REDACTED
- EXECUTION_ABORTED
- EXECUTION_COMPLETED

## Ordering Rules
1. Primary: sequence_no (monotonic per execution_id)
2. Secondary: event_time_utc
3. Causality links:
   - parent_event_id
   - caused_by_event_id
   - decision_ref (link to decisions ledger)

## Storage Strategy
Primary:
- runtime_timeline.jsonl (append-only)

Derived views (rebuildable):
- execution waterfall
- provider cost timeline
- guard intervention heatmap
- CAT usage graph

## Failure / Edge Cases
- Partial provider response: PROVIDER_RESPONSE_RECEIVED with status=partial
- Timeout: PROVIDER_TIMEOUT must be recorded before fallback
- Human override: HUMAN_OVERRIDE_APPLIED
- Emergency kill: EXECUTION_ABORTED with authority + reason

## Exit Criteria
E2 is complete when:
1. Every execution produces a unified timeline
2. No silent decisions exist at runtime
3. Timeline can be replayed end-to-end
4. Guards and CATs are timeline-first citizens
5. Timeline remains consistent under async, retries, and failures
