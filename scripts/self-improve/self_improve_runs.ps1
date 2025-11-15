param(
    [int]$Limit = 10
)

$repo = "proteaNirav/rocketgpt"

Write-Host "`n=== Self-Improve · Recent Runs (table) ===`n"

$runs = gh run list --repo $repo `
    --workflow "self_improve.yml" `
    --limit $Limit `
    --json databaseId,displayTitle,conclusion,status,updatedAt,headBranch,event |
    ConvertFrom-Json

if (-not $runs) {
    Write-Host "No runs found." -ForegroundColor Yellow
    exit
}

if ($runs -isnot [array]) {
    $runs = @($runs)
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
