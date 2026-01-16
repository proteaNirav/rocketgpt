# RocketGPT — CI Index (Authoritative)

> **Purpose:** This document is the single source of truth for the GitHub Actions CI surface for RocketGPT.
> Any workflow added/removed/renamed must update this index.

## Canonical CI + Governance (ACTIVE)

These workflows define the core, governable CI contract.

| Workflow file | Category | Triggers (summary) | Notes |
|---|---|---|---|
| ci.yml | Core CI | push, pull_request, workflow_dispatch | Baseline checks/build/test |
| pr-checks.yml | PR Gate | pull_request | PR hygiene + fast checks |
| policy_gate.yml | Policy Gate | pull_request(main), push | Policy enforcement / governance |
| rgpt_db_exposure_guard.yml | Security Guard | pull_request, push(main), workflow_dispatch | DB/schema exposure guard |
| text-guard.yml | Guard | pull_request(main), workflow_dispatch | Content / guardrails |
| safemode-gate.yml | Security Gate | pull_request, push(main), workflow_dispatch | Safe-Mode regression enforcement |
| self_heal.yml | Self-Heal | workflow_run(ci), workflow_dispatch | Runs after CI |
| self_improve.yml | Self-Improve | schedule, workflow_dispatch | Scheduled improvement loop |
| watchdog.yml | Watchdog | workflow_run(...), workflow_dispatch | Monitoring / chained checks |

## Ops Automation (ACTIVE-OPS)

These workflows automate repo operations and developer productivity. They must not silently change CI gating behavior.

| Workflow file | Purpose | Triggers (summary) |
|---|---|---|
| auto_fix_policy.yml | Auto-fix policy (manual) | workflow_dispatch |
| auto_fix_policy_update.yml | Update policy modes (manual) | workflow_dispatch |
| auto-merge.yml | Event-driven merge | repository_dispatch |
| auto-update-pr.yml | Auto update PR branches | push, schedule |
| branch-sync.yml | Sync branches | push, schedule |
| labels.yml | Manage labels | push(paths), workflow_dispatch |
| notify.yml | Notifications | workflow_run |
| review.yml | Review hub | pull_request, repository_dispatch |
| claude_readonly_review.yml | AI readonly review (manual) | workflow_dispatch |
| codegen.yml | AI codegen (manual) | workflow_dispatch |
| ship-issue.yml | Ship from issue (manual) | workflow_dispatch |
| triage.yml | Issue triage | issues, workflow_dispatch |
| ecosystem-watcher.yml | Dependency/ecosystem watch | schedule, workflow_dispatch |
| nightly-self-eval.yml | Nightly evaluation | schedule, workflow_dispatch |
| selfimprove_ingest_ci.yml | Self-improve ledger ingest | workflow_dispatch, workflow_call |
| vercel-throttled-deploy.yml | Deploy control | push(main), workflow_dispatch |

## Experimental / R&D (EXPERIMENTAL)

These workflows are allowed to exist, but must remain non-gating and explicitly documented as experimental.

| Workflow file | Triggers (summary) | Notes |
|---|---|---|
| chat-intake.yml | workflow_dispatch | Intake tooling |
| knowledge_library_bootstrap.yml | workflow_dispatch | Knowledge bootstrapping |
| self_infra_evolve.yml | schedule, workflow_dispatch | R&D |
| self_innovate.yml | workflow_dispatch | R&D |
| self_reasoning.yml | workflow_dispatch | R&D |
| self_research.yml | workflow_dispatch | R&D |
| self_study.yml | schedule, workflow_dispatch | R&D |
| self-redev.yml | schedule, workflow_dispatch | R&D |
| ui-healer.yml | pull_request(main) | UI-focused healing (confirm non-gating intent) |

## Legacy / Candidates for Archival (LEGACY-CANDIDATE)

These are known to be phase-specific or placeholders and should be reviewed for archival.

| Workflow file | Triggers (summary) | Planned action |
|---|---|---|
| safemode-gate.yml | push, pull_request, workflow_dispatch | Review overlap with policy_gate + safe-mode |
| (archived: v4_ship_placeholder.yml) | workflow_dispatch | Replace or archive |
| selfimprove_ingest_ci.yml | workflow_dispatch | Confirm necessity; rename or archive |

## Archive Policy

- Backup files (e.g., *.bak*) must not be stored in .github/workflows.
- Archived workflows must be moved to: docs/ops/ci-archive/RGPT-S16/ with a short rationale note.




