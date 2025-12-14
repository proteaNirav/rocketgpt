import { DigitalContract } from './digital-contract';

export interface DecisionContract extends DigitalContract {
  // Token governance (V1 placeholder)
  tokenBudget?: {
    maxTokensPerRun: number;
    maxTokensPerDay?: number;
    warningThresholdPct?: number;
  };
  type: 'DECISION';

  // Decision authority
  approvalThreshold: 'SINGLE' | 'MAJORITY' | 'UNANIMOUS';

  // Escalation behaviour
  escalationAllowed: boolean;
}

