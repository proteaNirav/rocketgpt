<#
RocketGPT — Step 3: AI CI-Failure Advisor (Claude)
- Creates .github/workflows/ai-advisor.yml
- Opens/updates PR: rocketgpt-core/ai-advisor -> develop
Prereqs:
  - gh auth login
  - CLAUDE_API_KEY already set as an Actions secret (we set it in Step 2)
Usage:
  ./init_ai_advisor.ps1
#>

param(
  [string]$BaseBranch = "develop",
  [string]$FeatureBranch = "rocketgpt-core/ai-advisor"
)

$ErrorActionPreference = "Stop"

function Require-Cli($n){ if(-not (Get-Command $n -ErrorAction SilentlyContinue)){ throw "$n is required" } }
Require-Cli git; Require-Cli gh

# Parse OWNER/REPO
$origin = (git remote get-url origin).Trim()
if(-not $origin){ throw "No origin remote found" }
if ($origin -match "github.com[:/](.+?)/(.+?)(\.git)?$"){ $Owner=$Matches[1]; $Repo=$Matches[2] } else { throw "Cannot parse OWNER/REPO from $origin" }
$FullRepo = "$Owner/$Repo"

# Prep branch
git fetch origin $BaseBranch --depth=1 | Out-Null
try { git checkout -B $FeatureBranch origin/$BaseBranch | Out-Null } catch { git checkout -b $FeatureBranch | Out-Null }

# Ensure dir
$wf = ".github/workflows"
if(-not (Test-Path $wf)){ New-Item -ItemType Directory -Path $wf -Force | Out-Null }

# Write workflow
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
    # Only act on PR-triggered runs and when failed/timed out/cancelled
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

      - name: Download logs for the failed run
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
          # Concatenate the last 400 lines of each job log to keep prompt small
          find logs -type f -name "*.txt" -exec sh -c 'echo ":: file: $1 ::"; tail -n 400 "$1"' _ {} \; > logs_tail.txt || true
          # Fallback if nothing found
          if [ ! -s logs_tail.txt ]; then echo "No logs extracted." > logs_tail.txt; fi
          wc -l logs_tail.txt | awk '{print "lines="$1}' >> $GITHUB_OUTPUT

      - name: Call Claude for triage summary and fixes
        id: claude
        env:
          ANTHROPIC_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
        run: |
          set -e
          cat > prompt.txt <<'EOF'
You are an expert CI triage assistant. Given the tail of CI logs from a failed workflow run:

1) Identify the primary failure cause(s) with references to specific tool outputs (eslint, tsc, vitest, npm audit, gitleaks, etc.).
2) Suggest minimal, safe fixes as short code/config diffs. Prefer patches over prose.
3) If secrets are exposed, flag [SECURITY] and suggest remediation steps (revoke, rotate, purge history).
4) If the log tail seems truncated, note likely next steps (rerun with verbose, capture full logs).
5) Keep response concise and actionable.

Return sections:
- Summary
- Root Causes
- Suggested Fixes (with code blocks)
- Next Steps
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

      - name: Upload artifacts (triage data)
        uses: actions/upload-artifact@v4
        with:
          name: ai-ci-advisor-artifacts
          path: |
            logs_tail.txt
            prompt.txt
            claude.json
            advice.md
          if-no-files-found: ignore
'@ | Out-File -FilePath ".github/workflows/ai-advisor.yml" -Encoding utf8 -Force

# Commit/push
git add ".github/workflows/ai-advisor.yml" | Out-Null
try { git commit -m "feat(ai): CI failure advisor (Claude)"; } catch { Write-Host "No changes to commit." -ForegroundColor Yellow }
git push -u origin $FeatureBranch | Out-Null

# Open/update PR
$pr = gh pr list --head $FeatureBranch --state open --json number --jq ".[0].number" 2>$null
if ($pr) {
  gh pr edit $pr --base $BaseBranch --title "feat(ai): CI failure advisor (Claude)" --add-label "ai:generated" --add-label "security:check" | Out-Null
} else {
  gh pr create --base $BaseBranch --title "feat(ai): CI failure advisor (Claude)" --body "When a workflow fails, download logs, get Claude triage + fixes, and post to PR." --label "ai:generated" --label "security:check" | Out-Null
}

Write-Host "Done. Step-3 PR opened/updated for AI CI-Failure Advisor." -ForegroundColor Green
