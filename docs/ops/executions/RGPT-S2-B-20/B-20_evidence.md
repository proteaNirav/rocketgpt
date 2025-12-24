# RGPT-S2-B-20 — CI Dispatch Hardening (Evidence)

- RecordedAtUTC: 2025-12-24T11:29:58Z
- HEAD: 0a6670884adf77b2d7523e4119406eeaf7a10e81

## Workflows updated to support workflow_dispatch
- .github/workflows/policy_gate.yml
- .github/workflows/watchdog.yml
- .github/workflows/ci.yml

## Workflows referenced earlier but absent in HEAD (confirmed)
- .github/workflows/unit-tests.yml (absent in WT + absent in git HEAD)
- .github/workflows/rgpt-ci-with-ledger.yml (absent in WT + absent in git HEAD)
- .github/workflows/_temp_bad.yml (absent in WT + absent in git HEAD)

## Verification commands (ran on local machine)
- git cat-file -e HEAD:.github/workflows/unit-tests.yml  => false
- git cat-file -e HEAD:.github/workflows/rgpt-ci-with-ledger.yml => false
- git cat-file -e HEAD:.github/workflows/_temp_bad.yml => false
