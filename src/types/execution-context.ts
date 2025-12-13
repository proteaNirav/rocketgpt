export interface ExecutionContext {
  executionId: string;
  tenantId: string;
  contractId?: string; // Digital Contract / CAT reference
  requestedBy: string;
  requestedAt: string; // ISO timestamp
  purpose: string;
}
