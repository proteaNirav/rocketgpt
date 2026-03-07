export type DemoDenyReason = 'expired'

export function buildReplayCommand(catId: string, denyReason?: DemoDenyReason): string {
  const denyPart = denyReason ? ` --deny ${denyReason}` : ''
  return [
    '$repo = (Resolve-Path .).Path',
    "Set-Location -LiteralPath (Join-Path $repo 'apps\\core-api')",
    `python .\\cats_demo_replay.py ${catId}${denyPart}`,
  ].join('; ')
}

export function buildEvidenceLocateCommand(catId: string): string {
  return [
    '$repo = (Resolve-Path .).Path',
    "Set-Location -LiteralPath (Join-Path $repo 'apps\\core-api')",
    `Get-ChildItem .\\replay\\evidence\\${catId} -Recurse -Filter cats_demo_artifact.json`,
    '| Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName',
  ].join(' ')
}

export function buildWorkflowReplayCommands(catIds: string[]): string[] {
  return catIds.map((catId) => buildReplayCommand(catId))
}
