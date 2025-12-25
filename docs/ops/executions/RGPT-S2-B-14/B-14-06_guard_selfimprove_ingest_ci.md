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


### Step: B-14-06D2 — Dry-run dispatch executed (post-BOM-fix)
- Date: 2025-12-23 12:00:03 +05:30
- Workflow: _selfimprove_ingest_ci.yml
- Inputs: enable=true, dry_run=true
- RunId: 20453219914
- RunUrl: https://github.com/proteaNirav/rocketgpt/actions/runs/20453219914
- CreatedAt: 2025-12-23T06:22:24Z
- Status: completed
- Conclusion: failure
- Event: push
- HeadSha: c903da57dd609beab878d3226f9107a9531ff6b6
- Title: fix(ci): strip UTF-8 BOM from _selfimprove_ingest_ci workflow
- LogFile: docs\ops\executions\RGPT-S2-B-14\B-14-06_run_20453219914_log.txt


### Step: B-14-06E — workflow_dispatch dry-run validation (log + metadata)
- CapturedAt: 2025-12-23 12:18:45 +05:30
- Workflow: _selfimprove_ingest_ci.yml
- Inputs: enable=true, dry_run=true
- RunId: 20453624455
- RunUrl: https://github.com/proteaNirav/rocketgpt/actions/runs/20453624455
- CreatedAt: 2025-12-23T06:45:46Z
- Status: completed
- Conclusion: success
- HeadSha: 6b242542e38f569d2cc18a01e8bf72e765ad0b1a
- Title: _selfimprove_ingest_ci
- LogFile: docs\ops\executions\RGPT-S2-B-14\B-14-06_dispatch_run_20453624455_log.txt

#### Result
- Status: success
