# CTP-07 — Claude Coding Input Contract (Minimal)

## Purpose
Define the minimum, explicit constraints and input format for using Claude (Claude Code / CI) as a **read-only, suggestion-only** coding accelerator for RocketGPT.

This contract ensures:
- Claude can generate actionable code suggestions and patches
- RocketGPT retains final authority (Policy Gate + Approvals + Ledger)
- No secret handling or repo write risk is introduced

---

## Non-Negotiable Constraints (Hard Rules)
Claude MUST:
1. Operate as **read-only** on repository inputs (diffs, file contents provided).
2. Produce outputs as **suggestions only** (patches/snippets/docs/tests).
3. Avoid requesting or using secrets, tokens, API keys, or credentials.
4. Never instruct enabling insecure shortcuts (e.g., disabling auth, skipping Policy Gate).
5. Never assume access to tools/services not explicitly provided.
6. Prefer smallest viable changes that pass checks (lint/test/build).

Claude MUST NOT:
- Push commits, open PRs, merge PRs, or modify the repo directly.
- Use or request secrets. If a secret seems required, it must respond: "Require maintainer to supply via CI secret store".
- Change workflow governance rules (Policy Gate / Approval rules) unless explicitly authorized in a separate approval checkpoint.

---

## Allowed Inputs (What We Provide Claude)
Claude may be given:
- Target task description (single objective)
- Relevant file contents (limited set)
- Git diff (preferred) and/or error logs from CI
- Repo conventions (lint, formatting, naming, folder structure)
- Acceptance criteria (must-pass checks)

Claude should NOT be given:
- Entire repository unless required
- Secrets or production credentials
- Unredacted customer data

---

## Output Formats (What Claude Must Return)
Claude must return results in ONE of the following formats:

### A) Unified Diff Patch (Preferred)
- Patch applies cleanly on current branch
- Touch only necessary files
- Include minimal context
- No unrelated refactors

### B) File-by-file Output
- Explicit file path header
- Full new file content when creating files
- Only changed sections when editing, if patch is not possible

### C) Test Plan + Test Code
- Add tests first when bug is known
- Prefer deterministic tests
- Include how to run locally / in CI

### D) Root Cause + Minimal Fix
- Provide diagnosis in bullets
- Provide fix in patch/snippets
- Provide validation steps

---

## Quality Gates (Must Satisfy)
Claude outputs must:
- Compile/build for the target project
- Pass existing lint rules
- Include/update tests when behavior changes
- Avoid breaking public APIs unless requested
- Preserve backward compatibility where feasible

---

## Task Prompt Template (Maintainer → Claude)
Use this exact structure for requests:

**Context**
- Repo area:
- Current behavior:
- Desired behavior:
- Constraints:
- Files provided:
- Logs / errors:
- Acceptance criteria:

**Task**
- Do:
- Don’t:
- Output format (A/B/C/D):

---

## Example Prompt
**Context**
- Repo area: next/app/api/orchestrator/*
- Current behavior: route fails with 500 when input missing
- Desired behavior: return 400 with schema error
- Constraints: no workflow changes, keep API response contract stable
- Files provided: <list>
- Logs/errors: <paste>
- Acceptance criteria: pnpm test passes; eslint passes; response includes error.code

**Task**
- Do: implement validation + tests
- Don’t: refactor unrelated modules
- Output format: A) Unified Diff Patch

---

## Review & Acceptance (RocketGPT Governance)
- Claude output is reviewed via: Policy Gate + Approvals v9 (if risk >= threshold)
- Decision recorded in: Decision Ledger (accept/reject + rationale)
- Maintainer applies patch and runs CI checks before merge

---

## Versioning
- Contract ID: CTP-07-INPUT
- Owner: RocketGPT Maintainers
- Status: Active
