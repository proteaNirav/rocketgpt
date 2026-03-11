import type { ProposalStatus } from "../types/proposal-status";

export interface ProposalTransition {
  from: ProposalStatus;
  to: ProposalStatus;
  allowed: boolean;
  reason?: string;
}
