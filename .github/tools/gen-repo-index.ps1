param(
  [string]$RepoRoot = (Resolve-Path '.').Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$nl = [Environment]::NewLine

function Ensure-Dir([string]$p) {
  if (-not (Test-Path $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null }
}

function Write-File([string]$name, [string]$content) {
  $outDir = Join-Path $RepoRoot 'docs/_repo_index'
  Ensure-Dir $outDir
  $path = Join-Path $outDir $name
  Set-Content -Path $path -Encoding UTF8 -Value $content
}

function Rel([string]$fullPath) {
  return $fullPath.Replace($RepoRoot + '\', '')
}

$now = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss K')

$branch = '(unknown)'
$head   = '(unknown)'
try { $branch = (git rev-parse --abbrev-ref HEAD 2>$null).Trim() } catch {}
try { $head   = (git rev-parse HEAD 2>$null).Trim() } catch {}

# -----------------------------
# WORKFLOWS.md
# -----------------------------
$wfDir = Join-Path $RepoRoot '.github/workflows'
$wfLines = New-Object System.Collections.Generic.List[string]
$null = $wfLines.Add('# Workflows')
$null = $wfLines.Add('')
$null = $wfLines.Add('Generated: ' + $now)
$null = $wfLines.Add('Branch: ' + $branch)
$null = $wfLines.Add('HEAD: ' + $head)
$null = $wfLines.Add('')

if (Test-Path $wfDir) {
  $wfFiles = Get-ChildItem $wfDir -Recurse -File -Include *.yml,*.yaml | Sort-Object FullName
  foreach ($f in $wfFiles) {
    $rel = Rel $f.FullName
    $raw = Get-Content $f.FullName -Raw

    $name = ([regex]::Match($raw, '(?m)^\s*name:\s*(.+)\s*$')).Groups[1].Value.Trim()
    if (-not $name) { $name = '(no name: uses filename)' }

    $onBlock = [regex]::Match($raw, '(?ms)^\s*on:\s*.*?(?=^\S|\Z)').Value.Trim()
    if (-not $onBlock) { $onBlock = 'on: (not detected)' }

    $null = $wfLines.Add('## ' + $name)
    $null = $wfLines.Add('- File: ' + $rel)
    $null = $wfLines.Add('')
    $null = $wfLines.Add('~~~yaml')
    $null = $wfLines.Add($onBlock)
    $null = $wfLines.Add('~~~')
    $null = $wfLines.Add('')
  }
} else {
  $null = $wfLines.Add('(No .github/workflows folder found.)')
}

Write-File 'WORKFLOWS.md' ($wfLines -join $nl)

# -----------------------------
# NEXT.routes.md
# -----------------------------
$nextRoot = Join-Path $RepoRoot 'rocketgpt_v3_full/webapp/next'
$routes = @()
if (Test-Path $nextRoot) {
  $appDir = Join-Path $nextRoot 'app'
  if (Test-Path $appDir) {
    $routes = Get-ChildItem $appDir -Recurse -File -Include route.ts,route.js,page.tsx,page.jsx |
      ForEach-Object { Rel $_.FullName } |
      Sort-Object
  }
}

$rtLines = New-Object System.Collections.Generic.List[string]
$null = $rtLines.Add('# Next.js Routes + Pages')
$null = $rtLines.Add('')
$null = $rtLines.Add('Generated: ' + $now)
$null = $rtLines.Add('')
foreach ($r in $routes) { $null = $rtLines.Add('- ' + $r) }

Write-File 'NEXT.routes.md' ($rtLines -join $nl)

# -----------------------------
# INDEX.md
# -----------------------------
$idx = New-Object System.Collections.Generic.List[string]
$null = $idx.Add('# Mishti AI Repo Index')
$null = $idx.Add('')
$null = $idx.Add('Generated: ' + $now)
$null = $idx.Add('Branch: ' + $branch)
$null = $idx.Add('HEAD: ' + $head)
$null = $idx.Add('')
$null = $idx.Add('## Contents')
$null = $idx.Add('- WORKFLOWS: docs/_repo_index/WORKFLOWS.md')
$null = $idx.Add('- NEXT routes/pages: docs/_repo_index/NEXT.routes.md')
$null = $idx.Add('')

Write-File 'INDEX.md' ($idx -join $nl)

Write-Host '[OK] Repo index generated under docs/_repo_index' -ForegroundColor Green

