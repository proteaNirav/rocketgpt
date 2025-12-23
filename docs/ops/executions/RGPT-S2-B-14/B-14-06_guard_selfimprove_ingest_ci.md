# RGPT-S2-B-14 — Guard _selfimprove_ingest_ci.yml

- Date: 2025-12-23 11:47:54 +05:30
- Base SHA (pre-commit): 5a56e5892d2b9e777c4666f27b20d55f9214e9b2
- File: .github/workflows/_selfimprove_ingest_ci.yml

## Safety changes applied
- Added workflow_dispatch inputs: enable (default false), dry_run (default true)
- Added workflow_call inputs: enable (default false), dry_run (default true)
- Added explicit permissions: contents: read
- Added job-level enable gate on jobs.ingest (enable must be true)
- Added DRY_RUN guard in script: exits 0 before Supabase write when dry_run=true

## Notes / risk controls
- Uses SUPABASE_SERVICE_ROLE_KEY (high privilege) — guarded behind enable=true and dry_run defaults to true.
- No execution performed in this step. Only guard hardening.

## Next action (later)
- Dispatch with enable=true, dry_run=true to validate guard behavior (no writes)
- Only after review: enable=true, dry_run=false to allow actual ingest (controlled run)


### Step: B-14-06D — Dry-run dispatch executed
- Date: 2025-12-23 11:49:26 +05:30
- Workflow: _selfimprove_ingest_ci.yml
- Inputs: enable=true, dry_run=true
- RunId: 20453141682
- RunUrl: https://github.com/proteaNirav/rocketgpt/actions/runs/20453141682
- CreatedAt: 2025-12-23T06:18:02Z
- Status: completed
- Conclusion: failure
- HeadSha: 64a0d0b94b88d1a79c05cf77f9b07e48f580dfb1
- Title: ci(selfimprove): gate ingest workflow (enable+dbrun) and add least peΓÇª
- LogFile: docs\ops\executions\RGPT-S2-B-14\B-14-06_run_20453141682_log.txt

