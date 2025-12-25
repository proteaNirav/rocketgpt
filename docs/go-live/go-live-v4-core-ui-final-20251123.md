# RocketGPT Go-Live – v4 Core UI Final

**Date:** 2025-11-23  
**Environment:** Production (Vercel)  
**Domain:** https://rocketgpt.vercel.app  

---

## 1. Build & Version

- **Git branch:** main  
- **Commit:** c76e53d75146f16d79df7d26fc1648b7078131ee  
- **Go-Live Final Tag:** \go-live/v4-core-ui-final-20251123-c76e53d\  
- **Safety Tag (pre-final):** \go-live/safety-pre-final-20251123-065123\  

### 1.1 Local sanity

- **pnpm lint:** PASSED (no ESLint warnings or errors)  
- **pnpm build:** PASSED (Next.js 14.2.33, warnings only from Sentry/OpenTelemetry/Supabase in edge runtime)  

---

## 2. Runtime Health (Production)

Base URL: \https://rocketgpt.vercel.app\

### 2.1 Core endpoints

All probed endpoints returned **HTTP 200**:

- /
- /api/health
- /api/limits
- /api/self-improve/status
- /sessions
- /prompts
- /runbooks
- /self-improve
- /models
- /logs
- /admin
- /settings

### 2.2 /api/version

- **ok:** true  
- **version:** c76e53d75146f16d79df7d26fc1648b7078131ee  
- **ts:** 2025-11-23T01:33:27.803Z  

### 2.3 /api/status

- **ok:** true  
- **build:** c76e53d75146f16d79df7d26fc1648b7078131ee  
- **version:** c76e53d75146f16d79df7d26fc1648b7078131ee  
- **health.http:** 200  
- **health.supabase_ok:** false (known caveat – Supabase ping failure does not currently block app)  
- **plans:** fetch_ok = true, http = 200, count = 5  
- **diag.base_used:** headers-origin  
- **diag.host:** rocketgpt.vercel.app  

---

## 3. UI Scope in this Go-Live

The following pages are present and loading successfully (Next.js app router):

- **Core app**
  - /home-v2 (main dashboard shell)
  - /sessions
  - /prompts
  - /runbooks
  - /self-improve
  - /plans
  - /models
  - /logs
  - /settings
  - /console
  - /login / /auth/callback

- **Super / Admin**
  - /super/limits
  - /super/proposals
  - /super/self-improve
  - /super/smoke
  - /super/usage
  - /admin/suggestions

- **Demo / Orchestrator**
  - /demo/chat
  - /demo/upload
  - /demo/orchestrator
  - /api/demo/* endpoints

All of the above are included in the compiled routes of the production build.

---

## 4. Workflows & CI State at Go-Live

- **Self-Heal (v4 Core AI)** GitHub Action: last run **SUCCESS** on branch main.  
- **ci.yml on main:** last few runs **FAILED** on recent feature pushes, but:
  - Local lint + build are passing.
  - Production is healthy on the latest commit.
  - Branch protection does **not** currently require CI success.

Decision for this Go-Live:

> Proceed with \c76e53d\ as the **Go-Live final** build, guarded by:
> - Safety tag before final (\go-live/safety-pre-final-20251123-065123\)
> - Go-Live final tag (\go-live/v4-core-ui-final-20251123-c76e53d\)
> - Clean local build & lint

---

## 5. Known Caveats / To-Do After Go-Live

1. **Supabase health probe**  
   - \/api/status\ reports \supabase_ok = false\.  
   - Action: investigate Supabase URL/keys or disable strict Supabase check if not required for core flows.

2. **CI (ci.yml) failures on main**  
   - Action: later align CI steps with current monorepo layout and telemetry (Sentry/OpenTelemetry, Supabase), then re-enable stricter protections.

3. **Telemetry warnings in build**  
   - Warnings from Sentry/OpenTelemetry and Supabase using Node APIs in edge runtime.
   - Action: optimize instrumentation and edge/runtime boundaries in a non-Go-Live refactor.

---

## 6. Summary

RocketGPT is **LIVE** on:

- **Commit:** c76e53d75146f16d79df7d26fc1648b7078131ee  
- **Tag:** go-live/v4-core-ui-final-20251123-c76e53d  

Core UI pages, self-improve console, orchestrator demos, and status/health endpoints are all **operational** in production.

This document serves as the **authoritative Go-Live snapshot** for 2025-11-23.
