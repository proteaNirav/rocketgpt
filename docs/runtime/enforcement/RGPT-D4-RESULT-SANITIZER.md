# RGPT-D4 — Result Sanitizer (Post-Execution Enforcement)

## Purpose
Result Sanitizer runs **after provider output** but **before returning to the user**.

It enforces:
- output schema conformity (when schema is required)
- redaction of forbidden fields
- removal of leakage patterns (secrets, credentials, internal URLs)
- guardrails for policy compliance (PII modes, safe-mode)

## Outputs
- PASS (return unchanged)
- SANITIZED (return modified)
- BLOCK (refuse / return safe error)

All outcomes are written to:
docs/ops/ledgers/runtime/RESULT_SANITIZER.jsonl
