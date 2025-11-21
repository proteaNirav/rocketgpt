# RocketGPT v4 – UI & Orchestrator Wishlist (Post Go-Live)

This file tracks **P2+** improvements for after the initial go-live of RocketGPT v4 Core AI.

## 1. Sessions Sidebar & Model Chips

- Replace current grey circular model bubbles with a **higher-contrast**, Figma-aligned style.
- Colour and typography to follow the **Mode selector** semantics:
  - Category (LLM / Dev / DB / BigData / Maths / Finance / UI/UX / Workflow)
  - Engine label (e.g., gpt-5.1, db-gpt-4.1, llm-gpt-5.1)
- Ensure chips are clearly readable on **both dark and light** backgrounds.
- Make chip style **reusable** (shared component) for:
  - Sessions list (sidebar)
  - Main chat header/model info
  - Logs / self-improve run summaries.

## 2. Theme Control (Day / Night View)

- Add an explicit **Theme toggle** (Day / Night) in the top-right area.
- Persist choice per user (Supabase auth) and/or via local storage for guests.
- Ensure:
  - All cards, badges, and chips respect theme tokens.
  - Accessibility: sufficient contrast for text in both themes.

## 3. Self-Improve Console (v4 Core AI)

- Wire /super/self-improve to:
  - Read from a backlog source (e.g. config/self_improve_backlog.json).
  - Show counts per priority (P0 / P1 / P2) and area (UI, DX, Reliability, Security, etc.).
- Surface last N self-improve runs with:
  - Status (Success / Failed / Running).
  - GitHub Action link and run ID.
- Add safe triggers for a small set of **pre-approved self-improve workflows**.

## 4. Orchestrator UX Enhancements

- Show currently active **profile** in the chat header:
  - Example: Using: auto-smart-router (Auto – Dynamic Router).
- Add a small **“Why this engine?” tooltip** describing routing decisions.
- Expose a read-only view of:
  - Last engine used per message.
  - Any fallback / retry decisions.
- Later: allow per-session override to “stick” to one engine.

## 5. Logs & Observability

- /logs:
  - Add filters for area (UI / API / Orchestrator / Self-Improve).
  - Add quick links from errors to:
    - GitHub issues
    - Self-improve backlog entries.
- Add a compact **status strip** summarising:
  - API health
  - Rate-limits (from /api/limits)
  - Last self-improve run.

## 6. Misc UX Polish

- Review all badges/pills for:
  - Font sizes, padding, and contrast.
  - Consistency across Sessions, Logs, Plans, and Admin screens.
- Tighten spacing & responsiveness for:
  - 13" laptop width
  - 1440p monitors
  - Tablet portrait (for future).

---

_This is a parking lot for after v4 Core AI go-live. The current branch focuses on a **stable, predictable** orchestrator experience with clean navigation._
