# RGPT-S19 - Governance Reference Inventory (COMPACT)

Generated on: 2026-01-17 00:59:39

## Step 1.2 - CI / Workflow Surface

Workflow dir: .github\workflows

Workflow files present: 36

- auto_fix_policy_update.yml
- auto_fix_policy.yml
- auto-merge.yml
- auto-update-pr.yml
- automation_refactor_pr.yml
- branch-sync.yml
- chat-intake.yml
- ci.yml
- claude_readonly_review.yml
- codegen.yml
- ecosystem-watcher.yml
- knowledge_library_bootstrap.yml
- labels.yml
- nightly-self-eval.yml
- notify.yml
- policy_gate.yml
- pr-checks.yml
- review.yml
- rgpt_db_exposure_guard.yml
- safemode-gate.yml
- self_heal_probe.yml
- self_heal.yml
- self_improve_ingest_ci.yml
- self_improve_innovate.yml
- self_improve.yml
- self_infra_evolve.yml
- self_reasoning.yml
- self_research.yml
- self_study.yml
- ship-issue.yml
- text-guard.yml
- triage.yml
- ui-healer.yml
- vercel-throttled-deploy.yml
- watchdog.yml
- workflow_name_drift_lock.yml

### Workflow metadata + top refs (trimmed)

#### .github\workflows\auto_fix_policy_update.yml
- name_line: name: Auto Update Policy (Controlled)
- on_line: on:
- jobs_line: jobs:
- job_ids: auto_update
- refs_top:
  - L113: .github/workflows/policy_gate.yml|\
  - L114: docs/ops/policy/POLICY_OWNERSHIP_MATRIX.md|\
  - L115: docs/ops/ledger/*)
  - L135: dir="docs/ops/executions/RGPT-S2-C-13"

#### .github\workflows\auto_fix_policy.yml
- name_line: name: auto_fix_policy
- on_line: on:
- jobs_line: jobs:
- job_ids: fix
- refs_top:
  - L41: gh label create "safe:override" -c "#B60205" -d "Override policy gate for denied paths" || true
  - L62: echo "::group::Run self_improve.yml as smoke"
  - L63: gh workflow run self_improve.yml -f reason="auto_fix_policy smoke" || true

#### .github\workflows\auto-merge.yml
- name_line: name: Auto Merge
- on_line: on:
- jobs_line: jobs:
- job_ids: merge
- refs_top:
  - L18: jq -C '.' event.json || cat event.json

#### .github\workflows\auto-update-pr.yml
- name_line: name: Auto Update PR Branches
- on_line: on:
- jobs_line: jobs:
- job_ids: update-branches
- refs_top: (none detected)

#### .github\workflows\automation_refactor_pr.yml
- name_line: name: self-redevelopment
- on_line: on:
- jobs_line: jobs:
- job_ids: refactor
- refs_top:
  - L15: - uses: actions/setup-node@v4
  - L16: with: { node-version: '20' }
  - L21: npm i

#### .github\workflows\branch-sync.yml
- name_line: name: Branch Sync (main to develop)
- on_line: on:
- jobs_line: jobs:
- job_ids: sync
- refs_top: (none detected)

#### .github\workflows\chat-intake.yml
- name_line: name: Chat Intake → Issue
- on_line: on:
- jobs_line: jobs:
- job_ids: create-issue
- refs_top: (none detected)

#### .github\workflows\ci.yml
- name_line: name: ci
- on_line: on:
- jobs_line: jobs:
- job_ids: bom_check, build-test
- refs_top:
  - L110: run: node qa/runner.mjs qa/scenarios/*.json | tee qa-report.json
  - L26: pwsh .github/tools/ci/detect-bom.ps1 -Paths @(".github/workflows",".github/tools","docs","rocketgpt_v3_full")
  - L31: NODE_OPTIONS: --max_old_space_size=4096
  - L45: # --- Node 20 setup with pnpm caching (only if lockfile exists) ---
  - L46: - name: Setup Node 20 (with pnpm cache if lockfile exists)
  - L47: if: ${{ hashFiles('rocketgpt_v3_full/webapp/next/pnpm-lock.yaml') != '' }}
  - L48: uses: actions/setup-node@v4
  - L50: node-version: '20'
  - L51: cache: 'npm'
  - L52: cache-dependency-path: rocketgpt_v3_full/webapp/next/pnpm-lock.yaml
  - L54: - name: Setup Node 20 (no cache fallback)
  - L55: if: ${{ hashFiles('rocketgpt_v3_full/webapp/next/pnpm-lock.yaml') == '' }}

#### .github\workflows\claude_readonly_review.yml
- name_line: name: claude-readonly-review
- on_line: on:
- jobs_line: jobs:
- job_ids: claude-review
- refs_top:
  - L77: pwsh .github/tools/claude/invoke-claude-review.ps1 `

#### .github\workflows\codegen.yml
- name_line: name: AI Codegen
- on_line: on:
- jobs_line: jobs:
- job_ids: codegen
- refs_top:
  - L142: node rocketgpt-agents/runners/github_actions.js code  spec.json
  - L143: node rocketgpt-agents/runners/github_actions.js test  spec.json
  - L144: node rocketgpt-agents/runners/github_actions.js doc   spec.json
  - L145: node rocketgpt-agents/runners/github_actions.js guard spec.json
  - L52: - name: Setup Node
  - L53: uses: actions/setup-node@v4
  - L55: node-version: '20'

#### .github\workflows\ecosystem-watcher.yml
- name_line: name: ecosystem-watcher
- on_line: on:
- jobs_line: jobs:
- job_ids: watch
- refs_top:
  - L15: node - <<'NODE'
  - L37: NODE

#### .github\workflows\knowledge_library_bootstrap.yml
- name_line: name: Knowledge Library Bootstrap
- on_line: on:
- jobs_line: jobs:
- job_ids: bootstrap-knowledge-library
- refs_top: (none detected)

#### .github\workflows\labels.yml
- name_line: name: Sync Labels
- on_line: on:
- jobs_line: jobs:
- job_ids: sync
- refs_top: (none detected)

#### .github\workflows\nightly-self-eval.yml
- name_line: name: nightly-self-evaluator
- on_line: on:
- jobs_line: jobs:
- job_ids: run
- refs_top: (none detected)

#### .github\workflows\notify.yml
- name_line: name: Notify on Pipeline
- on_line: on:
- jobs_line: jobs:
- job_ids: notify
- refs_top: (none detected)

#### .github\workflows\policy_gate.yml
- name_line: name: policy_gate
- on_line: on:
- jobs_line: jobs:
- job_ids: dependabot_policy_gate, l0_ownership_guard, pr_label_enforcement
- refs_top:
  - L1: name: policy_gate
  - L107: .github/workflows/policy_gate.yml)
  - L109: docs/ops/ledger/*)
  - L111: docs/ops/policy/POLICY_OWNERSHIP_MATRIX.md)
  - L14: group: policy_gate-${{ github.ref }}
  - L149: labels="$(curl -sS -H "Authorization: Bearer ${GH_TOKEN}" -H "Accept: application/vnd.github+json" "${api}" | jq -r '.[].name' | tr '\n' ' ')"
  - L18: dependabot_policy_gate:
  - L187: .github/workflows/auto_update_policy.yml|.github/auto-ops.yml)
  - L19: name: Dependabot Policy Gate
  - L35: pwsh -NoProfile -File .github/tools/policy_gate/validate_auth_surface_matrix.ps1 -AllowlistJson docs/security/generated/RUNTIME_ALLOWLIST.json -MatrixMd docs/security/AUTH_SURFACE_MATRIX.md
  - L39: run: ./.github/tools/security/check_api_surface_drift.ps1
  - L41: - name: Setup Node

#### .github\workflows\pr-checks.yml
- name_line: name: PR Checks (meta)
- on_line: on:
- jobs_line: jobs:
- job_ids: meta-pr-checks
- refs_top: (none detected)

#### .github\workflows\review.yml
- name_line: name: RocketGPT Review Pipeline
- on_line: on:
- jobs_line: jobs:
- job_ids: ai-review
- refs_top:
  - L115: - name: Compute score (policy) without jq
  - L134: const LOCKS_RE     = new RegExp(String.raw`(^|/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$`);
  - L159: - name: Build review_input.json (Node only; no shell)
  - L198: node rocketgpt-agents/runners/github_actions.js review review_input.json
  - L202: - name: Read decision (Node; no shell parsing)
  - L257: PAYLOAD=$(jq -n --argjson n "$PR" '{event_type:"merge", client_payload:{pr_number:$n}}')
  - L258: echo "$PAYLOAD" | jq -C .
  - L269: (command -v jq >/dev/null && jq -C '.' dispatch.merge.resp.json) || cat dispatch.merge.resp.json
  - L33: - name: Setup Node
  - L34: uses: actions/setup-node@v4
  - L36: node-version: 20
  - L41: (command -v jq >/dev/null && jq -C '.' event.json) || cat event.json

#### .github\workflows\rgpt_db_exposure_guard.yml
- name_line: name: RGPT DB Exposure Guard
- on_line: on:
- jobs_line: jobs:
- job_ids: rgpt-db-exposure-guard
- refs_top:
  - L51: $sqlFile = "docs/ops/guards/rgpt_schema_exposure_assert.sql"

#### .github\workflows\safemode-gate.yml
- name_line: name: Safe-Mode CI Gate
- on_line: on:
- jobs_line: jobs:
- job_ids: safemode-gate
- refs_top:
  - L1: name: Safe-Mode CI Gate
  - L108: # 2) Attempt unsafe action: builder/execute-all must be blocked when Safe-Mode is ON
  - L128: throw "[FAIL] Safe-Mode Gate FAILED: execute-all executed successfully (should be blocked)."
  - L130: throw "[FAIL] Safe-Mode Gate FAILED: execute-all returned 200 (unexpected). Treating as a bypass risk."
  - L135: throw "[FAIL] Safe-Mode Gate FAILED: Server error ($($execResp.StatusCode)). Gate expects a clean block (4xx), not a crash."
  - L139: Write-Host "[OK] Safe-Mode Gate PASSED: execute-all blocked with $($execResp.StatusCode)."
  - L141: throw "[FAIL] Safe-Mode Gate FAILED: Unexpected status code $($execResp.StatusCode)."
  - L3: # Safety: Safe-Mode enforcement gate (critical security workflow)
  - L32: - name: Setup Node
  - L33: uses: actions/setup-node@v4
  - L35: node-version: "20"
  - L36: cache: "npm"

#### .github\workflows\self_heal_probe.yml
- name_line: name: Self-Heal Hooks
- on_line: on:
- jobs_line: jobs:
- job_ids: hello
- refs_top:
  - L1: name: Self-Heal Hooks
  - L12: - ".github/tools/**"
  - L13: - ".github/workflows/self_heal_hooks.yml"
  - L20: name: Probe self-heal tooling
  - L28: if (Test-Path ".github/tools/README.md") {
  - L29: Get-Content ".github/tools/README.md" | Select-Object -First 20
  - L3: # Safety: Self-heal tooling probe workflow (read-only)
  - L37: Write-Host "✅ Self-Heal wiring workflow present and guarded by Policy Gate."
  - L4: # - Tests self-heal hooks and tools

#### .github\workflows\self_heal.yml
- name_line: name: self_heal
- on_line: on:
- jobs_line: jobs:
- job_ids: self_heal
- refs_top:
  - L1: name: self_heal
  - L26: self_heal:
  - L37: echo "TODO: RocketGPT self-heal to inspect failing tests and propose fixes."
  - L4: # This workflow is a placeholder for future self-heal functionality.

#### .github\workflows\self_improve_ingest_ci.yml
- name_line: name: Self-Improve Ledger Ingest (CI)
- on_line: on:
- jobs_line: jobs:
- job_ids: ingest
- refs_top:
  - L1: name: Self-Improve Ledger Ingest (CI)
  - L104: Write-Host "[DRY_RUN] Ledger ingest skipped (no Supabase write)." -ForegroundColor Yellow
  - L105: Write-Host "[DRY_RUN] Would ingest ledger row using provided inputs." -ForegroundColor Yellow
  - L133: ./.github/tools/rgpt-ledger-ingest.ps1 `
  - L3: # Safety: Self-improve ledger ingest workflow (disabled by default)
  - L31: description: "Subsystem name for ledger row"
  - L35: description: "Ingest severity (must match rgpt-ledger-ingest ValidateSet)"
  - L7: # - Writes to Supabase self-improve ledger only when: enable='true' AND dry_run='false'
  - L95: - name: Ingest CI failure into Self-Improve Ledger (aligned RPC)

#### .github\workflows\self_improve_innovate.yml
- name_line: name: Self Innovate (Idea-Only)
- on_line: on:
- jobs_line: jobs:
- job_ids: self-innovate
- refs_top:
  - L45: \"problem_observed\": \"Example: navigation to Self-Improve is not obvious from Sessions.\",
  - L46: \"idea\": \"Add a small 'Self-Improve This' button on Sessions page to open the self-improve console with context.\",

#### .github\workflows\self_improve.yml
- name_line: name: self_improve
- on_line: on:
- jobs_line: jobs:
- job_ids: self_improve
- refs_top:
  - L1: name: self_improve
  - L15: - "config/self_improve_backlog.json"
  - L18: self_improve:
  - L27: - name: Node setup
  - L28: uses: actions/setup-node@v4
  - L30: node-version: "20"
  - L32: - name: Run self-improvement script (stub)
  - L36: echo "TODO: Wire RocketGPT v4 self-improve engine."
  - L37: echo "Read docs/roadmap and config/self_improve_backlog.json, open PRs."
  - L4: # This workflow is a placeholder for future v4 self-improve engine.

#### .github\workflows\self_infra_evolve.yml
- name_line: name: Self Infra Evolve (Analysis Only)
- on_line: on:
- jobs_line: jobs:
- job_ids: analyse-infra
- refs_top: (none detected)

#### .github\workflows\self_reasoning.yml
- name_line: name: Self Reasoning (Plans Only)
- on_line: on:
- jobs_line: jobs:
- job_ids: self-reasoning
- refs_top: (none detected)

#### .github\workflows\self_research.yml
- name_line: name: Self Research (Log Only)
- on_line: on:
- jobs_line: jobs:
- job_ids: self-research
- refs_top: (none detected)

#### .github\workflows\self_study.yml
- name_line: name: Self Study (Analysis Only)
- on_line: on:
- jobs_line: jobs:
- job_ids: self-study
- refs_top: (none detected)

#### .github\workflows\ship-issue.yml
- name_line: name: RocketGPT Ship Issue
- on_line: on:
- jobs_line: jobs:
- job_ids: ship
- refs_top: (none detected)

#### .github\workflows\text-guard.yml
- name_line: name: text-guard (smoke)
- on_line: on:
- jobs_line: jobs:
- job_ids: smoke
- refs_top: (none detected)

#### .github\workflows\triage.yml
- name_line: name: Triage Spec
- on_line: on:
- jobs_line: jobs:
- job_ids: triage
- refs_top:
  - L102: node rocketgpt-agents/runners/github_actions.js plan spec.json > rocketgpt-agents/out/tasks.json || true
  - L141: PAYLOAD=$(jq -n --argjson n "$ISSUE" '{event_type:"codegen", client_payload:{issue_number:$n}}')
  - L142: echo "$PAYLOAD" | jq -C .
  - L153: jq -C '.' dispatch.codegen.resp.json || cat dispatch.codegen.resp.json
  - L54: jq -C '.' event.json || cat event.json

#### .github\workflows\ui-healer.yml
- name_line: name: UI Healer (v3_full)
- on_line: on:
- jobs_line: jobs:
- job_ids: ui-check-and-heal
- refs_top:
  - L22: - name: Setup Node
  - L23: uses: actions/setup-node@v4
  - L25: node-version: "20"
  - L30: pnpm install --frozen-lockfile
  - L35: pnpm lint || echo "::warning title=Lint failed::UI lint issues detected"
  - L36: pnpm typecheck || echo "::warning title=Typecheck failed::UI type issues detected"
  - L44: node scripts/ui-healer/ui-healer.js \

#### .github\workflows\vercel-throttled-deploy.yml
- name_line: name: Vercel Throttled Deploy
- on_line: on:
- jobs_line: jobs:
- job_ids: gatekeeper
- refs_top: (none detected)

#### .github\workflows\watchdog.yml
- name_line: name: watchdog
- on_line: on:
- jobs_line: jobs:
- job_ids: watch
- refs_top:
  - L1: name: watchdog
  - L28: core.info('Manual watchdog run (workflow_dispatch). No workflow_run payload present.');

#### .github\workflows\workflow_name_drift_lock.yml
- name_line: name: workflow_name_drift_lock
- on_line: on:
- jobs_line: jobs:
- job_ids: drift_lock
- refs_top:
  - L12: - ".github/tools/workflow_guard/**"
  - L29: run: pwsh -NoProfile -File .github/tools/workflow_guard/enforce_workflow_canonical_names.ps1 -RepoRoot $PWD
  - L7: - ".github/tools/workflow_guard/**"

## Step 1.3 - Runtime & Ledger Code Surface (summary only)

Code roots scanned:
- rocketgpt_v3_full\webapp\next\src\rgpt
- rocketgpt_v3_full\webapp\next\app\api
- src\rgpt

Total raw matches: 0

Top files by match count (max 50):


NOTE: Full raw-hit dumps are omitted to keep the file under GitHub limits.

## Step 1.3 - Runtime & Ledger Code Surface (top files summary)
Updated on: 2026-01-17 01:02:15
Total matches: 174
Top files (max 25):
- rocketgpt_v3_full\webapp\next\app\api\orchestrator\run\planner\route.ts - 6
- rocketgpt_v3_full\webapp\next\src\rgpt\runtime\runtime-guard.ts - 6
- rocketgpt_v3_full\webapp\next\app\api\orchestrator\builder\execute-all\route.ts - 6
- rocketgpt_v3_full\webapp\next\app\api\rgpt\runtime-mode\route.ts - 5
- rocketgpt_v3_full\webapp\next\app\api\orchestrator\run\builder\route.ts - 4
- rocketgpt_v3_full\webapp\next\app\api\orchestrator\planner\run\route.ts - 4
- rocketgpt_v3_full\webapp\next\app\api\orchestrator\run\tester\route.ts - 4
- rocketgpt_v3_full\webapp\next\app\api\orchestrator\health\route.ts - 4
- rocketgpt_v3_full\webapp\next\app\api\orchestrator\tester\execute\route.ts - 4
- src\rgpt\ledger\decision-ledger.ts - 4
- rocketgpt_v3_full\webapp\next\src\rgpt\ledger\decision-ledger.ts - 4
- rocketgpt_v3_full\webapp\next\app\api\orchestrator\run\route.ts - 3
- rocketgpt_v3_full\webapp\next\app\api\orchestrator\release\route.ts - 3
- rocketgpt_v3_full\webapp\next\app\api\core-ai\ledger\ping\route.ts - 3
- rocketgpt_v3_full\webapp\next\app\api\orchestrator\start-run\route.ts - 3
- rocketgpt_v3_full\webapp\next\app\api\orchestrator\test-tester\route.ts - 3
- rocketgpt_v3_full\webapp\next\app\api\orchestrator\builder\route.ts - 3
- rocketgpt_v3_full\webapp\next\app\api\orchestrator\builder\execute-next\route.ts - 3
- rocketgpt_v3_full\webapp\next\app\api\orchestrator\build\route.ts - 3
- rocketgpt_v3_full\webapp\next\app\api\orchestrator\auto-advance\route.ts - 3
- rocketgpt_v3_full\webapp\next\app\api\orchestrator\builder\list\route.ts - 3
- rocketgpt_v3_full\webapp\next\app\api\orchestrator\_core\safeMode.ts - 3
- rocketgpt_v3_full\webapp\next\app\api\orchestrator\run\finalize\route.ts - 3
- rocketgpt_v3_full\webapp\next\app\api\planner\plan\route.ts - 2
- rocketgpt_v3_full\webapp\next\app\api\sessions\route.ts - 2
