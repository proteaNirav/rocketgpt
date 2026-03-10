# Cognitive Mesh Batch-9: Ecosystem Protection Foundations (EPF)

Last Updated: 2026-03-07

## Why This Layer Exists

Batch-9 adds deterministic protection foundations to reduce unsafe runtime drift:
- explicit role boundaries
- commit/verification discipline completion
- negative-path governance taxonomy
- lifecycle protection completion
- harmful-pattern tagging in CEL

This batch does not introduce adaptive balancing or autonomous control.

## Role Boundaries

### Session Brain
- Owns cognitive state, working memory, lifecycle, and decision trail.
- Does not self-verify outcomes.
- Does not persist CEL records directly.

### Capability Mesh
- Owns capability invoke/orchestration and fallback routing.
- Does not self-approve trusted commits when required verification is unavailable or failed.
- Does not write to CEL storage directly.

### Verification
- Owns trust disposition:
  - `passed`
  - `failed`
  - `downgraded`
  - `inconclusive`
  - `unavailable`
- Does not become a general orchestrator.

### CEL
- Owns meaningful post-outcome capture.
- Does not alter runtime outcomes.
- Does not select capabilities.
- Captures outcome-level harmful patterns without becoming high-volume telemetry.

## Negative-Path Governance Taxonomy

Batch-9 normalized issue categories:
- `capability_unavailable`
- `capability_malformed_result`
- `verification_unavailable`
- `verification_failed`
- `guardrail_blocked`
- `fallback_exhausted`
- `lifecycle_violation`
- `runtime_capture_failed`

Usage is intentionally compact and deterministic.
Canonical source of truth: `src/core/cognitive-mesh/governance/negative-path-taxonomy.ts`.

## Commit and Verification Discipline

- No trusted commit when verification is required and unavailable.
- No trusted commit when verification fails.
- Downgraded verification remains explicit (`downgraded`) and blocks trusted commit.
- Guarded and fallback outcomes preserve provenance.
- Malformed capability outputs are normalized and prevented from trusted commit.
- Non-trusted outcomes are still preserved in orchestrator output/runtime traces/CEL capture flows where meaningful.

## Lifecycle Protection Rules

- Terminal session re-entry creates a fresh Session Brain instance.
- Duplicate finalization attempts remain harmless.
- Lifecycle violations are tagged through governance issues.
- Runtime markers/diagnostics remain explicit on failure paths.

## CEL Harmful-Pattern Tagging Scope

Record semantics:
- `governanceIssues`: canonical normalized issue codes for this outcome.
- `issue:*` tags: searchable convenience tags derived from `governanceIssues`.
- `harmful:*` tags: deterministic clustering labels for repeated/grouped instability patterns.

Batch-9 adds deterministic meaningful tags such as:
- repeated verifier absence
- repeated malformed capability result
- repeated fallback dependency
- guarded outcome clusters
- lifecycle violation attempts

Repeated semantics:
- scope: same session only
- source set: already captured meaningful records in the in-memory repository
- threshold: tag is emitted on the 3rd occurrence (`2` prior matches + current record)

`fallback_exhausted` semantics:
- used only for strict-mode failure handling paths where no permissive fallback path is allowed and execution exits as failed.
- fallback-mode completion paths preserve fallback provenance without forcing `fallback_exhausted`.

No adaptive response is performed in Batch-9.
