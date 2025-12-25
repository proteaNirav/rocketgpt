# RocketGPT v4 Core AI – Post Go-Live Backlog (UI & Core)
Tag: go-live-ui-v4core-20251121
Date: 2025-11-21

This document tracks the work AFTER the v4 Core AI UI shell Go-Live.
Current prod: https://rocketgpt.vercel.app

---

## 1. Feature Wiring – Replace Placeholders with Real Features

### 1.1 Prompts (/prompts)
- [ ] Design prompt table layout (Name, Purpose, Tags, UpdatedAt).
- [ ] Decide data source (Supabase / Core API / static JSON for now).
- [ ] Implement read-only list.
- [ ] Add “View / Edit” drawer (even if stub).
- [ ] Handle empty state gracefully.

### 1.2 Runbooks (/runbooks)
- [ ] Define runbook entity (Id, Name, Category, Status, LastRun, NextRun).
- [ ] Show list of runbooks with basic filters (category, status).
- [ ] Add “Run” button (can be a stub for now).
- [ ] Show simple status/result placeholder.

### 1.3 Self-Improve Console (/self-improve)
- [ ] Define basic layout for v4 Core AI console (queue, history, details).
- [ ] Show current Self-Improve status from /api/self-improve/status.
- [ ] Display last run time and last result (OK / Error).
- [ ] Prepare space for backlog items (IMP-0001, IMP-0002, etc.).

### 1.4 Plans & Limits (/plans)
- [ ] Read limits from /api/limits.
- [ ] Show current plan (Bronze/Silver/Gold) and quotas.
- [ ] Display usage summary (today / 7d / 30d) if available.
- [ ] Add simple usage bars (even static for first iteration).

### 1.5 Models (/models)
- [ ] List configured models and providers (OpenAI, Claude, etc.).
- [ ] Show which are enabled for: Chat, Code, Tools, Background.
- [ ] Add badges for “Default” / “Beta”.

### 1.6 Logs (/logs)
- [ ] Decide data source for logs (Core API / Supabase).
- [ ] Show basic table: Time, Level, Source, Message.
- [ ] Add filters: last 1h / 24h / 7d and level (info/warn/error).

### 1.7 Settings (/settings)
- [ ] Group settings: UI (theme), Behaviour, Advanced.
- [ ] Make sure theme toggle works across all new pages.
- [ ] Reserve space for API keys / provider toggles (future).

---

## 2. CI & Workflow Fixes (main branch)

### 2.1 Fix failing ci.yml on main
- [ ] Inspect recent failed runs of `ci.yml` on `main`.
- [ ] Update paths / scripts so they match the current project structure.
- [ ] Re-run CI and confirm green build for a no-op commit.

### 2.2 Restore or replace UI smoke tests
- [ ] Decide final strategy for UI checks (Playwright / simple curl smoke).
- [ ] Ensure at least: `/`, `/sessions`, `/prompts`, `/runbooks`, `/self-improve` are probed.
- [ ] Integrate probes into CI or a dedicated `smoke.yml` workflow.

---

## 3. Safety & Governance (Policy Gate, Self-Heal, Self-Improve)

### 3.1 Policy Gate
- [ ] Review `.github/workflows/policy_gate.yml`.
- [ ] Align rules with v4 Core AI plan (what changes are allowed on main).
- [ ] Ensure it does not block normal small UI changes.

### 3.2 Self-Heal
- [ ] Review `.github/workflows/self_heal.yml`.
- [ ] Define when it should run (on failure? on schedule?).
- [ ] Confirm it does not attempt dangerous automatic fixes on main.

### 3.3 Self-Improve
- [ ] Review `.github/workflows/self_improve.yml`.
- [ ] Point it at the correct backlog/config files (e.g. AI_Evolution.md, self_improve_backlog.json).
- [ ] Ensure it only creates PRs, never pushes directly to main.

---

## 4. Dependencies & Security Hygiene

- [ ] Review Dependabot alerts (currently 4 high severity on main).
- [ ] Plan upgrades that will not break Next.js 14 + Supabase + Sentry.
- [ ] For each dependency bump, ensure:
  - CI passes,
  - Dev build works,
  - Prod smoke checks stay green.

---

## Notes

- Current prod snapshot is protected by tag: `go-live-ui-v4core-20251121`.
- Any risky experiment should be done on a feature branch and merged via PR with CI + smoke green.
