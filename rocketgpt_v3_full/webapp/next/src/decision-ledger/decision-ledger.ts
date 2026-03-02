import { ExecutionContext } from '@/src/types/execution-context'

export interface DecisionRecord {
  executionId: string
  allowed: boolean
  reason?: string
  recordedAt: string
}

/**
 * Decision Ledger – V1 (Console visibility only)
 * This will later be replaced by persistent storage.
 */
export function recordDecision(context: ExecutionContext, decision: DecisionRecord): void {
  console.log('[DECISION-LEDGER]', {
    executionId: decision.executionId,
    tenantId: context.tenantId,
    contractId: context.contractId,
    decisionContractId: context.decisionContract?.contractId,
    tokenBudget: context.decisionContract?.tokenBudget,
    catContext: context.catContext,
    allowed: decision.allowed,
    reason: decision.reason,
    recordedAt: decision.recordedAt,
    purpose: context.purpose,
  })
}
