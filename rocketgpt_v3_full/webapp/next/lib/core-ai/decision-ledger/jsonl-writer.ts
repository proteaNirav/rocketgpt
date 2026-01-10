import fs from 'fs/promises'
import path from 'path'
import { ensureRunDirs, getRunLogsDir } from '../run-folders'
import type { DecisionEntry, DecisionOutcome } from './types'

function safeJson(obj: unknown): string {
  // Never allow undefined/NaN to break JSONL; coerce safely.
  return JSON.stringify(obj, (_k, v) => {
    if (typeof v === 'number' && Number.isNaN(v)) return null
    if (typeof v === 'undefined') return null
    return v
  })
}

export function getLedgerJsonlPath(runId: string): string {
  return path.join(getRunLogsDir(runId), 'ledger.jsonl')
}

async function appendLine(filePath: string, line: string): Promise<void> {
  await fs.appendFile(filePath, line + '\n', { encoding: 'utf8' })
}

export async function writeDecisionEntryJsonl(entry: DecisionEntry): Promise<void> {
  if (!entry?.run_id) throw new Error('DecisionEntry missing run_id')
  await ensureRunDirs(entry.run_id)
  const p = getLedgerJsonlPath(entry.run_id)
  await appendLine(p, safeJson({ kind: 'decision_entry', ...entry }))
}

export async function writeDecisionOutcomeJsonl(outcome: DecisionOutcome): Promise<void> {
  if (!outcome?.run_id) throw new Error('DecisionOutcome missing run_id')
  await ensureRunDirs(outcome.run_id)
  const p = getLedgerJsonlPath(outcome.run_id)
  await appendLine(p, safeJson({ kind: 'decision_outcome', ...outcome }))
}
