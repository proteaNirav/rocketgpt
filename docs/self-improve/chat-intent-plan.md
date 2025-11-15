# Chat-Intent-Driven Improvement Plan

- **Improvement ID:** IMP-0002
- **Title:** Use chat feedback as primary input for self-improvement
- **Priority:** high
- **Status:** in_progress
- **Started at:** 2025-11-14T18:52:34.899Z
- **Plan generated at:** 2025-11-15T02:16:39.921Z

## Description

Wire RocketGPT self-improve pipeline to read config/self-improve/chat_intents.jsonl and prioritize improvements based on latest chat intents from Nirav.

## Latest Chat Intent

- **From:** Nirav
- **At:** 2025-11-15T00:13:09+05:30
- **Intent:** Enable RocketGPT to read config/self-improve/chat_intents.jsonl and use my chat feedback as primary input for self-improvement tasks (plan, code, tests, docs).

## Next Steps (Draft)

1. Parse all chat intents from `config/self-improve/chat_intents.jsonl`.
2. Group intents by theme (UI, workflows, safety, performance, UX, etc.).
3. Map top chat themes to backlog items (existing or new).
4. Update backlog priorities based on recent chat signals.
5. (Later) Propose concrete code/doc changes as patches.

> NOTE: This document can be written to `docs/self-improve/chat-intent-plan.md` when SELF_IMPROVE_WRITE_PLAN=true.
