$ErrorActionPreference = "Stop"

$env:PYTHONPATH = (Resolve-Path "apps/core-api").Path
$contractPath = "apps/core-api/replay/replay_contract.json"

python -m replay --contract $contractPath
$exitCode = $LASTEXITCODE

$evidenceDir = $null
$evidenceRoot = Resolve-Path "apps/core-api/replay/evidence"
if (Test-Path $evidenceRoot) {
    $latestResult = Get-ChildItem -Path $evidenceRoot -Recurse -Filter "replay_result.json" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if ($latestResult) {
        try {
            $resultJson = Get-Content $latestResult.FullName -Raw | ConvertFrom-Json
            if ($resultJson.evidence_dir) {
                $evidenceDir = $resultJson.evidence_dir
            }
        } catch {
        }
    }
}

Write-Host ("ExitCode: {0}" -f $exitCode)
if ($evidenceDir) {
    Write-Host ("EvidenceDir: {0}" -f $evidenceDir)
} else {
    Write-Host "EvidenceDir: (not found)"
}

exit $exitCode
