param(
  [string]$Root = "."
)


function Resolve-RgptRootPath([string]$Root) {
  return (Resolve-Path -LiteralPath $Root -ErrorAction Stop | Select-Object -ExpandProperty Path)
}
$ErrorActionPreference="Stop"
Set-StrictMode -Version Latest

function Fail([string]$msg) {
  Write-Host $msg -ForegroundColor Red
  exit 1
}

# Files to scan
$files = Get-ChildItem -Path $Root -Recurse -File -Include *.ts,*.tsx |
  Where-Object {
    $_.FullName -notmatch "\\node_modules\\" -and
    $_.FullName -notmatch "\\.next\\" -and
    $_.FullName -notmatch "\\dist\\" -and
    $_.FullName -notmatch "\\build\\" -and
    $_.FullName -notmatch "\\coverage\\" -and
    $_.FullName -notmatch "\\out\\" -and
    $_.FullName -notmatch "\\.git\\"
  }

# Allowlist path where prompt construction is permitted
$pfAllow = [regex]::Escape((Join-Path (Resolve-RgptRootPath $Root) "src\rgpt\prompt-formulator"))

# Heuristics: outbound/provider patterns
$outboundPatterns = @(
  "openai",
  "anthropic",
  "claude",
  "chat\.completions",
  "responses\.create",
  "messages\.create",
  "api\.openai\.com",
  "api\.anthropic\.com",
  "x-api-key",
  "Authorization:\s*Bearer",
  "fetch\(",
  "axios\.",
  "provider",
  "adapter"
)

# Heuristics: prompt construction patterns
$promptPatterns = @(
  "\bsystem\s*:\s*`"",
  "\bprompt\s*=\s*`"",
  "\bprompt\s*:\s*`"",
  "\bmessages\s*:\s*\[",
  "\brole\s*:\s*`"(system|developer|user)`"",
  "\bcontent\s*:\s*`""
)

# Required guard reference when outbound/provider patterns are present
$guardNeedle = "assertPromptFromFormulator"

$violations = New-Object System.Collections.Generic.List[string]

foreach ($f in $files) {
  if ($f.FullName -match "\\\.ops\\\") { continue }
  $text = Get-Content -Path $f.FullName -Raw -ErrorAction Stop

  $isInPF = ($f.FullName -match "^$pfAllow")

  $hasOutbound = $false
  foreach ($p in $outboundPatterns) {
    if ($text -match $p) { $hasOutbound = $true; break }
  }

  $hasPromptBuild = $false
  foreach ($p in $promptPatterns) {
    if ($text -match $p) { $hasPromptBuild = $true; break }
  }

  # Rule A: If outbound/provider signals exist, require guard usage
  if ($hasOutbound -and ($text -notmatch $guardNeedle)) {
    $violations.Add("Missing guard in outbound/provider file: $($f.FullName)")
  }

  # Rule B: prompt construction signals outside PF are forbidden
  if ($hasPromptBuild -and (-not $isInPF)) {
    $violations.Add("Prompt construction detected outside Prompt Formulator: $($f.FullName)")
  }
}

if ($violations.Count -gt 0) {
  Write-Host "Prompt bypass scan FAILED:" -ForegroundColor Red
  $violations | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  exit 1
}

Write-Host "Prompt bypass scan PASSED." -ForegroundColor Green





