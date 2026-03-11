param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]] $CliArgs
)
npm --prefix tools/mt-first-life run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
node tools/mt-first-life/dist/tools/mt-first-life/src/cli.js @CliArgs
