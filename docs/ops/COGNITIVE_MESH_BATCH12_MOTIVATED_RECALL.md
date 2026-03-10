# Cognitive Mesh Batch-12: Motivated Recall (MVP)

Last Updated: 2026-03-07

## Purpose

Batch-12 adds a minimal Motivated Recall Engine that decides if memory recall should run before Batch-10/11 memory packet adoption.

This layer is bounded and deterministic:
- decides `enableRecall`
- chooses `recallMode` (`none|explicit|implicit|hybrid`)
- returns traceable reasons/signals

## Motivation Signals

Signals are grouped across 4 domains.

1. Problem/task context:
- `goalRelevance`
- `riskIndicator`
- `repetitionIndicator`
- `unresolvedContextRelevance`

2. Experience/learning:
- `priorExperienceUsefulness`
- `experienceLayerMatch`
- `learnerOutputRelevance`
- `analysisResultRelevance`

3. System state:
- `catHelpSignal`
- `repairRequirementSignal`
- `creativeNeedSignal`

4. Future-compatible:
- `dreamMemoryRelevance` (minimal scoring hook only)

## Scoring Model

The engine computes:
- `contextScore` from context signals
- `experienceScore` from experience/learning signals
- `systemScore` from system signals
- `dreamScore` from dream relevance

Weighted final score:
- context: `0.34`
- experience: `0.36`
- system: `0.22`
- dream: `0.08`

Recall rules:
- `score < low` => `none`
- `low <= score < high` => `implicit`
- `score >= high` => `hybrid`
- high risk (`riskIndicator >= 0.75`) forces `explicit` when recall is enabled

## Runtime Integration

Runtime flow in Batch-12:

Capability request
-> Motivated Recall decision
-> if enabled: Batch-10/11 memory adoption
-> memory packet generation/injection
-> capability execution
-> Batch-11 CAT feedback + experience synthesis loop

If Motivated Recall returns `none`, runtime skips memory invocation for that request.

## Contracts

Output contract:

```ts
{
  enableRecall: boolean,
  recallMode: "none" | "explicit" | "implicit" | "hybrid",
  score: number,
  confidence: number,
  reasons: string[],
  signalsTriggered: string[]
}
```

## Governance Compatibility

Batch-12 does not alter:
- Batch-9 trusted-commit semantics
- EPF governance taxonomy
- CEL harmful-pattern semantics
- fallback semantics

Motivated Recall controls memory invocation only; governance/trust decisions remain unchanged.

## Deferred

- contextual divergence engine
- consortium decision system
- expert parallel layers
- doctrine/constitutional expansion
- SQL persistence activation
- autonomous learning loops
- UI/dashboard work
