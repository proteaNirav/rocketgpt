export interface ActivationRecord {
  activationId: string;
  proposalId: string;
  activatedVersionId: string;
  previousVersionId?: string;
  activatedAt: string;
  rollbackReady: boolean;
}
