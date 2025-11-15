param(
    [int]$Limit = 5
)

$repo = "proteaNirav/rocketgpt"

Write-Host "`n=== Self-Improve · Recent runs ===`n"

# Get JSON from GitHub CLI
$json = gh run list --repo $repo `
  --workflow "self_improve.yml" `
  --limit $Limit `
  --json databaseId,displayTitle,conclusion,status,updatedAt,headBranch,event

if (-not $json) {
    Write-Host "No runs found."
    return
}

$data = $json | ConvertFrom-Json

# Handle two possible shapes:
# 1) Array of run objects
# 2) Single object with each property as an array (column-wise)
if ($data -is [array]) {
    $runs = $data
}
else {
    if ($data.databaseId -and $data.displayTitle) {
        $runs = for ($i = 0; $i -lt $data.databaseId.Count; $i++) {
            [pscustomobject]@{
                databaseId   = $data.databaseId[$i]
                displayTitle = $data.displayTitle[$i]
                conclusion   = $data.conclusion[$i]
                status       = $data.status[$i]
                updatedAt    = $data.updatedAt[$i]
                headBranch   = $data.headBranch[$i]
                event        = $data.event[$i]
            }
        }
    }
    else {
        $runs = @($data)
    }
}

$runs |
    Sort-Object updatedAt -Descending |
    Select-Object `
        @{Name="ID";Expression={$_.databaseId}}, `
        @{Name="Title";Expression={$_.displayTitle}}, `
        @{Name="Status";Expression={$_.status}}, `
        @{Name="Result";Expression={$_.conclusion}}, `
        @{Name="Branch";Expression={$_.headBranch}}, `
        @{Name="Event";Expression={$_.event}}, `
        @{Name="Updated";Expression={$_.updatedAt}} |
    Format-Table -AutoSize
