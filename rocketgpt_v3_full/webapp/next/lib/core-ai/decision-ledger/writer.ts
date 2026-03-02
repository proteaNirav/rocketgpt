import type { DecisionEntry, DecisionOutcome } from './types'
import { writeDecisionEntryJsonl, writeDecisionOutcomeJsonl } from './jsonl-writer'

/**
 * JSONL-only writer for P4-A1.
 * Later we can add a DB writer behind an interface, but local-first remains mandatory.
 */
export async function writeDecisionEntry(entry: DecisionEntry): Promise<void> {
  await writeDecisionEntryJsonl(entry)
}

export async function writeDecisionOutcome(outcome: DecisionOutcome): Promise<void> {
  await writeDecisionOutcomeJsonl(outcome)
}
