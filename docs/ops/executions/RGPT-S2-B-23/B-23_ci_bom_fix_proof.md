# RGPT-S2-B-23 — CI BOM Fix (Proof)

- RecordedAtUTC: 2025-12-24T12:33:48Z
- HEAD: 87c09d689654b3653d4c4d24441acc3c41de22d4
- Workflow: ci
- Event: workflow_dispatch
- RunId: 20486227650
- RunURL: https://github.com/proteaNirav/rocketgpt/actions/runs/20486227650
- CI Status: completed
- CI Conclusion: success
- RunCreatedAt: 2025-12-24T12:30:16Z
- RunUpdatedAt: 2025-12-24T12:31:41Z

## Change applied
- Removed UTF-8 BOM from:
  - .github/workflows/ci.yml
  - .github/workflows/watchdog.yml

## Local verification
- pwsh .github/tools/ci/detect-bom.ps1 -Paths @(".github/workflows") => OK (no BOM)

