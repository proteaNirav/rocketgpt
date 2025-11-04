<#
RocketGPT — Step 3.5: Label-Gated AI Triggers
- Gates AI Diff Review behind label: ai:review
- Gates AI CI-Failure Advisor behind label: ai:advisor
- Creates missing labels
- Opens PR: rocketgpt-core/ai-gated-triggers -> develop
Usage:
  ./init_ai_gated_triggers.ps1
#>

param(
  [string]$BaseBranch = "develop",
  [string]$FeatureBranch = "rocketgpt-core/ai-gated-triggers"
)

$ErrorActionPreference = "Stop"
function Require-Cli($n){ if(-not (Get-Command $n -ErrorAction SilentlyContinue)){ throw "$n is required" } }
Require-Cli git; Require-Cli gh

# Get OWNER/REPO
$origin = (git remote get-url origin).Trim()
if(-not $origin){ throw "No origin remote found" }
if ($origin -match "github.com[:/](.+?)/(.+?)(\.git)?$"){ $Owner=$Matches[1]; $Repo=$Matches[2] } else { throw "Cannot parse OWNER/REPO from $origin" }
$FullRepo = "$Owner/$Repo"

# Prepare branch
git fetch origin $BaseBranch --depth=1 | Out-Null
try { git checkout -B $FeatureBranch origin/$BaseBranch | Out-Null } catch { git checkout -b $FeatureBranch | Out-Null }

# Ensure folder
$wfDir = ".github/workflows"
if(-not (Test-Path $wfDir)){ New-Item -ItemType Directory -Path $wfDir -Force | Out-Null }

# -------------------------
# Write gated ai-review.yml
# -------------------------
@'
name: AI Review (Claude)

on:
  pull_request:
    types: [opened, synchronize, reopened, labeled, unlabeled]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    # Run only if PR has label ai:review
    if: ${{ contains(github.event.pull_request.labels.*.name, 'ai:review') && (github.event.pull_request.head.repo.full_name == github.repository) }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout (shallow)
        uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - name: Build diff (PR against base)
        id: diff
        run: |
          set -e
          git fetch origin "${{ github.base_ref }}" --depth=1
          git --no-pager diff --unified=0 origin/"${{ github.base_ref }}"...HEAD > full.diff || true
          head -n 4000 full.diff > pr.diff
          echo "path=pr.diff" >> $GITHUB_OUTPUT
          echo "lines=$(wc -l < pr.diff)" >> $GITHUB_OUTPUT

      - name: Call Claude for code review
        id: claude
        env:
          ANTHROPIC_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
        run: |
          set -e
          cat > prompt.txt <<'PROMPT'
You are an expert code reviewer. Given a unified diff, produce an actionable review for a GitHub Pull Request:

- Summarize the intent of changes.
- List critical risks [SECURITY], then quality issues [BUG]/[PERF], then [STYLE]/[DOCS].
- Suggest minimal diffs to fix issues (small code blocks).
- If diff appears truncated, say so.
PROMPT
          echo "\n```diff" >> prompt.txt
          cat pr.diff >> prompt.txt
          echo "```\n" >> prompt.txt

          body=$(jq -Rs --arg model "claude-3-5-sonnet-latest" '{model:$model, max_tokens:2000, messages:[{role:"user", content:.}]}' prompt.txt)
          curl -sS https://api.anthropic.com/v1/messages \
            -H "x-api-key: ${ANTHROPIC_API_KEY}" \
            -H "anthropic-version: 2023-06-01" \
            -H "content-type: application/json" \
            -d "$body" > claude.json

          jq -r '
            if .content and (.content|length>0) and .content[0].type=="text"
            then .content[0].text
            else "Claude response parsing error:\n" + (tostring)
            end
          ' claude.json > ai_review.md
          head -c 250000 ai_review.md > ai_review_trunc.md

      - name: Post AI review comment
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const text = fs.readFileSync('ai_review_trunc.md','utf8');
            const header = [
              "### 🤖 Claude AI Review",
              "",
              "- Model: `claude-3-5-sonnet-latest`",
              "- Diff lines analyzed: " + (process.env.DIFF_LINES || "n/a"),
              "",
            ].join("\n");
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: header + "\n" + text
            });
        env:
          DIFF_LINES: ${{ steps.diff.outputs.lines }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ai-review-artifacts
          path: |
            pr.diff
            prompt.txt
            claude.json
            ai_review.md
            ai_review_trunc.md
          if-no-files-found: ignore
'@ | Out-File -FilePath "$wfDir/ai-review.yml" -Encoding utf8 -Force

# --------------------------
# Write gated ai-advisor.yml
# --------------------------
@'
name: AI CI-Failure Advisor

on:
  workflow_run:
    workflows:
      - "Validate (lint + typecheck + test)"
      - "Security Scan (deps + secrets)"
      - "ci"
    types: [completed]

permissions:
  contents: read
  pull-requests: write

jobs:
  advise:
    # Run only on PR runs that failed AND the PR has label ai:advisor
    if: >
      ${{
        (github.event.workflow_run.event == 'pull_request') &&
        (github.event.workflow_run.conclusion == 'failure' ||
         github.event.workflow_run.conclusion == 'timed_out' ||
         github.event.workflow_run.conclusion == 'cancelled')
      }}
    runs-on: ubuntu-latest
    steps:
      - name: Extract PR info from workflow_run
        id: pr
        uses: actions/github-script@v7
        with:
          script: |
            const run = context.payload.workflow_run;
            if (!run.pull_requests || run.pull_requests.length === 0) {
              core.setFailed("No associated PR found for this run.");
              return;
            }
            const pr = run.pull_requests[0];
            core.setOutput('number', pr.number.toString());
            core.setOutput('run_id', run.id.toString());
            core.setOutput('head_sha', run.head_sha);

      - name: Check PR label gate
        id: gate
        uses: actions/github-script@v7
        with:
          script: |
            const number = parseInt(core.getInput('number') || '${{ steps.pr.outputs.number }}', 10);
            const { data: labels } = await github.rest.issues.listLabelsOnIssue({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: number
            });
            const has = labels.some(l => l.name === 'ai:advisor');
            core.setOutput('allowed', has ? 'true' : 'false');

      - name: Exit if not labeled
        if: steps.gate.outputs.allowed != 'true'
        run: echo "ai:advisor label missing; skipping."

      - name: Download logs for the failed run
        if: steps.gate.outputs.allowed == 'true'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          set -e
          run_id="${{ steps.pr.outputs.run_id }}"
          curl -L \
            -H "Authorization: Bearer ${GH_TOKEN}" \
            -H "Accept: application/vnd.github+json" \
            "${{ github.api_url }}/repos/${{ github.repository }}/actions/runs/${run_id}/logs" \
            -o logs.zip
          mkdir logs && unzip -q logs.zip -d logs
          find logs -type f -name "*.txt" -exec sh -c 'echo ":: file: $1 ::"; tail -n 400 "$1"' _ {} \; > logs_tail.txt || true
          if [ ! -s logs_tail.txt ]; then echo "No logs extracted." > logs_tail.txt; fi

      - name: Call Claude for triage summary and fixes
        if: steps.gate.outputs.allowed == 'true'
        id: claude
        env:
          ANTHROPIC_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
        run: |
          set -e
          cat > prompt.txt <<'EOF'
You are an expert CI triage assistant. Given CI logs (tail, truncated), produce:
- Summary
- Root Causes
- Suggested Fixes (short patches)
- Next Steps
If secrets are exposed: mark [SECURITY] and advise revoke/rotate.
EOF
          echo -e "\n--- CI LOG TAIL (truncated) ---\n" >> prompt.txt
          head -c 250000 logs_tail.txt >> prompt.txt

          body=$(jq -Rs --arg model "claude-3-5-sonnet-latest" '{model:$model, max_tokens:2000, messages:[{role:"user", content:.}]}' prompt.txt)
          curl -sS https://api.anthropic.com/v1/messages \
            -H "x-api-key: ${ANTHROPIC_API_KEY}" \
            -H "anthropic-version: 2023-06-01" \
            -H "content-type: application/json" \
            -d "$body" > claude.json

          jq -r '
            if .content and (.content|length>0) and .content[0].type=="text"
            then .content[0].text
            else "Claude response parsing error:\n" + (tostring)
            end
          ' claude.json > advice.md

      - name: Post advice as PR comment
        if: steps.gate.outputs.allowed == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const number = parseInt('${{ steps.pr.outputs.number }}', 10);
            const text = fs.readFileSync('advice.md', 'utf8');
            const header = [
              "### 🛠️ CI Failure Advisor",
              "",
              "- Workflow: `" + context.payload.workflow_run.name + "`",
              "- Conclusion: `" + context.payload.workflow_run.conclusion + "`",
              "- Run ID: `" + context.payload.workflow_run.id + "`",
              "",
            ].join("\n");
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: number,
              body: header + "\n" + text
            });

      - name: Upload artifacts
        if: steps.gate.outputs.allowed == 'true'
        uses: actions/upload-artifact@v4
        with:
          name: ai-ci-advisor-artifacts
          path: |
            logs_tail.txt
            prompt.txt
            claude.json
            advice.md
          if-no-files-found: ignore
'@ | Out-File -FilePath "$wfDir/ai-advisor.yml" -Encoding utf8 -Force

# Ensure labels exist
$labels = @(
  @{ name="ai:review";  color="5319E7"; desc="Run Claude PR diff review" },
  @{ name="ai:advisor"; color="FBCA04"; desc="Run Claude CI failure advisor" }
)
foreach ($l in $labels) {
  try {
    $exists = gh label list --repo $FullRepo --limit 200 | Select-String -SimpleMatch $($l.name)
    if (-not $exists) {
      gh label create $($l.name) --repo $FullRepo --color $($l.color) --description $($l.desc) | Out-Null
    }
  } catch { }
}

# Commit, push, PR
git add "$wfDir/ai-review.yml" "$wfDir/ai-advisor.yml" | Out-Null
try { git commit -m "feat(ai): label-gated triggers for AI review & advisor" | Out-Null } catch { Write-Host "No changes to commit." -ForegroundColor Yellow }
git push -u origin $FeatureBranch | Out-Null

$pr = gh pr list --head $FeatureBranch --state open --json number --jq ".[0].number" 2>$null
if ($pr) {
  gh pr edit $pr --base $BaseBranch --title "feat(ai): label-gated AI triggers (review & advisor)" --add-label "ai:generated" --add-label "security:check" | Out-Null
} else {
  gh pr create --base $BaseBranch --title "feat(ai): label-gated AI triggers (review & advisor)" --body "Run Claude only when PR has labels: ai:review / ai:advisor. Saves tokens and noise." --label "ai:generated" --label "security:check" | Out-Null
}

Write-Host "Done. PR opened/updated for label-gated AI triggers." -ForegroundColor Green
