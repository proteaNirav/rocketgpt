# CEL Record Model and Capture Policy

## Experience Record Structure
Each `ExperienceRecord` includes:
- identity: `experienceId`, `sessionId`, `timestamp`
- source metadata: component/source/request/event identifiers
- situation and context
- action and verification
- outcome classification and quality metadata
- circumstantial signals
- learnable value assessment
- tags, relevance score, meaningful flag

## Outcome Classification
Deterministic outcomes:
- `successful`
- `successful-with-verification`
- `successful-with-fallback`
- `partial`
- `rejected`
- `failed`
- `guarded`
- `aborted`

Each outcome also has:
- status (`positive` | `neutral` | `negative`)
- `reusable`
- `stabilityImpact`
- concise summary

## Circumstantial Signals
CEL derives lightweight context:
- fallback/guardrail flags
- verification required/failed
- capability count signal
- complexity and fragility flags
- recovery path and low-confidence markers

## Learnable Value
`assessLearnableValue()` assigns:
- level (`high` | `medium` | `low` | `none`)
- deterministic rationale
- reusable value boolean

## Capture Policy
`ExperienceCapturePolicy.shouldCaptureExperience()` produces:
- `shouldCapture`
- `relevanceScore` (0..1)
- policy reasons

Policy intent:
- suppress trivial successful executions
- prioritize failed/rejected/guarded/fallback-rich/verification-heavy outcomes
- keep initial storage meaningful and bounded

Batch-8 operational note:
- current meaningfulness threshold (`relevanceScore >= 0.45`) is an initial governance policy for Batch-8 and may be tuned in future governed batches.
