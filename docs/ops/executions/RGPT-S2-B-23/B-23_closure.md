# RGPT-S2-B-23 — CI BOM Failure Resolution (Closure)

- ClosedAtUTC: 2025-12-24T12:33:48Z
- HEAD: 87c09d689654b3653d4c4d24441acc3c41de22d4

## Problem
- CI failed in job: Detect UTF-8 BOM
- Detector reported UTF-8 BOM present in:
  - .github/workflows/ci.yml
  - .github/workflows/watchdog.yml

## Root cause
- Windows PowerShell 5 Set-Content -Encoding UTF8 writes UTF-8 with BOM.

## Resolution
- Rewrote both workflow files as UTF-8 (NO-BOM) using byte-level IO:
  - Remove BOM if present (EF BB BF)
  - Write back as UTF-8 without BOM

## Verification
- CI run completed:
  - RunId: 20486227650
  - URL: https://github.com/proteaNirav/rocketgpt/actions/runs/20486227650
  - Conclusion: success

## Evidence
- docs\ops\executions\RGPT-S2-B-23\B-23_ci_bom_fix_proof.md
