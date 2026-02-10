# RGPT-D1 — Dispatch-Guard (Runtime Pre-Execution Gate)

## Purpose
Hard-block any provider/tool execution unless the request is authorized and policy-compliant.

## Inputs
- user_context, org_context, cat_context, request_context, policy_snapshot, runtime_limits

## Must-pass Checks
1) CAT status = active
2) Org + user scope authorization
3) Provider allowlist intersection
4) Budget + rate limits
5) Tool/route permission
6) Schema exposure guard
7) Replay protection

## Output
verdict: ALLOW | DENY | CHALLENGE
deny_reason_code: stable enum
actions: enforcement actions
ledger_ref: dispatch ledger pointer

## Ledger
docs/ops/ledgers/runtime/DISPATCH_GUARD.jsonl
