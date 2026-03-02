import { DecisionContract } from '@/src/contracts/decision-contract'

export interface ExecutionContext {
  // CAT (Contract Access Token) compatibility (V1 placeholder)
  catContext?: {
    catId: string
    issuedToDevice?: string
    issuedAt?: string
    expiresAt?: string
  }
  executionId: string
  tenantId: string

  // Decision authority (REFERENCE ONLY for now)
  decisionContract?: DecisionContract

  // Contract / CAT binding
  contractId?: string

  // Request metadata
  requestedBy: string
  requestedAt: string // ISO timestamp
  purpose: string
}
