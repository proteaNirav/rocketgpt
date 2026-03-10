param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Args
)

# Preferred health entry point. Keeps the legacy health implementation unchanged during migration.
& "$PSScriptRoot\rgpt_health.ps1" @Args
