param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Args
)

# Preferred CLI entry point. Delegates to the legacy CLI implementation during migration.
& "$PSScriptRoot\rgpt.ps1" @Args
