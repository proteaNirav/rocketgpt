# AGENTS.md

## Global Rules (Mandatory)
- Do not add heavy dependencies.
- Hot-path DB queries: maximum 2 per request.
- Any work expected to exceed 500ms must be moved to a background job.
- Always return a response shell within 1.5s (or stream the first chunk).
- Implement caching for plan generation and CAT registry summary.
- Implement metrics: `plan_latency_ms`, `first_response_ms`, `cache_hit`, `deep_mode_rate`, `timeout_rate`, `fallback_rate`, `improvise_rate`.
- Session "improvise intelligence" must be chat/session isolated (no global writes) unless an explicit "Promote" action is invoked.
- Preserve existing governance gates behavior; integrate via hooks only.
- Add tests (unit + a small benchmark) for any hot path.
