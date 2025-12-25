export type ContractType =
  | 'DECISION'
  | 'EXECUTION'
  | 'SEARCH'
  | 'RISK'
  | 'EFFICIENCY'
  | 'ADVISORY';

export interface DigitalContract {
  contractId: string;
  tenantId: string;
  type: ContractType;

  // Purpose & alignment
  purpose: string;
  orgGoalAlignment: string[];

  // Authority
  canApprove: boolean;
  canExecute: boolean;

  // Governance
  validFrom: string;
  validTo?: string;
}
