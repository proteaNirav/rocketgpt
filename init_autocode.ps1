$ErrorActionPreference = "Stop"
function Require-Cli($n){ if(-not (Get-Command $n -ErrorAction SilentlyContinue)){ throw "$n is required" } }
Require-Cli git; Require-Cli gh

$origin=(git remote get-url origin).Trim()
if ($origin -match "github.com[:/](.+?)/(.+?)(\.git)?$"){ $owner=$Matches[1]; $repo=$Matches[2] } else { throw "No origin" }
$base="develop"; $feat="rocketgpt-core/auto-codegen"

git fetch origin $base --depth=1 | Out-Null
try { git checkout -B $feat origin/$base | Out-Null } catch { git checkout -b $feat | Out-Null }

# Write workflow
$wf = @'
(PLACE THE CONTENTS OF auto-codegen.yml FROM ABOVE HERE)
'@
$wf | Out-File -FilePath ".github/workflows/auto-codegen.yml" -Encoding utf8 -Force

# Issue template
$tpl = @'
(PLACE THE CONTENTS OF autocodegen.md FROM ABOVE HERE)
'@
$tpl | Out-File -FilePath ".github/ISSUE_TEMPLATE/autocodegen.md" -Encoding utf8 -Force

git add .github | Out-Null
git commit -m "feat(codegen): issue->PR auto codegen workflow + template" | Out-Null
git push -u origin $feat | Out-Null

$pr = gh pr create --base $base --title "feat(codegen): enable issue->PR auto codegen" --body "Adds auto-codegen workflow and issue template. Label `codegen:ready` triggers Claude to produce a git diff and PR." --label ai:generated,security:check
Write-Host "Opened PR: $pr"
