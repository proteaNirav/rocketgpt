import type { ConstitutionalProposal } from "../types/constitutional-proposal";
import { ConstitutionalLifecycleLedger } from "../core/constitutional-lifecycle-ledger";
import type { ProposalDraft } from "./proposal-draft";

export class ConstitutionalProposalService {
  constructor(private readonly lifecycleLedger = new ConstitutionalLifecycleLedger()) {}

  createDraft(draft: ProposalDraft): ConstitutionalProposal {
    return {
      proposalId: "TODO-proposal-id",
      title: draft.title,
      summary: draft.summary,
      status: "draft",
      targetLayer: draft.targetLayer,
      proposedBy: "TODO-proposer",
      evidenceRefs: draft.evidenceRefs,
    };
  }

  submitProposal(proposal: ConstitutionalProposal, actorRole = "proposer"): ConstitutionalProposal {
    const submitted: ConstitutionalProposal = {
      ...proposal,
      status: "review",
    };
    this.lifecycleLedger.emit({
      stage: "proposal_submitted",
      constitutionVersion: "pending",
      proposalId: submitted.proposalId,
      actorRole,
    });
    return submitted;
  }

  approveProposal(
    proposal: ConstitutionalProposal,
    constitutionVersion: string,
    actorRole = "approver"
  ): ConstitutionalProposal {
    const approved: ConstitutionalProposal = {
      ...proposal,
      status: "approved",
    };
    this.lifecycleLedger.emit({
      stage: "proposal_approved",
      constitutionVersion,
      proposalId: approved.proposalId,
      actorRole,
    });
    return approved;
  }
}
