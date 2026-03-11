import type { ProposalStatus } from "./proposal-status";

export interface ConstitutionalProposal {
  proposalId: string;
  title: string;
  summary: string;
  status: ProposalStatus;
  targetLayer: "core_principle" | "legislative_policy" | "runtime_binding" | "os_policy_envelope";
  proposedBy: string;
  evidenceRefs: string[];
}
