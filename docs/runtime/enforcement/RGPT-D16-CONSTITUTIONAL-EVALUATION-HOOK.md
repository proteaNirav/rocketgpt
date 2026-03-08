# RGPT-D16 - Constitutional Evaluation Hook

## Objective
Add a passive, centralized constitutional evaluation hook that assesses runtime/capability/adoption/experience outcomes against Constitutional Brain Layer v1 and emits structured metadata.

This phase is non-blocking by design.

## Scope
- Centralized evaluator:
  - `src/core/governance/constitution/constitutional-evaluation.ts`
- Runtime hook/wiring:
  - `src/core/cognitive-mesh/runtime/mesh-live-runtime.ts`
- Experience metadata propagation:
  - `src/core/cognitive-mesh/runtime/mesh-live-runtime.ts`

## Passive-only behavior
- No hard allow/deny behavior changes.
- Runtime Guard / Dispatch Guard semantics are unchanged.
- Capability execution and verification semantics are unchanged.
- Evaluations are attached as structured metadata only.

## Evaluation model
Each result includes:
- `evaluationId`
- `constitutionVersion`
- `evaluatedAt`
- `evaluatedEntityType`
- `evaluatedEntityId`
- `alignedPrinciples`
- `stressedPrinciples`
- `violatedPrinciples`
- `constitutionalStatus`
- `constitutionalScore`
- `constitutionalReasonCodes`
- `constitutionalTags`
- `metadata`

Statuses:
- `aligned`
- `aligned_with_tension`
- `tension_detected`
- `potential_violation`
- `insufficient_data`

## Deterministic rule basis (initial)
- Verified clean success: alignment boost.
- Deny/safe-mode guarded path: governance alignment signal.
- Degraded/fallback path: tension signal.
- Verification rejection/inconsistent outcomes: tension signal.
- Drift/integrity warnings: potential violation risk.
- Repeated anomaly-heavy signal sets: extra tension.
- Missing runtime evidence: deterministic `insufficient_data`.

## Principle mapping
The hook maps outcomes to the canonical v1 principle IDs loaded from:
- `configs/governance/rgpt_constitution_v1.yaml`

No parallel constitution source is introduced.

## Runtime output surfaces
- Capability trace metadata in reasoning/decision context includes constitutional status/score/reason codes.
- Execution ledger metadata includes constitutional status/score/reason codes.
- Experience records include constitutional evaluation summary in `experienceMetadata`.
- Working memory captures last constitutional status/score for session-level visibility.

## Non-goals (this phase)
- No constitutional hard blocking.
- No autonomous policy overrides.
- No dynamic constitutional edits at runtime.

