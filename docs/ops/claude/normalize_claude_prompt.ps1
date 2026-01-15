$ErrorActionPreference="Stop"
Set-Location "D:\Projects\RocketGPT\rocketgpt\rocketgpt_v3_full\webapp\next"

$promptFile = "docs\ops\claude\CLAUDE_REVIEW_runtime-mode_route.md"
if (!(Test-Path $promptFile)) { throw ("Missing: " + $promptFile) }

$raw = Get-Content $promptFile -Raw

# ASCII-safe replacements using regex hex escapes:
# "â€”"  => bytes: E2 80 94
# "âœ…" => bytes: E2 9C 85
# "âŒ"  => bytes: E2 8C (seen as start of the cross sequence in your file)
$raw = [regex]::Replace($raw, "\xE2\x80\x94", "-")
$raw = [regex]::Replace($raw, "\xE2\x9C\x85", "[OK]")
$raw = [regex]::Replace($raw, "\xE2\x8C[\x80-\xBF]?", "[NO]")

# Replace any remaining non-ASCII chars with '?'
$sb = New-Object System.Text.StringBuilder
foreach ($ch in $raw.ToCharArray()) {
  if ([int][char]$ch -le 127) { [void]$sb.Append($ch) } else { [void]$sb.Append('?') }
}
$raw2 = $sb.ToString()

# Write UTF-8 no BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$outPath = Join-Path (Get-Location).Path $promptFile
[System.IO.File]::WriteAllText($outPath, $raw2, $utf8NoBom)

Write-Host ("Normalized: " + $outPath) -ForegroundColor Green
Write-Host ("Bytes: " + (Get-Item $outPath).Length) -ForegroundColor Yellow
Write-Host "Preview (first 12 lines):" -ForegroundColor Yellow
Get-Content $outPath | Select-Object -First 12
