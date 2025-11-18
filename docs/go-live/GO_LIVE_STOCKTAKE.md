# RocketGPT · Go-Live Stock-Take (Branch: go-live/rls-repair)

**Date:** 2025-11-18 21:08:08
**Environment:** Production (Vercel) – https://rocketgpt.vercel.app  
**Deployed Commit:** 58567a74cd5113e0ed0f590237fa91673f101911  
**Version (from /api/health):** v0  

---

## 1. Build & Infrastructure

- [x] **/api/health**
  - Status: 200
  - ok: true, services.vercel = "assumed-ok", services.supabase = "assumed-ok"
  - Commit reported: 58567a74cd5113e0ed0f590237fa91673f101911

- [x] **Home page (/)** 
  - Status: 200
  - Next.js app loads successfully from Vercel.

- [x] **Prod = Local HEAD**
  - Local HEAD: 58567a74cd5113e0ed0f590237fa91673f101911
  - /api/health.commit: 58567a74cd5113e0ed0f590237fa91673f101911
  - Conclusion: **Production is running the current local HEAD.**

---

## 2. Core Public APIs

- [x] **/api/guest** (POST)
  - Status: 200
  - Body: {"ok": true}
  - Behavior: Guest bootstrap works.

- [x] **/api/limits** (GET)
  - Status: 200
  - Body (current): {"usage": [], "plans": [], "user_plans": []}
  - Note: Plan catalog is currently empty → to be addressed before or after Go-Live as a data-seeding task.

---

## 3. Self-Improve APIs

### 3.1 Status Endpoint

- [x] **/api/self-improve/status** (GET)
  - Status: 200
  - Body (example):
    - ok: true
    - writeEnabled: false
    - mode: "simulation"
    - Note: "This is a minimal self-improve status endpoint. Executor wiring is pending."

- Implementation summary:
  - New file: pp/api/self-improve/status/route.ts
  - Behavior: Purely read-only status, RLS-agnostic, no writes, explicitly reports simulation vs write mode.

### 3.2 Run Endpoint

- [x] **/api/self-improve/run** (POST)
  - Status: 202
  - Body (example):
    - ok: true
    - ccepted: true
    - writeEnabled: false
    - message: "Self-improve run trigger stub – executor wiring is pending. This endpoint currently only acknowledges the request."
  - Behavior: Stub-only, acknowledges trigger, does not execute any self-improve logic.

- [x] **/api/self-improve/run** (GET)
  - Status: 405 (method not allowed)
  - Behavior: Explicitly rejects GET, guides to use POST.

- Implementation summary:
  - File: pp/api/self-improve/run/route.ts
  - Change vs main:
    - Old: GET handler returning placeholder Supabase data.
    - New: POST-only stub with safe 202 response, no Supabase calls.
    - GET now returns 405 with a clear error.

---

## 4. Supabase RLS Baseline (SQL)

- [x] Baseline file added:
  - 
ocketgpt_v3_full/webapp/next/supabase/rls_rocketgpt_baseline.sql

- Scope:
  - public.guests
  - public.rl_plans
  - public.rl_user_plans

- Policy summary:
  - **public.guests**
    - RLS enabled.
    - guests_insert_any: any client (public) may insert guest rows.
    - guests_select_authenticated: authenticated users may select guest rows.
  - **public.rl_plans**
    - RLS enabled.
    - 
l_plans_read_all: authenticated users can read all pricing/catalog rows.
  - **public.rl_user_plans**
    - RLS enabled.
    - 
l_user_plans_select_own: users can select only rows where user_id = auth.uid()::text.
    - 
l_user_plans_insert_own: users can insert only rows with user_id = auth.uid()::text.
    - 
l_user_plans_update_own: users can update only their own rows (user_id = auth.uid()::text).

- Status:
  - [x] Confirmed executed on Supabase (manual step via SQL editor).
  - [ ] Old/conflicting policies cleaned up (if any).
  - Note: This script is **defensive and non-relaxing** – it tightens access to per-user data.

---

## 5. GitHub Actions / CI Status

- [x] **Core CI (ci.yml) on go-live/rls-repair**
  - Latest runs: ✓ (green)
  - Confirms build, lint, and basic checks are passing.

- [ ] **Text-Guard**
  - 	ext_guard.yml: workflow not found on default branch (404 from gh run list).
  - Action item: Decide if Text-Guard is required for Go-Live gating, or Phase-2 enhancement.

- [x] **AI Dev Workflows (known non-blocking issues)**
  - .github/workflows/auto-codegen.yml
  - .github/workflows/codegen-matrix.yml
  - .github/workflows/review.yml
  - .github/workflows/ai-review.yml
  - Status: Failing with "This run likely failed because of a workflow file issue."
  - Diff vs origin/main: no differences → failures appear to be repo/config/secrets-level, not branch-level code changes.
  - Go-Live impact: **Non-blocking** for user-facing production, but should be tracked for dev-ops quality.

---

## 6. Outstanding Checks (To Be Filled)

These sections are placeholders for the next steps in the stock-take:

- [ ] **Auth & Session Flows**
  - Guest → Authenticated user mapping
  - Token / cookie behavior
  - Rate limiting per plan

- [ ] **Text-Guard / Safety Layer**
  - Whether requests are going through text-guard pipeline.
  - Logging and observability.

- [ ] **User Experience / Frontend**
  - Homepage clarity
  - Error messaging when APIs fail
  - Latency and perceived performance

- [ ] **Docs & Operational Runbook**
  - Quickstart for you (Nirav) to operate RocketGPT from PowerShell.
  - Health/diagnostic commands (
gpt-health, key probes).
  - Process for re-deploy, rollback, and RLS tweaks.

---

## 7. Summary (Current Position)

- Production is healthy and running the **latest go-live/rls-repair HEAD**.
- Self-Improve APIs are present as **safe stubs** (simulation mode, no writes).
- RLS baseline script is committed and designed to **protect per-user data and restrict plan access**.
- Core CI is green; some AI-related GitHub workflows are failing for configuration reasons but are **non-blocking** for public Go-Live.

Next steps:
- RLS baseline executed on Supabase; visually confirm policies in Supabase UI when convenient.
- Decide on plan seeding for 
l_plans and mapping for 
l_user_plans.
- Complete checks for Auth, Text-Guard, UX, and Ops runbook.
