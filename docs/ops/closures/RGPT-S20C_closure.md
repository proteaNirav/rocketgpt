# RGPT-S20C — Auto-Merge Dispatch Auth Fix & End-to-End Verification (Closure)

## Objective
Fix GitHub Actions auth/permissions so that:
- auto_fix_policy_update can dispatch self_improve reliably using GH_PAT (not default GITHUB_TOKEN).
- review.yml has the required permissions for repository_dispatch / downstream triggers.

## Summary of Changes
1) .github/workflows/auto_fix_policy_update.yml
- Ensured GH CLI calls run with GH_TOKEN = ${{ secrets.GH_PAT }}.

2) .github/workflows/review.yml
- Ensured permissions includes: contents: write (required for repository dispatch / repo operations).

## Evidence
- PR: https://github.com/proteaNirav/rocketgpt/pull/257
- E2E workflow_dispatch run URL: https://github.com/proteaNirav/rocketgpt/actions/runs/21098323618
- Local evidence (ignored by policy): docs/ops/executions/RGPT-S20C/

## Repo State
- Branch: fix/rgpt-s20c-automerge-dispatch-auth
- HEAD: 95a3f4b954c32901842fd3b88524d8672b19aeb7

## Result
- PR labeled for safe workflow edit + safe auto-merge.
- Dispatch chain validated end-to-end (see E2E run).
