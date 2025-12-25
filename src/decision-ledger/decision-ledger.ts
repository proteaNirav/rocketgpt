import { ExecutionContext } from '../types/execution-context';

export interface DecisionRecord {
  executionId: string;
  allowed: boolean;
  reason?: string;
  recordedAt: string;
}

/**
 * Decision Ledger – V1 (Stub)
 * Will later persist to DB / storage.
 */
export function recordDecision(
  context: ExecutionContext,
  decision: DecisionRecord
): void {
  // V1: no-op
}
