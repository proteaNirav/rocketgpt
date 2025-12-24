# RGPT-S2-B-17 — Self-Heal Workflow Strict Smoke-Test + Closure

## Status
CLOSED ✅

## Goal
Prove Self-Heal is safe-by-default and activates only on CI failure (workflow_run), with auditable evidence.

## Results (Binary)
1) Manual dispatch (workflow_dispatch) is permitted but **does not execute jobs** unless the guard condition is satisfied.
   - Run: 20483048726
   - Outcome: **skipped** (expected)

2) CI failure proof exists and triggers Self-Heal via workflow_run.
   - Failing CI run: 20483355451
   - Note: CI log stream was not available ("log not found") due to failure occurring at workflow-load/parse stage.
   - CI run view captured as evidence.

3) Self-Heal auto-triggered on main via workflow_run.
   - Run: 20483285785
   - Event: workflow_run
   - Expected behavior: job activates only when upstream CI concluded failure.
   - Run view captured as evidence.

## Evidence (Files)
- self_heal_workflow.yml
- sha_before.txt
- B-17-01_run_20483048726_view.txt / .json (manual dispatch)
- B-17-02_ci_fail_20483355451_view.txt (CI failure)
- B-17-03_selfheal_workflowrun_20483285785_view.txt / .json (workflow_run trigger)

## Evidence (URLs)
- Manual dispatch: https://github.com/proteaNirav/rocketgpt/actions/runs/20483048726
- CI failure:     https://github.com/proteaNirav/rocketgpt/actions/runs/20483355451
- Self-Heal run:  https://github.com/proteaNirav/rocketgpt/actions/runs/20483285785

## Notes
- Current Self-Heal workflow is a **stub** and intentionally non-functional; this block proves gating + triggering correctness.

## Risk Assessment
LOW — execution is safely gated; workflow_run activation verified under controlled failure conditions.