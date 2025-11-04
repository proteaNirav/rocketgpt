<#
RocketGPT — Step 2: AI Diff Review (Claude)
This script:
  - stores CLAUDE_API_KEY in repo secrets
  - upgrades .github/workflows/ai-review.yml to do real diff review
Usage:
  ./init_ai_review.ps1 -ClaudeKey 'sk-ant-xxxxxxxx' [-BaseBranch develop]
#>

param(
  [Parameter(Mandatory=$true)][string]$ClaudeKey,
  [string]$BaseBranch = "develop",
  [string]$FeatureBranch = "rocketgpt-core/ai-review"
)

$ErrorActionPreference = "Stop"
function Require-Cli($n){ if(-not (Get-Command $n -ErrorAction SilentlyContinue)){throw "$n is required"} }
Require-Cli git; Require-Cli gh

# Parse OWNER/REPO
$origin = (git remote get-url origin).Trim()
if(-not $origin){ throw "No origin remote found" }
if ($origin -match "github.com[:/](.+?)/(.+?)(\.git)?$"){ $Owner=$Matches[1]; $Repo=$Matches[2] } else { throw "Cannot parse OWNER/REPO from $origin" }
$FullRepo = "$Owner/$Repo"

# Save secret
Write-Host "Setting GitHub secret CLAUDE_API_KEY for $FullRepo..."
$env:GH_TOKEN | Out-Null
$ClaudeKey | gh secret set CLAUDE_API_KEY --repo $FullRepo --app actions

# Prepare branch
git fetch origin $BaseBranch --depth=1 | Out-Null
try { git checkout -B $FeatureBranch origin/$BaseBranch | Out-Null } catch { git checkout -b $FeatureBranch | Out-Null }

# Ensure folder
$wf = ".github/workflows"
if(-not (Test-Path $wf)){ New-Item -ItemType Directory -Path $wf -Force | Out-Null }

# Write upgraded workflow
@'
name: AI Review (Claude)

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    if: ${{ github.event.pull_request.head.repo.full_name == github.repository }}
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
          # Unified=0 → tighter hunks. Limit size to keep API cost 0/low.
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
          echo "Preparing prompt..."
          cat > prompt.txt <<'PROMPT'
You are an expert code reviewer. Given a unified diff, produce an actionable review for a GitHub Pull Request:

- Summarize the intent of changes.
- List *critical* risks (security, secrets, auth/RLS, injections), then quality issues (types, null/edge cases), then style.
- Suggest minimal diffs to fix issues (use small code blocks).
- Mark items with tags: [SECURITY], [BUG], [PERF], [STYLE], [DOCS].
- Keep it under ~4000 tokens. If the diff looks truncated, say so.

Now review the following diff:
PROMPT
          echo "\n```diff" >> prompt.txt
          cat pr.diff >> prompt.txt
          echo "```\n" >> prompt.txt

          echo "Calling Anthropic..."
          # Claude Messages API
          body=$(jq -Rs --arg model "claude-3-5-sonnet-latest" '{model:$model, max_tokens:2000, messages:[{role:"user", content:.}]}' prompt.txt)
          curl -sS https://api.anthropic.com/v1/messages \
            -H "x-api-key: ${ANTHROPIC_API_KEY}" \
            -H "anthropic-version: 2023-06-01" \
            -H "content-type: application/json" \
            -d "$body" > claude.json

          # Extract plain text from response
          jq -r '
            if .content and (.content|length>0) and .content[0].type=="text"
            then .content[0].text
            else "Claude response parsing error:\n" + (tostring)
            end
          ' claude.json > ai_review.md

          # Truncate overly long output to keep the comment readable
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

      - name: Upload artifacts (raw AI response)
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
'@ | Out-File -FilePath ".github/workflows/ai-review.yml" -Encoding utf8 -Force

# Commit & push
git add ".github/workflows/ai-review.yml" | Out-Null
try { git commit -m "feat(ai): enable Claude diff review (read-only)"; } catch { Write-Host "No changes to commit." -ForegroundColor Yellow }
git push -u origin $FeatureBranch | Out-Null

# Open/update PR
$pr = gh pr list --head $FeatureBranch --state open --json number --jq ".[0].number" 2>$null
if ($pr) {
  gh pr edit $pr --base $BaseBranch --title "feat(ai): enable Claude diff review (read-only)" --add-label "ai:generated" --add-label "security:check" | Out-Null
} else {
  gh pr create --base $BaseBranch --title "feat(ai): enable Claude diff review (read-only)" --body "Adds Claude 3.5 diff review to PRs: posts summarized findings as a single comment (no write access)." --label "ai:generated" --label "security:check" | Out-Null
}

Write-Host "Done. Step-2 PR opened/updated for AI diff review." -ForegroundColor Green
