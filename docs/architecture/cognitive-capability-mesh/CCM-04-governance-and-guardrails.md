# CCM-04 Governance And Guardrails

## Governance Intent
CCM is designed to be governance-aware from the start. Capability invocation is not free-form.

Key governance inputs modeled in this batch:
- capability lifecycle status
- verification mode
- direct brain commit permission
- risk metadata

## Guardrails Enforced Now
1. Invokability by status
- suspended/retired/etc. are blocked
- only invokable statuses are accepted by registry/orchestrator

2. Verification requirement
- capability-level verification mode plus result `verificationRequired` drives verification handoff

3. Direct commit restriction
- payload commit to session brain is permitted only when:
  - result status is success
  - capability allows direct commit
  - verification outcome (if present) is acceptable

## Guardrail Signals In Runtime Artifacts
Runtime captures guardrail-relevant outcomes in:
- reasoning context entries for capability invocation and verification
- decision trail entries for selection/outcome/verdict

## Restricted / Suspended / Retired Semantics
- restricted: invokable with stricter verification semantics
- suspended: not invokable
- retired: not invokable

## Deferred Governance Work
Not implemented in Batch-7:
- full consortium workflow engine
- policy-as-code execution layer
- distributed capability approval service
- persistent governance audit store

These are intentionally deferred; contracts and status fields are in place for later expansion.

