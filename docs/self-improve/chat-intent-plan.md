# Chat-Intent-Driven Improvement Plan

- **Improvement ID:** IMP-0002
- **Title:** Use chat feedback as primary input for self-improvement
- **Priority:** high
- **Status:** completed
- **Started at:** 2025-11-14T18:52:34.899Z
- **Plan generated at:** 2025-11-15T02:43:15.700Z

## Description

Wire RocketGPT self-improve pipeline to read config/self-improve/chat_intents.jsonl and prioritize improvements based on latest chat intents from Nirav.

## Latest Chat Intent

- **From:** Nirav
- **At:** 2025-11-15T08:03:04+05:30
- **Intent:** Prioritise improvements that make RocketGPT easier for me to operate from PowerShell (better logs, clearer statuses, and simple health commands).

## Next Steps (Draft)

1. Parse all chat intents from `config/self-improve/chat_intents.jsonl`.
2. Group intents by theme (UI, workflows, safety, performance, UX, etc.).
3. Map top chat themes to backlog items (existing or new).
4. Update backlog priorities based on recent chat signals.
5. (Later) Propose concrete code/doc changes as patches.

## What was delivered in this improvement

- Wired a dedicated plan doc: `docs/self-improve/chat-intent-plan.md` tracking IMP-0002.
- Stored chat-driven intents in `config/self-improve/chat_intents.jsonl` (Nirav → timestamp → intent).
- Added PowerShell observability tools so I can operate Self-Improve from the terminal:
  - `scripts/self-improve/self_improve_status.ps1` – shows recent Self-Improve runs (status, result, branch, event, updated).
  - `scripts/self-improve/self_improve_current.ps1` – shows active improvement metadata and latest chat intent (from this plan doc).
  - `scripts/rgpt_health.ps1` – combined “health snapshot” (recent runs + active plan + verdict).
  - `scripts/rgpt.ps1` – simple RocketGPT CLI:
    - `./scripts/rgpt.ps1 health`
    - `./scripts/rgpt.ps1 self-status`
    - `./scripts/rgpt.ps1 self-current`
- This closes IMP-0002 by making chat-driven intents visible and operable from PowerShell.


> NOTE: This document can be written to `docs/self-improve/chat-intent-plan.md` when SELF_IMPROVE_WRITE_PLAN=true.
