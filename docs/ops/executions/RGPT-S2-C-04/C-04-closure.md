# RGPT-S2-C-04 — Closure

## HEAD
- sha: 682c1a7a38ca0161538fcd77cae8c0bbb885a7d4

## What was fixed
- Dependabot triage generation stabilized (scripted rebuild + repo-root path resolution).
- **glob** pinned/overridden to **10.5.0**; stale alert #11 moved to **fixed** after inventory refresh.
- UTF-8 BOM removed from workflow: .github/workflows/policy_gate.yml (BOM detector now clean).

## CI Proof
- workflow: policy_gate
- runId: 20588160437
- url: https://github.com/proteaNirav/rocketgpt/actions/runs/20588160437
- status: completed
- conclusion: success
- event: workflow_dispatch
- headSha: 682c1a7a38ca0161538fcd77cae8c0bbb885a7d4
- jobCount: 1

## Dependabot snapshot (from raw inventory + triage)
- raw open total: 10
- raw open by severity: high=6, low=2, medium=2
- triage rows: 1
- triage by severity: =1

## Artifacts
- docs/security/dependabot/RGPT-S2-C-04-inventory.raw.json
- docs/security/dependabot/RGPT-S2-C-04-triage.open.json
- scripts/security/rebuild_triage_dependabot.ps1
- scripts/security/policy_gate_dependabot.ps1
- .github/workflows/policy_gate.yml
