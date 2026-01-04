# AUTH Surface Matrix

Generated: 2026-01-02 09:35:12

> Purpose: Define **route → required auth** for every runtime-allowlisted API endpoint.
> This file is used by policy_gate validation to ensure no endpoint ships without an auth classification.

## Allowed auth values
- public  (no auth)
- anon    (anonymous but rate-limited / guarded)
- auth    (requires signed-in user)
- service (server-to-server only)
- admin   (requires admin role)

## Matrix

| route | auth | notes |
|---|---|---|
| /api/rgpt/runtime-mode | auth | runtime-mode read-only flag for UI |
| /api/approvals/create | auth |  |
| /api/approvals/update-status | auth |  |
| /api/builder | auth |  |
| /api/core/[...path] | auth |  |
| /api/core-ai/ledger/ping | auth |  |
| /api/debug-auth | auth |  |
| /api/demo/chat | auth |  |
| /api/demo/orchestrator/status | auth |  |
| /api/demo/self-study | auth |  |
| /api/demo/upload | auth |  |
| /api/edge/[fn] | auth |  |
| /api/edge/echo | auth |  |
| /api/edge/ping | auth |  |
| /api/env | auth |  |
| /api/guest | auth |  |
| /api/health | auth |  |
| /api/limits | auth |  |
| /api/llm | auth |  |
| /api/logs | auth |  |
| /api/orchestrator/admin/safe-mode | auth |  |
| /api/orchestrator/admin/safe-mode/disable | auth |  |
| /api/orchestrator/admin/safe-mode/enable | auth |  |
| /api/orchestrator/auto-advance | auth |  |
| /api/orchestrator/build | auth |  |
| /api/orchestrator/builder | auth |  |
| /api/orchestrator/builder/execute-all | auth |  |
| /api/orchestrator/builder/execute-next | auth |  |
| /api/orchestrator/builder/list | auth |  |
| /api/orchestrator/clear-cache | auth |  |
| /api/orchestrator/config | auth |  |
| /api/orchestrator/health | auth |  |
| /api/orchestrator/health/basic | auth |  |
| /api/orchestrator/health/deep | auth |  |
| /api/orchestrator/info | auth |  |
| /api/orchestrator/logs | auth |  |
| /api/orchestrator/plan | auth |  |
| /api/orchestrator/planner/run | auth |  |
| /api/orchestrator/release | auth |  |
| /api/orchestrator/run | auth |  |
| /api/orchestrator/run/builder | auth |  |
| /api/orchestrator/run/finalize | auth |  |
| /api/orchestrator/run/planner | auth |  |
| /api/orchestrator/run/status | auth |  |
| /api/orchestrator/run/tester | auth |  |
| /api/orchestrator/run-history | auth |  |
| /api/orchestrator/safe-mode | auth |  |
| /api/orchestrator/start-run | auth |  |
| /api/orchestrator/status | auth |  |
| /api/orchestrator/test | auth |  |
| /api/orchestrator/tester/execute | auth |  |
| /api/orchestrator/test-tester | auth |  |
| /api/planner | auth |  |
| /api/planner/plan | auth |  |
| /api/plans | auth |  |
| /api/report-error | auth |  |
| /api/self-improve/run | auth |  |
| /api/self-improve/status | auth |  |
| /api/sessions | auth |  |
| /api/status | auth |  |
| /api/suggest | auth |  |
| /api/suggestions/[issue]/approve | auth |  |
| /api/suggestions/[issue]/reject | auth |  |
| /api/tester/health | auth |  |
| /api/tester/run | auth |  |
| /api/usage | auth |  |
| /api/version | auth |  |

