# .github/tools/rgpt-verify.ps1
# One-shot RocketGPT health check
# Runs local + repo sanity, branch protection, and build validation

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Section([string]$t){Write-Host "`n=== $t ===" -ForegroundColor Cyan}
function TryStep([scriptblock]$b){try{& $b}catch{Write-Host "!! $_" -ForegroundColor Red;throw}}

$root=(Get-Location).Path
Section "Environment"
TryStep { $PSVersionTable.PSVersion }
TryStep { git --version }
TryStep { node --version }
TryStep { npm --version }
TryStep { gh --version }

Section "Repo sanity"
TryStep { git status --porcelain }
TryStep { git remote -v }

Section "Workflows present"
TryStep { Get-ChildItem -Path "$root\.github\workflows" -Filter *.yml | Select-Object -ExpandProperty Name }

Section "Labels required"
$need=@('safe:auto-merge','safe:workflow-edit')
$have=(gh label list --json name -q '.[].name' 2>$null)
foreach($l in $need){
  if(-not ($have -contains $l)){Write-Host "Missing label: $l" -ForegroundColor Yellow}
  else{Write-Host "OK label: $l" -ForegroundColor Green}
}

Section "Branch protection snapshot"
$pw7=Join-Path $env:ProgramFiles 'PowerShell\7\pwsh.exe'
$prot=Join-Path $root '.github\tools\toggle-protection.ps1'
if(Test-Path $prot){
  if(-not $env:GITHUB_TOKEN){$env:GITHUB_TOKEN=(gh auth token)}
  & $pw7 -File $prot show
}else{
  Write-Host "toggle-protection.ps1 not found — skipping" -ForegroundColor Yellow
}

Section "Node project checks"
TryStep { npm ci }
TryStep { npm run lint }
TryStep { npm run typecheck }
TryStep { npm test -- --ci }

Section "Build"
TryStep { npm run build }

Section "Summary"
Write-Host "`nAll checks completed successfully." -ForegroundColor Green