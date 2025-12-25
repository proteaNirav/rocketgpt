[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$PlanJsonPath
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $PlanJsonPath)) {
  throw "ExecutionPlan.json not found: $PlanJsonPath"
}

# Load JSON (PS 5.1 compatible: ConvertFrom-Json has no -Depth)
$rawText = Get-Content $PlanJsonPath -Raw -Encoding UTF8
$planObj = $rawText | ConvertFrom-Json

# Remove hash before canonicalization (if present)
if ($planObj.PSObject.Properties.Name -contains "hash") {
  $planObj.PSObject.Properties.Remove("hash")
}

function ConvertTo-Plain {
  param([object]$obj)

  if ($null -eq $obj) { return $null }

  # Convert PSCustomObject to Hashtable
  if ($obj -is [pscustomobject]) {
    $ht = @{}
    foreach ($p in $obj.PSObject.Properties) {
      $ht[$p.Name] = ConvertTo-Plain $p.Value
    }
    return $ht
  }

  # Convert arrays/enumerables (but not strings)
  if ($obj -is [System.Collections.IEnumerable] -and -not ($obj -is [string])) {
    $arr = @()
    foreach ($item in $obj) { $arr += ,(ConvertTo-Plain $item) }
    return $arr
  }

  return $obj
}

function Sort-Recursive {
  param([object]$obj)

  if ($obj -is [hashtable] -or $obj -is [System.Collections.IDictionary]) {
    $sorted = [ordered]@{}
    foreach ($k in ($obj.Keys | Sort-Object)) {
      $sorted[$k] = Sort-Recursive $obj[$k]
    }
    return $sorted
  }

  if ($obj -is [System.Collections.IEnumerable] -and -not ($obj -is [string])) {
    return @($obj | ForEach-Object { Sort-Recursive $_ })
  }

  return $obj
}

$plain = ConvertTo-Plain $planObj
$canonical = Sort-Recursive $plain

# Canonical JSON for hashing: compressed + stable ordering
$canonicalJson = $canonical | ConvertTo-Json -Depth 50 -Compress

# Compute SHA-256
$sha = [System.Security.Cryptography.SHA256]::Create()
$bytes = [System.Text.Encoding]::UTF8.GetBytes($canonicalJson)
$hashBytes = $sha.ComputeHash($bytes)
$hashHex = ($hashBytes | ForEach-Object { $_.ToString("x2") }) -join ""
$hash = "sha256:$hashHex"

# Re-load original as object again, then set hash and write pretty JSON
$planFinal = ($rawText | ConvertFrom-Json)
if ($planFinal.PSObject.Properties.Name -contains "hash") {
  $planFinal.hash = $hash
} else {
  $planFinal | Add-Member -MemberType NoteProperty -Name "hash" -Value $hash
}

$planFinal | ConvertTo-Json -Depth 50 | Out-File -FilePath $PlanJsonPath -Encoding UTF8 -Force

Write-Host "[OK] Plan hash updated:" -ForegroundColor Green
Write-Host " - Plan: $PlanJsonPath" -ForegroundColor Green
Write-Host " - Hash: $hash" -ForegroundColor Green
