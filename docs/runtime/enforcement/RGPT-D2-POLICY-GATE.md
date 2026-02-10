# RGPT-D2 — Runtime Policy-Gate

## Purpose
Runtime Policy-Gate enforces **live, hot-reloadable policies** during request execution.

Dispatch-Guard (D1) answers:
> *Can this request start?*

Policy-Gate (D2) answers:
> *Is this request still allowed under current policy?*

## Characteristics
- Policies are versioned
- Policies can change without redeploy
- Every decision is logged
- Fail-closed by default

## Typical Policies
- Provider allow/deny by CAT, org, environment
- Max token / cost ceilings
- Feature flags (enable/disable CATs, tools)
- Compliance modes (PII, region, audit)

## Enforcement Points
- After Dispatch-Guard
- Before provider execution
- Optionally mid-execution (D3 escalation)

## Output
ALLOW | DENY | DEGRADE | REROUTE

All outcomes are written to runtime ledgers.
