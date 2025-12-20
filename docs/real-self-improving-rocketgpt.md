# Real Self-Improving RocketGPT

> Vision: RocketGPT should not just *run* code – it should continuously **improve itself** (safely), using real usage, tests, and guardrails to get better over time.

---

## 1. What “Real Self-Improving” Means

“Self-improving” RocketGPT is **not** magic AGI.

It means:

1. The system can **observe** how it is used (logs, prompts, failures, PRs, tests).
2. It can **propose changes** (code, docs, configs, workflows).
3. Changes are **validated automatically** (lint, tests, Text-Guard, policy gate, branch protection).
4. Safe changes can be **merged with minimal friction**, unsafe ones are blocked.
5. Every improvement is **documented and traceable** (changelogs, PR titles, commit messages).

In short:  
> *A loop where RocketGPT + tooling + humans keep RocketGPT getting better every week.*

---

## 2. Core Principles

1. **Safety first**  
   - No change skips tests or guardrails.  
   - Text-Guard, policy checks, and branch protection are always in control.

2. **Human-in-the-loop**  
   - AI can propose, humans approve when necessary.  
   - The system must explain *why* a change is safe.

3. **Small, continuous changes**  
   - Prefer many small, reversible changes over massive risky refactors.  
   - Each change should have a clear reason (“fix X”, “improve Y”, “document Z”).

4. **Everything observable**  
   - Logs, metrics, and PR history should tell the story of how RocketGPT is evolving.

5. **Tooling over heroics**  
   - No dependency on a single person.  
   - The system should be manageable even when the original creator is on vacation.

---

## 3. The Self-Improvement Loop

The Real Self-Improving RocketGPT is built around this loop:

1. **Observe**  
   - Collect signals: failed tests, production errors, slow responses, user feedback, security alerts.
2. **Reflect**  
   - Analyze: *What broke? What is slow? Which patterns keep repeating?*  
   - Group issues into themes (DX, performance, safety, UX, docs).
3. **Plan**  
   - Create small, concrete tasks / PRs.  
   - Examples:
     - “Add test for edge echo handler when headers are missing.”
     - “Improve error message for invalid Supabase token.”
     - “Fix YAML syntax in `auto_fix_policy.yml`.”
4. **Act**  
   - AI + human generate:
     - Code changes
     - Test cases
     - Docs / READMEs
     - GitHub workflow improvements
5. **Validate**  
   - Run:
     - Lint + typecheck
     - Unit/integration tests
     - Text-Guard scans
     - Policy Gate checks
   - If anything fails → go back to **Plan**.
6. **Learn & Record**  
   - Summarize improvements in:
     - Changelogs
     - Architecture notes
     - “Lessons learned” sections
   - Use these patterns again in future tasks.

This loop should eventually be easy to trigger with a single command or workflow (e.g. a `self_improve.yml` flow).

---

## 4. Concrete Mechanisms in RocketGPT

Below are the **practical building blocks** that make “Real Self-Improving RocketGPT” real.

### 4.1. Code-Level Self-Improvement

- PR templates that **force clarity**:
  - What changed?
  - Why?
  - How is it tested?
- GitHub Actions that:
  - Run tests, lint, typecheck.
  - Block merges if checks fail.
- Workflows for:
  - **Auto-review with AI** (comment-only, no direct push).
  - **Auto-fix suggestions** behind explicit labels / flags.
- Text-Guard integration to:
  - Scan prompts, configs, and critical code paths for unsafe patterns.
  - Store logs for audits (what was flagged and why).

### 4.2. Knowledge & Prompt-Level Self-Improvement

- Central **Prompt Library**:
  - System prompts for RocketGPT agents.
  - Patterns that worked well (and why).
- “Playbook” docs for:
  - How to debug edge functions.
  - How to handle Supabase issues.
  - How to safely change workflows.
- Regularly updated **AI usage guidelines**:
  - What is trusted, what is checked, what is always manually reviewed.

### 4.3. Product-Level Self-Improvement

- Feature flags / config to:
  - Turn experiments ON/OFF without redeploy.
- Feedback ingestion:
  - Collect “pain points” from real usage: slow, confusing, or broken flows.
- Metrics to track:
  - Time to fix a bug.
  - Time from idea → PR → merge.
  - % of issues caught by tests vs production.

---

## 5. Safety & Guardrails

Real self-improvement is **never** “AI does whatever it wants”.

RocketGPT must respect:

1. **Branch protection**  
   - No direct pushes to `main`.  
   - Required checks must pass.

2. **Policy Gate + Text-Guard**  
   - Sensitive changes (workflows, auth, security, policies) go through **extra checks**.
   - Workflows like `auto_fix_policy.yml` only run when properly labeled.

3. **Limited scope for AI actions**  
   - AI tools act only on specific paths / files / diff ranges.  
   - All changes are transparent and reviewable.

4. **Revert path**  
   - Easy rollback via:
     - `gh` CLI
     - Git tags / releases
     - “Last known good” branches

---

## 6. Roadmap for Real Self-Improvement

This document connects to existing and future plans like:

- `AI_Evolution.md` (Narrow → General → Super AI for RocketGPT)
- `self-improvement-charter.md` (principles + commitments)
- v3/v4 Core AI roadmaps

Suggested milestones:

1. **M2.x – Bootstrap Self-Improvement**
   - Text-Guard fully wired into PRs and pushes.
   - Stable CI for lint + tests + policy.
   - Manual but repeatable “self-review” using AI (via `gh` + prompts).

2. **M3.x – Self-Healing & Observability**
   - Error and failure patterns logged and grouped.
   - Scripts / workflows to propose fixes for common issues.
   - Clear dashboards for health (builds, tests, deploys).

3. **v4 Core AI – Real Self-Improving RocketGPT**
   - `self_improve.yml` workflow for structured “improvement sessions”.
   - AI-guided PR review integrated as a standard step.
   - Safer-yet-faster merging for low-risk changes (docs, comments, non-critical files).
   - Regular “AI-led retrospectives” summarized into docs.

---

## 7. How to Use This Document

- As a **north star**:  
  When in doubt, ask: *“Does this change make RocketGPT more self-improving, or more fragile?”*

- As a **design filter**:  
  For any new feature:
  - How will it be observed?
  - How will it be tested?
  - How can AI help maintain or improve it?

- As a **communication tool**:  
  To explain to collaborators what “Real Self-Improving RocketGPT” actually means in practical, non-mystical terms.

---

*Version:* v1 – draft  
*Status:* Living document – meant to evolve as RocketGPT grows.

## What Self-Improvement Means (Nirav’s Definition)

For RocketGPT, self-improvement is only valid when:

1. **Goal-Driven Loop**
   - There is a clear goal.
   - The system takes actions.
   - It checks results against the goal.
   - Helpful patterns are kept and reinforced.
   - Unhelpful patterns are analysed, corrected, and re-tested.
   - This loop runs continuously.

2. **Fixing What Hurts Others**
   - When the system behaves in a way that is wrong, confusing, unsafe, or harmful for users or collaborators,
   - It must detect such signals (failures, safety flags, complaints, regressions)
   - And self-correct so the same harm does not repeat.

These two principles are mandatory for any “self-improving” behavior in RocketGPT.

## What Self-Improvement Means (Nirav’s Definition)

RocketGPT considers self-improvement valid only under two concrete conditions:

### 1. Goal-Driven Improvement Loop
- There must be a **clear goal** RocketGPT is trying to achieve.
- The system performs actions/activities.
- It observes the output/results of those actions.
- It checks whether those results help move closer to the goal.
- If the results are positive → keep and reinforce those patterns.
- If the results are negative → identify the mistake, correct it, and retry.
- This becomes a continuous, ongoing loop of learning and refinement.

### 2. Correction When Behavior Hurts or Misaligns
- If RocketGPT identifies something **wrong within itself**,
- Or something that does not align with users, contributors, or expected norms,
- Or something that causes inconvenience, breakage, confusion, or “harm”,
- Then it must self-update to ensure such behavior does not repeat.
- The goal is to prevent friction, reduce errors, and avoid negative impact on others.

These two principles are mandatory for any meaningful, safe, and human-aligned self-improvement behavior in RocketGPT.
