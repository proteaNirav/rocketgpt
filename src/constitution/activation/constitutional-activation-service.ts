import type { ActivationRecord } from "../types/activation-record";
import { ConstitutionalLifecycleLedger } from "../core/constitutional-lifecycle-ledger";
import type { ConstitutionalProposal } from "../types/constitutional-proposal";

export class ConstitutionalActivationService {
  constructor(private readonly lifecycleLedger = new ConstitutionalLifecycleLedger()) {}

  activate(proposal: ConstitutionalProposal): ActivationRecord {
    const record: ActivationRecord = {
      activationId: "TODO-activation-id",
      proposalId: proposal.proposalId,
      activatedVersionId: "TODO-version-id",
      activatedAt: new Date(0).toISOString(),
      rollbackReady: true,
    };
    this.lifecycleLedger.emit({
      stage: "activation_completed",
      constitutionVersion: record.activatedVersionId,
      proposalId: proposal.proposalId,
      actorRole: "approver",
    });
    return record;
  }
}
